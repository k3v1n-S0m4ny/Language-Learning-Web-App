"use server";

import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  cards,
  hskUnlocks,
  learnerSettings,
  reviewLogs,
  reviewStates,
} from "@/lib/db/schema";
import { isCorrectChoice } from "@/lib/ladder/distractors";
import { dueFromRung } from "@/lib/ladder/intervals";
import {
  INITIAL_STATE,
  applyAnswer,
  formatForStep,
  topStep,
  type LadderState,
} from "@/lib/ladder/ladder";
import { isCardEligible } from "./hsk-gate";
import { ensureLearnerSettings, expectedAnswerFor, getHskGate, isMultipleChoice } from "./queries";
import { thaiDateKey } from "./time";

// Every Mandarin Card climbs the same ladder — there is no is_phrase branching.
const MANDARIN = "mandarin" as const;
const TOP_STEP = topStep(MANDARIN);

/**
 * Everything the two submit actions share: authorise, load the Card and its
 * ladder state, apply the HSK gate to an introduction, and refuse to grade a
 * stale question.
 *
 * A Server Action is a public POST endpoint, so none of these checks may be left
 * to the page that rendered the Card.
 *
 * THE CLIENT'S `step` IS NOT TRUSTED AS THE STEP TO GRADE AT. It is compared
 * against the stored one and the request is rejected on a mismatch. Without that,
 * a replayed submission would be applied at whatever step the Card has since
 * climbed to — promoting a Card on the strength of an answer given to an easier
 * question.
 */
async function loadForAnswer(cardId: string, step: number) {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");

  // Typed as number, but the type is erased at the network boundary — a direct
  // POST can send anything.
  if (!Number.isInteger(step) || step < 1) throw new Error("Invalid step");

  const [[card], [existing]] = await Promise.all([
    db
      .select({
        id: cards.id,
        headword: cards.headword,
        wholeGloss: cards.wholeGloss,
        hskLevel: cards.hskLevel,
      })
      .from(cards)
      .where(eq(cards.id, cardId)),
    // Re-read the state so the answer applies to the freshest row (the study
    // screen already read it to choose the format; this avoids a lost update and
    // is deliberate, not a redundant query).
    db
      .select()
      .from(reviewStates)
      .where(
        and(eq(reviewStates.learnerId, learnerId), eq(reviewStates.cardId, cardId)),
      ),
  ]);

  if (!card) throw new Error("Card not found");

  // No review_states row means this answer would INTRODUCE the Card, so the HSK
  // gate applies — exactly as the Thai course re-derives its unit gate in
  // lib/thai/actions.ts. Already-introduced Cards skip this entirely: they were
  // admitted while their band was open, and a locked band must never strand a
  // Card the Learner is mid-way through.
  if (!existing) {
    const gate = await getHskGate(learnerId);
    if (!isCardEligible(card.hskLevel, gate.unlockedBand)) {
      throw new Error("HSK band locked");
    }
  }

  const current: LadderState = existing
    ? {
        step: existing.step,
        passStreak: existing.passStreak,
        intervalRung: existing.intervalRung,
        demotions: existing.demotions,
      }
    : INITIAL_STATE;

  if (current.step !== step) throw new Error("Stale answer");

  return { learnerId, card, current };
}

/**
 * Record the bands this Learner has now earned.
 *
 * THE UNLOCK IS A STORED FACT AND IS NEVER RECOMPUTED. At a 100% bar a live
 * computation would re-lock a cleared band the moment one Card was seeded into
 * it, halting study every time the deck grows — see hsk-gate.ts. This is the
 * write side of that, and it lives in a Server Action rather than in the read
 * path on purpose: a render must not have side effects.
 *
 * Called only when a Card has just reached the top step, which is the only event
 * that can raise a band's mastered count. onConflictDoNothing makes it idempotent
 * against the unique (learner_id, band) index, so a double submit is harmless.
 */
async function syncHskUnlocks(learnerId: string) {
  const gate = await getHskGate(learnerId);
  if (gate.bandsToPersist.length === 0) return;

  await db
    .insert(hskUnlocks)
    .values(gate.bandsToPersist.map((band) => ({ learnerId, band })))
    .onConflictDoNothing();
}

/**
 * Apply one graded answer: move the Card along its ladder, schedule it, log it.
 *
 * The two writes to `due` are the round mechanism, and they are the only place it
 * exists. A Card that has NOT finished is written `due = now`, so it stays inside
 * the `due <= now` batch and keeps cycling today; a Card that passed at its top
 * step is written a rung out, which is what drains it from the round. Nothing
 * else tracks the round — see lib/ladder/round.ts.
 *
 * `last_review` is stamped on EVERY answer, pass or fail, because it is the
 * round's ordering key rather than a record of success. Failing to stamp it would
 * leave the just-answered Card at the front of the queue and serve it straight
 * back.
 *
 * NOTHING HERE CALLS refresh(). Advancing to the next Card is the client's move,
 * made with router.refresh() once it has finished showing the answer feedback —
 * refreshing from inside the action would swap the Card out from under a
 * correct/incorrect highlight the Learner has not read yet. addNewCardsToday
 * still refreshes because it has no feedback to hold.
 */
async function record(
  learnerId: string,
  cardId: string,
  current: LadderState,
  passed: boolean,
) {
  const now = new Date();
  const { state, finished } = applyAnswer(MANDARIN, current, passed);

  // Scheduled at the rung the Card ARRIVED holding, not the incremented one it
  // leaves with — `state.intervalRung` is what the NEXT top-step pass will use.
  // See the note on Transition.intervalDays in lib/ladder/ladder.ts.
  const due = finished ? dueFromRung(now, current.intervalRung) : now;

  // neon-http has no interactive transactions; db.batch runs both writes as one
  // HTTP transaction.
  await db.batch([
    db
      .insert(reviewStates)
      .values({
        learnerId,
        cardId,
        due,
        step: state.step,
        passStreak: state.passStreak,
        intervalRung: state.intervalRung,
        demotions: state.demotions,
        lastReview: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [reviewStates.learnerId, reviewStates.cardId],
        set: {
          due,
          step: state.step,
          passStreak: state.passStreak,
          intervalRung: state.intervalRung,
          demotions: state.demotions,
          lastReview: now,
          updatedAt: now,
        },
      }),
    // The step LOGGED is the one the Card was asked at, not the one it ended on:
    // this row is the record of what question was posed and how it went.
    db.insert(reviewLogs).values({
      learnerId,
      cardId,
      step: current.step,
      passed,
      reviewedAt: now,
    }),
  ]);

  // Mastery is "reached the top step", so only a promotion INTO it can open a
  // band. Gating the unlock write on that keeps the extra deck scan off the other
  // ~four answers of every Card's climb.
  if (current.step < TOP_STEP && state.step >= TOP_STEP) {
    await syncHskUnlocks(learnerId);
  }
}

/**
 * A flashcard answer. Self-graded — the Learner reveals the back and says whether
 * they had it, exactly as the old Again/Good split did, collapsed to a boolean.
 */
export async function submitSelfGrade(cardId: string, step: number, passed: boolean) {
  if (typeof passed !== "boolean") throw new Error("Invalid answer");

  const { learnerId, card, current } = await loadForAnswer(cardId, step);

  // A self-graded verdict on a multiple-choice step would let the client mark its
  // own MC answer, which is the one thing the option contract exists to prevent.
  if (isMultipleChoice(formatForStep(MANDARIN, current.step))) {
    throw new Error("Wrong answer type for this step");
  }

  await record(learnerId, card.id, current, passed);
}

/**
 * A multiple-choice answer.
 *
 * The client posts the STRING it chose and nothing else. It never received a
 * marker for the correct option (see StudyCard.options), so it cannot report a
 * verdict — the server re-derives the answer from the Card's own row and
 * compares. Same discipline as submitThaiAttempt in lib/thai/actions.ts, and the
 * reason grading lives here rather than in the component.
 *
 * The correct answer comes back in the RETURN value, which is the one moment it
 * may cross to the client: the answer has been committed and logged by then, so
 * knowing it can no longer change the outcome. That is what lets the option grid
 * highlight the right choice.
 */
export async function submitChoice(
  cardId: string,
  step: number,
  choice: string,
): Promise<{ passed: boolean; correct: string }> {
  if (typeof choice !== "string") throw new Error("Invalid answer");

  const { learnerId, card, current } = await loadForAnswer(cardId, step);

  const format = formatForStep(MANDARIN, current.step);
  if (!isMultipleChoice(format)) throw new Error("Wrong answer type for this step");

  const correct = expectedAnswerFor(card, format);
  const passed = isCorrectChoice(choice, correct);

  await record(learnerId, card.id, current, passed);

  return { passed, correct };
}

/**
 * Grant a today-only new-card top-up, requested from the round-complete screen.
 *
 * This does NOT touch the standing newCardsPerDay preference. It records a bonus
 * stamped with today's Thailand date; the read layer honors it only while that
 * stamp is today, so it expires overnight on its own.
 *
 * The bonus columns are shared with Advanced Thai — one Learner, one daily
 * intake — so a top-up taken here also raises today's Advanced Thai allowance.
 * That is the intended reading of "how much new material do I want today".
 */
export async function addNewCardsToday(amount: number) {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");

  // Typed as number, but erased at the network boundary — a direct POST can send
  // anything. Bound a single top-up to a sane batch.
  if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
    throw new Error("Invalid amount");
  }

  const today = thaiDateKey(new Date());
  const settings = await ensureLearnerSettings(learnerId);
  const priorBonus = settings.bonusNewCardsDate === today ? settings.bonusNewCards : 0;
  // Clamp to the same ceiling setNewCardsPerDay uses for the standing limit.
  const nextBonus = Math.min(1000, priorBonus + amount);

  await db
    .update(learnerSettings)
    .set({ bonusNewCards: nextBonus, bonusNewCardsDate: today })
    .where(eq(learnerSettings.learnerId, learnerId));

  refresh();
}

// Update the signed-in Learner's new-cards-per-day cap. Like the submit actions,
// this is a directly-POSTable server action: it derives the Learner from the
// session (never a caller-supplied id) and validates the value before writing.
export async function setNewCardsPerDay(value: number) {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");

  if (!Number.isInteger(value) || value < 0 || value > 1000) {
    throw new Error("Invalid new-cards-per-day value");
  }

  await db
    .update(learnerSettings)
    .set({ newCardsPerDay: value })
    .where(eq(learnerSettings.learnerId, learnerId));
}

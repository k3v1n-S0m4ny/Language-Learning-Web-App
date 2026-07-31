"use server";

import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  atCards,
  atReviewLogs,
  atReviewStates,
  learnerSettings,
} from "@/lib/db/schema";
import { isCorrectChoice } from "@/lib/ladder/distractors";
import { dueFromRung } from "@/lib/ladder/intervals";
import {
  INITIAL_STATE,
  applyAnswer,
  formatForStep,
  type LadderKey,
  type LadderState,
} from "@/lib/ladder/ladder";
import { ensureLearnerSettings } from "@/lib/review/queries";
import { thaiDateKey } from "@/lib/review/time";
import type { PhraseEntry, VocabEntry } from "@/seed/advanced-thai/types";
import { isAdvancedThaiLearner } from "./access";
import {
  expectedAnswerFor,
  getAdvancedPracticeData,
  getAdvancedRoundData,
  isMultipleChoice,
} from "./queries";
import {
  LADDER_FOR_KIND,
  type AtCardKind,
  type AtNextPractice,
  type AtNextRound,
} from "./types";

/**
 * Everything the two submit actions share: authorise, load the card and its
 * ladder state, and refuse to grade a stale question.
 *
 * A Server Action is a public POST endpoint. It does not matter that the only
 * route that renders these cards is already gated — the action can be called
 * without ever loading that route. So the allowlist is re-checked HERE, on the
 * signed-in session's own email, and this is the check that actually enforces
 * that Advanced Thai is the owner's personal course. Everything the UI does is
 * decoration on top of it.
 *
 * THE CLIENT'S `step` IS NOT TRUSTED AS THE STEP TO GRADE AT. It is compared
 * against the stored one and the request is rejected on a mismatch. Without that,
 * a replayed submission would be applied at whatever step the card has since
 * climbed to — promoting a card on the strength of an answer given to an easier
 * question.
 */
async function loadForAnswer(cardId: string, step: number) {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");
  if (!isAdvancedThaiLearner(session.user?.email)) throw new Error("Unauthorized");

  // Typed as number, but the type is erased at the network boundary — a direct
  // POST can send anything.
  if (!Number.isInteger(step) || step < 1) throw new Error("Invalid step");

  // The card must exist. Without this an unknown id would fall through to the
  // insert and fail on the FK with a Postgres error rather than a clear one.
  //
  // `themeId` is selected for the NEXT card rather than for this one: the round
  // an answer belongs to is the theme of the card being answered, so deriving it
  // here means the client never has to name a theme — and therefore cannot name
  // someone else's.
  const [card] = await db
    .select({
      id: atCards.id,
      themeId: atCards.themeId,
      kind: atCards.kind,
      payload: atCards.payload,
    })
    .from(atCards)
    .where(eq(atCards.id, cardId));
  if (!card) throw new Error("Card not found");
  if (card.kind !== "vocab" && card.kind !== "phrase") throw new Error("Card not found");

  // Re-read the state so the answer applies to the freshest row (the study screen
  // already read it to choose the format; this avoids a lost update and is
  // deliberate, not a redundant query).
  const [existing] = await db
    .select()
    .from(atReviewStates)
    .where(
      and(eq(atReviewStates.learnerId, learnerId), eq(atReviewStates.cardId, cardId)),
    );

  const current = existing
    ? {
        step: existing.step,
        passStreak: existing.passStreak,
        intervalRung: existing.intervalRung,
        demotions: existing.demotions,
      }
    : INITIAL_STATE;

  if (current.step !== step) throw new Error("Stale answer");

  return {
    learnerId,
    themeId: card.themeId,
    kind: card.kind as AtCardKind,
    payload: card.payload as VocabEntry | PhraseEntry,
    ladder: LADDER_FOR_KIND[card.kind as AtCardKind],
    current,
  };
}

/**
 * Apply one graded answer: move the card along its ladder, schedule it, log it.
 *
 * The two writes to `due` are the round mechanism, and they are the only place it
 * exists. A card that has NOT finished is written `due = now`, so it stays inside
 * the `due <= now` batch and keeps cycling today; a card that passed at its top
 * step is written a rung out, which is what drains it from the round. Nothing
 * else tracks the round — see lib/ladder/round.ts.
 *
 * `last_review` is stamped on EVERY answer, pass or fail, because it is the
 * round's ordering key rather than a record of success. Failing to stamp it would
 * leave the just-answered card at the front of the queue and serve it straight
 * back.
 *
 * NOTHING HERE CALLS refresh(), and the answer path no longer re-renders the page
 * at all. The next card comes back in the grading action's own RETURN VALUE (see
 * AtNextRound) and the client swaps it in when the Learner is done reading the
 * feedback. Refreshing from inside the action would swap the card out from under
 * a correct/incorrect highlight nobody has read yet; refreshing from the client
 * AFTER the feedback — which is what this used to do — spent the whole reveal
 * doing nothing and then made the Learner wait for a full RSC round trip.
 * addNewCardsToday still refreshes, because it has no feedback to hold.
 *
 * THIS MUST COMPLETE BEFORE THE NEXT CARD IS QUERIED. `last_review` is stamped
 * below, and that stamp is the only thing that stops the just-answered card being
 * handed straight back as the next one (see the ordering note in queries.ts).
 */
async function record(
  learnerId: string,
  cardId: string,
  ladder: LadderKey,
  current: LadderState,
  passed: boolean,
) {
  const now = new Date();
  const { state, finished } = applyAnswer(ladder, current, passed);

  // Scheduled at the rung the card ARRIVED holding, not the incremented one it
  // leaves with — `state.intervalRung` is what the NEXT top-step pass will use.
  // See the note on Transition.intervalDays in lib/ladder/ladder.ts.
  const due = finished ? dueFromRung(now, current.intervalRung) : now;

  // neon-http has no interactive transactions; db.batch runs both writes as one
  // HTTP transaction.
  await db.batch([
    db
      .insert(atReviewStates)
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
        target: [atReviewStates.learnerId, atReviewStates.cardId],
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
    // The step LOGGED is the one the card was asked at, not the one it ended on:
    // this row is the record of what question was posed and how it went.
    db.insert(atReviewLogs).values({
      learnerId,
      cardId,
      step: current.step,
      passed,
      reviewedAt: now,
    }),
  ]);
}

/**
 * A flashcard answer. Self-graded — the Learner reveals the back and says whether
 * they had it, exactly as the old Again/Good split did, collapsed to a boolean.
 */
export async function submitAdvancedSelfGrade(
  cardId: string,
  step: number,
  passed: boolean,
): Promise<{ next: AtNextRound }> {
  if (typeof passed !== "boolean") throw new Error("Invalid answer");

  const { learnerId, themeId, ladder, current } = await loadForAnswer(cardId, step);

  // A self-graded verdict on a multiple-choice step would let the client mark its
  // own MC answer, which is the one thing the option contract exists to prevent.
  if (isMultipleChoice(formatForStep(ladder, current.step))) {
    throw new Error("Wrong answer type for this step");
  }

  await record(learnerId, cardId, ladder, current, passed);

  return { next: await getAdvancedRoundData(learnerId, themeId) };
}

/**
 * A multiple-choice answer.
 *
 * The client posts the STRING it chose and nothing else. It never received a
 * marker for the correct option (see AtStudyCard.options), so it cannot report a
 * verdict — the server re-derives the answer from the card's own payload and
 * compares. Same discipline as submitThaiAttempt in lib/thai/actions.ts, and the
 * reason grading lives here rather than in the component.
 *
 * The correct answer comes back in the RETURN value, which is the one moment it
 * may cross to the client: the answer has been committed and logged by then, so
 * knowing it can no longer change the outcome. That is what lets the option grid
 * highlight the right choice.
 *
 * The NEXT CARD rides back in the same return value, for the reason set out on
 * record() above — so it is already in the client's hand while the Learner is
 * still reading the reveal.
 */
export async function submitAdvancedChoice(
  cardId: string,
  step: number,
  choice: string,
): Promise<{ passed: boolean; correct: string; next: AtNextRound }> {
  if (typeof choice !== "string") throw new Error("Invalid answer");

  const { learnerId, themeId, payload, ladder, current } = await loadForAnswer(cardId, step);

  const format = formatForStep(ladder, current.step);
  if (!isMultipleChoice(format)) throw new Error("Wrong answer type for this step");

  const correct = expectedAnswerFor(payload, format);
  const passed = isCorrectChoice(choice, correct);

  await record(learnerId, cardId, ladder, current, passed);

  return { passed, correct, next: await getAdvancedRoundData(learnerId, themeId) };
}

/**
 * Grade a multiple-choice answer WITHOUT recording it — practice mode's grader.
 *
 * Practice is read-only (see getAdvancedPracticeData), so it cannot call
 * submitAdvancedChoice: that would let a drill demote a card and drag it into a
 * study round. But the option grid still has to say whether the Learner was
 * right, and the client still must not hold the answer, so the comparison has to
 * happen on the server either way. This is that comparison with the write left
 * out — the same authorisation, the same single definition of the right answer,
 * no `at_review_states` row touched and no log written.
 *
 * The stale-step check still applies. It costs nothing and keeps one code path.
 *
 * The next DRAW comes back here too, exactly as it does for a recorded answer —
 * but it is a cross-theme random draw of this kind rather than a round pick, so
 * the pool it comes from is `card.kind` rather than `card.themeId`. Both are read
 * off the answered card, so practice never names its own pool either.
 */
export async function gradeAdvancedChoice(
  cardId: string,
  step: number,
  choice: string,
): Promise<{ passed: boolean; correct: string; next: AtNextPractice }> {
  if (typeof choice !== "string") throw new Error("Invalid answer");

  const { learnerId, kind, payload, ladder, current } = await loadForAnswer(cardId, step);

  const format = formatForStep(ladder, current.step);
  if (!isMultipleChoice(format)) throw new Error("Wrong answer type for this step");

  const correct = expectedAnswerFor(payload, format);
  return {
    passed: isCorrectChoice(choice, correct),
    correct,
    next: await getAdvancedPracticeData(learnerId, kind),
  };
}

/**
 * Draw the next practice card after a SELF-GRADED one — practice mode's only
 * server call on the flashcard path.
 *
 * A self-graded practice answer has nothing to submit: the Learner has already
 * seen the back and the verdict is theirs alone, so this deliberately writes
 * nothing and grades nothing. It exists because the draw itself is a server
 * concern — the pool is every card of this kind the Learner has ever met, and the
 * client is not allowed to pick from it. Before the next card started riding back
 * with the answer, this path short-circuited straight to router.refresh(); the
 * refresh is what is gone, so the draw needs somewhere to live.
 *
 * No stale-step check, because there is no step being answered. The allowlist
 * re-check is the same as everywhere else in this file — a Server Action is a
 * public POST endpoint whatever calls it.
 */
export async function nextAdvancedPracticeCard(cardId: string): Promise<AtNextPractice> {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");
  if (!isAdvancedThaiLearner(session.user?.email)) throw new Error("Unauthorized");

  const [card] = await db
    .select({ kind: atCards.kind })
    .from(atCards)
    .where(eq(atCards.id, cardId));
  if (!card) throw new Error("Card not found");
  if (card.kind !== "vocab" && card.kind !== "phrase") throw new Error("Card not found");

  return getAdvancedPracticeData(learnerId, card.kind as AtCardKind);
}

/**
 * Grant a today-only new-card top-up, requested from the round-complete screen.
 *
 * This does NOT touch the standing newCardsPerDay preference. It records a bonus
 * stamped with today's Thailand date; the Advanced Thai read layer honors it only
 * while that stamp is today, so it expires overnight on its own.
 *
 * Like the submit actions, this is a public POST endpoint — the allowlist
 * re-check on the session's own email is the real enforcement.
 */
export async function addNewCardsToday(amount: number) {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");
  if (!isAdvancedThaiLearner(session.user?.email)) throw new Error("Unauthorized");

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

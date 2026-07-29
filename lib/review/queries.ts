import { and, asc, count, eq, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  cards,
  cardTags,
  hskUnlocks,
  learnerSettings,
  reviewStates,
  tags,
  words,
} from "@/lib/db/schema";
import { buildOptions } from "@/lib/ladder/distractors";
import { INITIAL_STATE, formatForStep, type StepFormat } from "@/lib/ladder/ladder";
import { pickNext, type RoundCandidate } from "@/lib/ladder/round";
import { computeGate, type GateCardRow, type HskGate } from "./hsk-gate";
import { startOfThailandDay, thaiDateKey } from "./time";
import type { SessionCounts, StudyCard } from "./types";

// The Mandarin read layer. Its Advanced Thai counterpart is
// lib/advanced-thai/queries.ts, and the two are deliberately parallel rather than
// shared: they differ in their tables, in their card shape, and — the real reason
// — in their gating, which is the whole of the HSK band logic below and has no
// analogue there. What is NOT duplicated is the ladder itself; lib/ladder/* is
// pure and database-agnostic and both courses call straight into it.

// Read the Learner's settings, creating the default row only if missing. Common
// case (row exists) is a single SELECT — no write on every request.
export async function ensureLearnerSettings(learnerId: string) {
  const [existing] = await db
    .select()
    .from(learnerSettings)
    .where(eq(learnerSettings.learnerId, learnerId));
  if (existing) return existing;

  await db.insert(learnerSettings).values({ learnerId }).onConflictDoNothing();
  const [created] = await db
    .select()
    .from(learnerSettings)
    .where(eq(learnerSettings.learnerId, learnerId));
  return created;
}

/** A gate row plus the deck position the round needs to order new cards by. */
type GateRow = GateCardRow & { deckOrder: number };

// One deck-ordered scan of every Card joined to this Learner's ladder state, from
// which computeGate derives the per-band totals, the unlocked band and the list of
// new Cards that may actually be served.
//
// It returns one row per Card (515 today, ~50 bytes each) and every decision on
// top of it is made in JS — the same deliberate trade the stats page makes (see
// lib/review/stats.ts). Revisit if the deck ever grows past roughly 2,000 Cards.
//
// The mastery predicate is NOT duplicated here in SQL any more. It used to be,
// because mastery was a property of the append-only log table and needed a join;
// it is now simply `review_states.step`, so the raw step crosses into JS and
// isMastered decides. One definition, in hsk-gate.ts.
async function fetchGateRows(learnerId: string): Promise<GateRow[]> {
  const rows = await db.execute<{
    id: string;
    hsk_level: number | null;
    step: number | null;
    deck_order: number;
  }>(sql`
    SELECT c.id,
           c.hsk_level,
           rs.step,
           c.deck_order
    FROM ${cards} c
    LEFT JOIN ${reviewStates} rs
      ON rs.card_id = c.id AND rs.learner_id = ${learnerId}
    ORDER BY c.deck_order ASC, c.created_at ASC
  `);

  return rows.rows.map((r) => ({
    id: r.id,
    hskLevel: r.hsk_level,
    step: r.step,
    deckOrder: r.deck_order,
  }));
}

/** The bands this Learner has already earned. Stored facts — never recomputed. */
async function fetchStoredUnlocks(learnerId: string): Promise<number[]> {
  const rows = await db
    .select({ band: hskUnlocks.band })
    .from(hskUnlocks)
    .where(eq(hskUnlocks.learnerId, learnerId));
  return rows.map((r) => r.band);
}

// The Learner's HSK gate on its own, for the stats page. Callers that already need
// the study screen get it from getStudyScreenData instead — do not call both.
export async function getHskGate(learnerId: string): Promise<HskGate> {
  const [rows, stored] = await Promise.all([
    fetchGateRows(learnerId),
    fetchStoredUnlocks(learnerId),
  ]);
  return computeGate(rows, stored);
}

/**
 * The answer a card is asking for at this step — and what the server grades
 * against.
 *
 * "recognise" asks for the English, "produce" asks for the Chinese. That is the
 * only axis the format changes; MC and flashcard differ in how the answer is
 * collected, not in what it is. Exported because actions.ts must re-derive the
 * same value to grade a submitted choice, and there must be exactly one
 * definition of what the right answer is.
 */
export function expectedAnswerFor(
  card: { headword: string; wholeGloss: string },
  format: StepFormat,
): string {
  return format.startsWith("produce") ? card.headword : card.wholeGloss;
}

/** Whether a step collects its answer as one of four options. */
export function isMultipleChoice(format: StepFormat): boolean {
  return format === "recognise-mc" || format === "produce-mc";
}

/**
 * Attach the multiple-choice options, when the step calls for them.
 *
 * Distractors come from the SAME HSK BAND (the plan's rule — Advanced Thai's
 * equivalent is the same theme). A distractor drawn uniformly from the whole deck
 * is eliminable on difficulty alone, so the question would test nothing.
 *
 * `IS NOT DISTINCT FROM` rather than `=` so an unlevelled Card draws against the
 * other unlevelled Cards instead of against nothing — NULL = NULL is UNKNOWN and
 * would silently return an empty pool. Every band in the deck currently holds at
 * least 33 Cards; a band too small to yield three distractors degrades to a
 * shorter option list rather than failing, which is buildOptions' documented
 * behaviour.
 */
async function optionsFor(
  card: { id: string; headword: string; wholeGloss: string; hskLevel: number | null },
  format: StepFormat,
): Promise<string[] | undefined> {
  if (!isMultipleChoice(format)) return undefined;

  const siblings = await db
    .select({ headword: cards.headword, wholeGloss: cards.wholeGloss })
    .from(cards)
    .where(sql`${cards.hskLevel} IS NOT DISTINCT FROM ${card.hskLevel}`);

  const pool = siblings.map((row) => expectedAnswerFor(row, format));

  return buildOptions(expectedAnswerFor(card, format), pool);
}

/**
 * Load one Card at the step the Learner has it at, with its Words and Tags.
 *
 * A Card with no state row is one the round just admitted, so it reads at
 * INITIAL_STATE rather than erroring — introduction is a normal path, not a
 * missing-row edge case. The state row is written when the answer comes back, not
 * when the Card is served, so an abandoned session introduces nothing.
 */
async function loadStudyCard(
  learnerId: string,
  cardId: string,
): Promise<StudyCard | null> {
  const [cardRow, stateRow] = await Promise.all([
    db.select().from(cards).where(eq(cards.id, cardId)),
    db
      .select({ step: reviewStates.step, demotions: reviewStates.demotions })
      .from(reviewStates)
      .where(
        and(eq(reviewStates.learnerId, learnerId), eq(reviewStates.cardId, cardId)),
      ),
  ]);

  const card = cardRow[0];
  if (!card) return null;

  const step = stateRow[0]?.step ?? INITIAL_STATE.step;
  const demotions = stateRow[0]?.demotions ?? INITIAL_STATE.demotions;
  const format = formatForStep("mandarin", step);

  const [wordRows, tagRows, options] = await Promise.all([
    db
      .select()
      .from(words)
      .where(eq(words.cardId, cardId))
      .orderBy(asc(words.position)),
    db
      .select({ name: tags.name })
      .from(cardTags)
      .innerJoin(tags, eq(cardTags.tagId, tags.id))
      .where(eq(cardTags.cardId, cardId)),
    optionsFor(card, format),
  ]);

  return {
    id: card.id,
    headword: card.headword,
    isPhrase: card.isPhrase,
    wholeGloss: card.wholeGloss,
    wholePinyin: card.wholePinyin,
    wholeAudioUrl: card.wholeAudioUrl,
    words: wordRows.map((w) => ({
      id: w.id,
      position: w.position,
      hanzi: w.hanzi,
      gloss: w.gloss,
      pinyin: w.pinyin,
      audioUrl: w.audioUrl,
    })),
    tags: tagRows.map((t) => t.name),
    hskLevel: card.hskLevel,
    step,
    format,
    demotions,
    ...(options ? { options } : {}),
  };
}

/**
 * Everything the study screen needs: the round's counts and the next Card in it.
 *
 * The three-tier queue this replaces is gone in full, and so is the reasoning
 * behind it. Under FSRS a Card could be scheduled minutes into the future, so
 * "what do I serve now" needed a ready tier, a new tier, and a rescue tier for
 * Cards stranded just past `now` — plus pickFutureToday to stop the just-rated
 * Card being handed straight back. The ladder never schedules in minutes: a Card
 * still climbing is written with `due = now`, and a Card that finishes goes at
 * least a day out. So the batch is exactly `due <= now`, and the only question
 * left is what order to serve it in.
 *
 * That order is one rule — oldest-served first, never-served before that, deck
 * order to break ties — and it lives in lib/ladder/round.ts rather than in this
 * SQL, so it is testable and stated once for both courses. The just-rated Card
 * cannot repeat because stamping `last_review` puts it at the back of the line by
 * construction.
 *
 * New Cards join the batch here rather than being a separate tier: they are
 * candidates with a null `last_review`, which orderRound already puts first. Pass
 * one of a round is therefore the introduction pass, for free. THE HSK GATE IS
 * THE ONE THING THAT SURVIVES FROM THE TIER MODEL, and it still constrains new
 * Cards only — a Card already in review_states was introduced while its band was
 * open, and locking a band must never strand it.
 */
export async function getStudyScreenData(
  learnerId: string,
  now: Date = new Date(),
): Promise<{ counts: SessionCounts; card: StudyCard | null }> {
  const dayStart = startOfThailandDay(now);

  const [settings, newTodayRow, dueRows, gateRows, stored] = await Promise.all([
    ensureLearnerSettings(learnerId),
    // New Cards introduced today, against the Bangkok day boundary.
    db
      .select({ n: count() })
      .from(reviewStates)
      .where(
        and(
          eq(reviewStates.learnerId, learnerId),
          sql`${reviewStates.createdAt} >= ${dayStart}`,
        ),
      ),
    // The batch: every started Card owed now.
    db
      .select({
        cardId: reviewStates.cardId,
        lastReview: reviewStates.lastReview,
        deckOrder: cards.deckOrder,
      })
      .from(reviewStates)
      .innerJoin(cards, eq(cards.id, reviewStates.cardId))
      .where(and(eq(reviewStates.learnerId, learnerId), lte(reviewStates.due, now))),
    fetchGateRows(learnerId),
    fetchStoredUnlocks(learnerId),
  ]);

  const gate = computeGate(gateRows, stored);

  // The bonus is a today-only top-up granted from the round-complete screen. It
  // used to be read by Advanced Thai only; with rounds it is the Learner's one way
  // to extend a finished session, so both courses honour it.
  const bonusToday =
    settings.bonusNewCardsDate === thaiDateKey(now) ? settings.bonusNewCards : 0;
  const capRemaining = Math.max(
    0,
    settings.newCardsPerDay + bonusToday - (newTodayRow[0]?.n ?? 0),
  );

  const deckOrderById = new Map(gateRows.map((r) => [r.id, r.deckOrder]));
  const admitted = gate.eligibleUnseenIds.slice(0, capRemaining);

  const candidates: RoundCandidate[] = [
    ...dueRows.map((r) => ({
      cardId: r.cardId,
      lastReview: r.lastReview,
      deckOrder: r.deckOrder,
    })),
    ...admitted.map((id) => ({
      cardId: id,
      lastReview: null,
      deckOrder: deckOrderById.get(id) ?? 0,
    })),
  ];

  // Every candidate is by definition unfinished — a Card that passed at its top
  // step was scheduled a day out and is no longer in `due <= now`. So the batch
  // size IS the finish line, and `repeats` is the already-asked-today subset of
  // it. See SessionCounts for why `remaining` is cards-left rather than asks-left.
  const counts: SessionCounts = {
    remaining: candidates.length,
    repeats: candidates.filter((c) => c.lastReview !== null && c.lastReview >= dayStart)
      .length,
    gate: {
      unlockedBand: gate.unlockedBand,
      nextBand: gate.nextBand,
      blockingBand: gate.blockingBand
        ? {
            band: gate.blockingBand.band,
            mastered: gate.blockingBand.mastered,
            required: gate.blockingBand.required,
          }
        : null,
      // BEFORE the daily cap: the round-complete screen needs to know whether a
      // top-up could produce anything, and the gate is the thing that would stop it.
      eligibleUnseen: gate.eligibleUnseenIds.length,
    },
  };

  const chosenId = pickNext(candidates);
  if (!chosenId) return { counts, card: null };

  return { counts, card: await loadStudyCard(learnerId, chosenId) };
}

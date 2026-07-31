import { and, asc, count, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { atCards, atReviewStates, atThemes } from "@/lib/db/schema";
import { buildOptions } from "@/lib/ladder/distractors";
import { INITIAL_STATE, formatForStep, type StepFormat } from "@/lib/ladder/ladder";
import { pickNext, type RoundCandidate } from "@/lib/ladder/round";
import { ensureLearnerSettings } from "@/lib/review/queries";
import { startOfThailandDay, thaiDateKey } from "@/lib/review/time";
import type { PhraseEntry, VocabEntry } from "@/seed/advanced-thai/types";
import {
  AT_CARD_KINDS,
  LADDER_FOR_KIND,
  type AtCardKind,
  type AtKindSummary,
  type AtNextPractice,
  type AtNextRound,
  type AtPracticeCounts,
  type AtRoundCounts,
  type AtStudyCard,
  type AtThemeSummary,
} from "./types";

// The Advanced Thai read layer. It mirrors lib/review/queries.ts closely, and the
// duplication is deliberate rather than lazy: the two differ in their tables
// (at_* vs the Mandarin card library), in their card shape (a discriminated
// payload vs headword+words), and in their gating (none vs the HSK band gate).
// Trying to serve both from one generic query would mean threading a table and a
// gate strategy through every call, which is more indirection than the ~80 lines
// it would save.
//
// WHAT IS *NOT* DUPLICATED IS THE LADDER. lib/ladder/* is pure and
// database-agnostic, so this calls straight into it — same step definitions, same
// ordering rule, same option builder. There is exactly one ladder engine in this
// app and there must remain exactly one.

/**
 * The answer a card is asking for at this step — and what the server grades
 * against.
 *
 * "recognise" asks for the English, "produce" asks for the Thai. That is the only
 * axis the format changes; MC and flashcard differ in how the answer is
 * collected, not in what it is. Exported because actions.ts must re-derive the
 * same value to grade a submitted choice, and there must be exactly one
 * definition of what the right answer is.
 */
export function expectedAnswerFor(
  payload: VocabEntry | PhraseEntry,
  format: StepFormat,
): string {
  return format.startsWith("produce") ? payload.thai : payload.gloss;
}

/** Whether a step collects its answer as one of four options. */
export function isMultipleChoice(format: StepFormat): boolean {
  return format === "recognise-mc" || format === "produce-mc";
}

/**
 * Attach the multiple-choice options, when the step calls for them.
 *
 * Distractors come from the SAME THEME (the plan's rule), which is why this takes
 * a theme rather than deriving one: in cross-theme practice a card still draws its
 * neighbours from the theme it belongs to, not from the whole deck. They are also
 * drawn from the same KIND, so a vocab question is never answered by a whole
 * phrase — a distractor that can be eliminated on shape alone is not a distractor.
 *
 * The card's own row is in the pool and is filtered out by buildOptions, which
 * drops anything equal to the answer.
 */
async function optionsFor(
  themeId: string,
  kind: AtCardKind,
  payload: VocabEntry | PhraseEntry,
  format: StepFormat,
): Promise<string[] | undefined> {
  if (!isMultipleChoice(format)) return undefined;

  const siblings = await db
    .select({ payload: atCards.payload })
    .from(atCards)
    .where(and(eq(atCards.themeId, themeId), eq(atCards.kind, kind)));

  const pool = siblings
    .map((row) => expectedAnswerFor(row.payload as VocabEntry | PhraseEntry, format))
    .filter((value): value is string => typeof value === "string");

  return buildOptions(expectedAnswerFor(payload, format), pool);
}

/** Rebuild the typed study card from the jsonb payload plus the Learner's ladder state. */
function toStudyCard(
  row: { id: string; kind: string; payload: unknown; audioUrl: string | null },
  step: number,
  demotions: number,
  options: string[] | undefined,
): AtStudyCard | null {
  const base = { id: row.id, step, demotions, ...(options ? { options } : {}) };

  switch (row.kind) {
    case "vocab":
      return {
        ...base,
        kind: "vocab",
        payload: row.payload as VocabEntry,
        audioUrl: row.audioUrl,
        format: formatForStep(LADDER_FOR_KIND.vocab, step),
      };
    case "phrase":
      return {
        ...base,
        kind: "phrase",
        payload: row.payload as PhraseEntry,
        audioUrl: row.audioUrl,
        format: formatForStep(LADDER_FOR_KIND.phrase, step),
      };
    default:
      // `kind` is a plain text column so it can grow without a migration; an
      // unknown value means content shipped ahead of the UI. Skip it rather than
      // crash the whole session.
      return null;
  }
}

/** Every theme with this Learner's progress through it — the picker's data. */
export async function getThemeSummaries(
  learnerId: string,
  now: Date = new Date(),
): Promise<AtThemeSummary[]> {
  const dayStart = startOfThailandDay(now);

  const [settings, rows, newTodayRow] = await Promise.all([
    ensureLearnerSettings(learnerId),
    db.execute<{
      id: string;
      title_thai: string;
      title_english: string;
      summary: string;
      total_cards: number;
      seen_cards: number;
      due_count: number;
      unseen_cards: number;
    }>(sql`
      SELECT t.id,
             t.title_thai,
             t.title_english,
             t.summary,
             count(c.id)::int                                           AS total_cards,
             count(rs.card_id)::int                                     AS seen_cards,
             count(rs.card_id) FILTER (WHERE rs.due <= ${now})::int      AS due_count,
             count(c.id) FILTER (WHERE rs.card_id IS NULL)::int          AS unseen_cards
      FROM ${atThemes} t
      LEFT JOIN ${atCards} c ON c.theme_id = t.id
      LEFT JOIN ${atReviewStates} rs
        ON rs.card_id = c.id AND rs.learner_id = ${learnerId}
      GROUP BY t.id, t.title_thai, t.title_english, t.summary, t.deck_order
      ORDER BY t.deck_order ASC, t.id ASC
    `),
    // The daily new-card cap is shared with the other courses — it is one
    // learner's one preference, not a per-course setting.
    db
      .select({ n: count() })
      .from(atReviewStates)
      .where(
        and(
          eq(atReviewStates.learnerId, learnerId),
          sql`${atReviewStates.createdAt} >= ${dayStart}`,
        ),
      ),
  ]);

  const bonusToday =
    settings.bonusNewCardsDate === thaiDateKey(now) ? settings.bonusNewCards : 0;
  const capRemaining = Math.max(
    0,
    settings.newCardsPerDay + bonusToday - (newTodayRow[0]?.n ?? 0),
  );

  return rows.rows.map((r) => ({
    slug: r.id,
    titleThai: r.title_thai,
    titleEnglish: r.title_english,
    summary: r.summary,
    totalCards: r.total_cards,
    seenCards: r.seen_cards,
    dueCount: r.due_count,
    // Ungated: the only thing that can withhold a new card is the daily cap.
    newRemaining: Math.min(capRemaining, r.unseen_cards),
  }));
}

/**
 * Everything one theme's round needs.
 *
 * The three-tier queue this replaces is gone in full, and so is the reasoning
 * behind it. Under FSRS a card could be scheduled minutes into the future, so
 * "what do I serve now" needed a ready tier, a new tier, and a rescue tier for
 * cards stranded just past `now` — plus pickFutureToday to stop the just-rated
 * card being handed straight back. The ladder never schedules in minutes: a card
 * still climbing is written with `due = now`, and a card that finishes goes at
 * least a day out. So the batch is exactly `due <= now`, and the only question
 * left is what order to serve it in.
 *
 * That order is one rule — oldest-served first, never-served before that, deck
 * order to break ties — and it lives in lib/ladder/round.ts rather than in this
 * SQL, so it is testable and stated once for both courses. The just-rated card
 * cannot repeat because stamping `last_review` puts it at the back of the line by
 * construction.
 *
 * New cards join the batch here rather than being a separate tier: they are
 * candidates with a null `last_review`, which orderRound already puts first. Pass
 * one of a round is therefore the introduction pass, for free.
 */
export async function getAdvancedRoundData(
  learnerId: string,
  themeSlug: string,
  now: Date = new Date(),
): Promise<AtNextRound> {
  const dayStart = startOfThailandDay(now);

  const [settings, newTodayRow, dueRows, unseenRows] = await Promise.all([
    ensureLearnerSettings(learnerId),
    // New cards introduced today — counted across ALL themes, because the cap is
    // the learner's daily intake, not a per-theme allowance.
    db
      .select({ n: count() })
      .from(atReviewStates)
      .where(
        and(
          eq(atReviewStates.learnerId, learnerId),
          sql`${atReviewStates.createdAt} >= ${dayStart}`,
        ),
      ),
    // The batch: every started card in this theme that is owed now.
    db
      .select({
        cardId: atReviewStates.cardId,
        lastReview: atReviewStates.lastReview,
        deckOrder: atCards.deckOrder,
      })
      .from(atReviewStates)
      .innerJoin(atCards, eq(atCards.id, atReviewStates.cardId))
      .where(
        and(
          eq(atReviewStates.learnerId, learnerId),
          eq(atCards.themeId, themeSlug),
          lte(atReviewStates.due, now),
        ),
      ),
    // Unseen cards in deck order. Every one is read, not just the first: the cap
    // decides how many of them join the batch, and the count of what is left over
    // is what the round-complete screen needs to know whether a top-up could
    // produce anything.
    db
      .select({ cardId: atCards.id, deckOrder: atCards.deckOrder })
      .from(atCards)
      .leftJoin(
        atReviewStates,
        and(
          eq(atReviewStates.cardId, atCards.id),
          eq(atReviewStates.learnerId, learnerId),
        ),
      )
      .where(and(eq(atCards.themeId, themeSlug), isNull(atReviewStates.cardId)))
      .orderBy(asc(atCards.deckOrder)),
  ]);

  const bonusToday =
    settings.bonusNewCardsDate === thaiDateKey(now) ? settings.bonusNewCards : 0;
  const capRemaining = Math.max(
    0,
    settings.newCardsPerDay + bonusToday - (newTodayRow[0]?.n ?? 0),
  );

  const admitted = unseenRows.slice(0, capRemaining);
  const candidates: RoundCandidate[] = [
    ...dueRows.map((r) => ({
      cardId: r.cardId,
      lastReview: r.lastReview,
      deckOrder: r.deckOrder,
    })),
    ...admitted.map((r) => ({ cardId: r.cardId, lastReview: null, deckOrder: r.deckOrder })),
  ];

  // Every candidate is by definition unfinished — a card that passed at its top
  // step was scheduled a day out and is no longer in `due <= now`. So the batch
  // size IS the finish line, and `repeats` is the already-seen-today subset of
  // it. See AtRoundCounts for why `remaining` is cards-left rather than
  // asks-left.
  const counts: AtRoundCounts = {
    remaining: candidates.length,
    repeats: candidates.filter((c) => c.lastReview !== null && c.lastReview >= dayStart)
      .length,
    unseenRemaining: unseenRows.length,
  };

  const chosenId = pickNext(candidates);
  if (!chosenId) return { flow: "round", counts, card: null };

  return { flow: "round", counts, card: await loadStudyCard(learnerId, chosenId) };
}

/**
 * Load one card at the step the Learner has it at.
 *
 * A card with no state row is one the round just admitted, so it reads at
 * INITIAL_STATE rather than erroring — introduction is a normal path, not a
 * missing-row edge case. The state row is written when the answer comes back, not
 * when the card is served, so an abandoned session introduces nothing.
 */
async function loadStudyCard(
  learnerId: string,
  cardId: string,
): Promise<AtStudyCard | null> {
  const [cardRow, stateRow] = await Promise.all([
    db
      .select({
        id: atCards.id,
        themeId: atCards.themeId,
        kind: atCards.kind,
        payload: atCards.payload,
        audioUrl: atCards.audioUrl,
      })
      .from(atCards)
      .where(eq(atCards.id, cardId)),
    db
      .select({ step: atReviewStates.step, demotions: atReviewStates.demotions })
      .from(atReviewStates)
      .where(
        and(eq(atReviewStates.learnerId, learnerId), eq(atReviewStates.cardId, cardId)),
      ),
  ]);

  const row = cardRow[0];
  if (!row) return null;
  if (row.kind !== "vocab" && row.kind !== "phrase") return null;

  const step = stateRow[0]?.step ?? INITIAL_STATE.step;
  const demotions = stateRow[0]?.demotions ?? INITIAL_STATE.demotions;
  const kind = row.kind as AtCardKind;
  const payload = row.payload as VocabEntry | PhraseEntry;
  const format = formatForStep(LADDER_FOR_KIND[kind], step);

  const options = await optionsFor(row.themeId, kind, payload, format);

  return toStudyCard(row, step, demotions, options);
}

/** Every card kind with this Learner's progress through it — the practice picker's data. */
export async function getKindSummaries(learnerId: string): Promise<AtKindSummary[]> {
  const rows = await db.execute<{
    kind: string;
    total_cards: number;
    seen_cards: number;
  }>(sql`
    SELECT c.kind,
           count(c.id)::int       AS total_cards,
           count(rs.card_id)::int AS seen_cards
    FROM ${atCards} c
    LEFT JOIN ${atReviewStates} rs
      ON rs.card_id = c.id AND rs.learner_id = ${learnerId}
    GROUP BY c.kind
  `);

  const byKind = new Map(rows.rows.map((r) => [r.kind, r]));

  // Fixed AT_CARD_KINDS order, zero-filled: a kind with no seeded cards yet must
  // not vanish from the picker, and an unknown `kind` value in the data (content
  // shipped ahead of the UI — same rationale as toStudyCard's default branch) is
  // simply skipped rather than surfaced as a third, unhandled row.
  return AT_CARD_KINDS.map((kind) => {
    const row = byKind.get(kind);
    return {
      kind,
      totalCards: row?.total_cards ?? 0,
      seenCards: row?.seen_cards ?? 0,
    };
  });
}

/**
 * One card for a cross-theme practice drill.
 *
 * PRACTICE IS READ-ONLY. It writes no ladder state, so it has no round, no
 * finish line, and no session boundary — which is why the `?since=` timestamp
 * that used to thread a session identity through the URL is gone along with the
 * three repeat tiers it fed. A card is drawn at random from everything the
 * Learner has already met of this kind, asked at whatever step it currently sits
 * at, and that is the whole flow.
 *
 * Consequences worth stating, because they are features rather than oversights:
 * a card can repeat within a sitting (the draw has no memory), answering here
 * cannot demote a card the Learner is doing badly on, and nothing practised here
 * counts toward or against a study round.
 */
export async function getAdvancedPracticeData(
  learnerId: string,
  kind: AtCardKind,
): Promise<AtNextPractice> {
  const poolFilter = and(
    eq(atReviewStates.learnerId, learnerId),
    eq(atCards.kind, kind),
  );

  const [poolRow, drawnRow] = await Promise.all([
    db
      .select({ n: count() })
      .from(atReviewStates)
      .innerJoin(atCards, eq(atCards.id, atReviewStates.cardId))
      .where(poolFilter),
    db
      .select({ cardId: atReviewStates.cardId })
      .from(atReviewStates)
      .innerJoin(atCards, eq(atCards.id, atReviewStates.cardId))
      .where(poolFilter)
      .orderBy(sql`random()`)
      .limit(1),
  ]);

  const counts: AtPracticeCounts = { poolSize: poolRow[0]?.n ?? 0 };
  const chosenId = drawnRow[0]?.cardId;
  if (!chosenId) return { flow: "practice", counts, card: null };

  return { flow: "practice", counts, card: await loadStudyCard(learnerId, chosenId) };
}

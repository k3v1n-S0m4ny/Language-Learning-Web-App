import { and, asc, count, eq, gt, gte, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { atCards, atReviewStates, atThemes } from "@/lib/db/schema";
import { ensureLearnerSettings } from "@/lib/review/queries";
import {
  createEmptyCard,
  getScheduler,
  hydrateFsrsCard,
  previewIntervals,
} from "@/lib/review/scheduler";
import { endOfThailandDay, startOfThailandDay, thaiDateKey } from "@/lib/review/time";
import type { IntervalHints } from "@/lib/review/types";
import type {
  GrammarPattern,
  PhraseEntry,
  VocabEntry,
} from "@/seed/advanced-thai/types";
import {
  AT_CARD_KINDS,
  type AtCardKind,
  type AtKindSummary,
  type AtPracticeCounts,
  type AtSessionCounts,
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
// WHAT IS *NOT* DUPLICATED IS THE SCHEDULER. lib/review/scheduler.ts is pure and
// database-agnostic, so this calls straight into it — same FSRS parameters, same
// retention constant, same interval hints. There is exactly one scheduler in this
// app and there must remain exactly one.

/** Rebuild the typed study card from the jsonb payload. */
function toStudyCard(
  row: { id: string; kind: string; payload: unknown; audioUrl: string | null },
  lapses: number,
): AtStudyCard | null {
  switch (row.kind) {
    case "vocab":
      return {
        id: row.id,
        kind: "vocab",
        payload: row.payload as VocabEntry,
        audioUrl: row.audioUrl,
        lapses,
      };
    case "grammar":
      // A grammar card's headline is an abstract frame, not a sayable utterance,
      // so it never carries a clip — see scripts/generate-advanced-thai-audio.ts.
      return {
        id: row.id,
        kind: "grammar",
        payload: row.payload as GrammarPattern,
        audioUrl: null,
        lapses,
      };
    case "phrase":
      return {
        id: row.id,
        kind: "phrase",
        payload: row.payload as PhraseEntry,
        audioUrl: row.audioUrl,
        lapses,
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
  const dayEnd = endOfThailandDay(now);

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
             count(c.id)::int                                              AS total_cards,
             count(rs.card_id)::int                                        AS seen_cards,
             count(rs.card_id) FILTER (WHERE rs.due <= ${dayEnd})::int     AS due_count,
             count(c.id) FILTER (WHERE rs.card_id IS NULL)::int            AS unseen_cards
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
 * Everything one theme's study screen needs.
 *
 * The three-tier queue is lifted from the Mandarin flow (lib/review/queries.ts),
 * because the reasoning behind it is not Mandarin-specific:
 *
 *   Tier 1 — READY:        due <= now. Overdue cards and intraday learning steps
 *                          whose timer has elapsed.
 *   Tier 2 — NEW:          unseen cards in deck order, only while the daily cap
 *                          allows. (No band gate — Advanced Thai is ungated.)
 *   Tier 3 — FUTURE-TODAY: due > now but <= end of the Thailand day. A card just
 *                          rated Again sits here for ~1 minute; serving it
 *                          prevents a dead end when it is the only card left.
 *
 * Priority: ready > (cap allows ? new : skip) > future-today. This is what stops
 * a freshly-failed card from immediately repeating: it is not `ready` yet, so a
 * new card is served instead, and it resurfaces only when its learning step
 * elapses.
 */
export async function getAdvancedStudyData(
  learnerId: string,
  themeSlug: string,
  now: Date = new Date(),
): Promise<{
  counts: AtSessionCounts;
  card: AtStudyCard | null;
  hints: IntervalHints | null;
}> {
  const dayStart = startOfThailandDay(now);
  const dayEnd = endOfThailandDay(now);

  const [settings, dueRow, newTodayRow, readyRow, newRow, futureRow, unseenRow] =
    await Promise.all([
      ensureLearnerSettings(learnerId),
      // Due today, scoped to this theme.
      db
        .select({ n: count() })
        .from(atReviewStates)
        .innerJoin(atCards, eq(atCards.id, atReviewStates.cardId))
        .where(
          and(
            eq(atReviewStates.learnerId, learnerId),
            eq(atCards.themeId, themeSlug),
            lte(atReviewStates.due, dayEnd),
          ),
        ),
      // New cards introduced today — counted across ALL themes, because the cap
      // is the learner's daily intake, not a per-theme allowance.
      db
        .select({ n: count() })
        .from(atReviewStates)
        .where(
          and(
            eq(atReviewStates.learnerId, learnerId),
            sql`${atReviewStates.createdAt} >= ${dayStart}`,
          ),
        ),
      // Tier 1.
      db
        .select({ cardId: atReviewStates.cardId })
        .from(atReviewStates)
        .innerJoin(atCards, eq(atCards.id, atReviewStates.cardId))
        .where(
          and(
            eq(atReviewStates.learnerId, learnerId),
            eq(atCards.themeId, themeSlug),
            lte(atReviewStates.due, now),
          ),
        )
        .orderBy(asc(atReviewStates.due))
        .limit(1),
      // Tier 2 — the first unseen card in deck order.
      db
        .select({ cardId: atCards.id })
        .from(atCards)
        .leftJoin(
          atReviewStates,
          and(
            eq(atReviewStates.cardId, atCards.id),
            eq(atReviewStates.learnerId, learnerId),
          ),
        )
        .where(and(eq(atCards.themeId, themeSlug), isNull(atReviewStates.cardId)))
        .orderBy(asc(atCards.deckOrder))
        .limit(1),
      // Tier 3.
      db
        .select({ cardId: atReviewStates.cardId })
        .from(atReviewStates)
        .innerJoin(atCards, eq(atCards.id, atReviewStates.cardId))
        .where(
          and(
            eq(atReviewStates.learnerId, learnerId),
            eq(atCards.themeId, themeSlug),
            gt(atReviewStates.due, now),
            lte(atReviewStates.due, dayEnd),
          ),
        )
        .orderBy(asc(atReviewStates.due))
        .limit(1),
      // How many unseen cards remain — so the header's New count never promises
      // a card that does not exist.
      db
        .select({ n: count() })
        .from(atCards)
        .leftJoin(
          atReviewStates,
          and(
            eq(atReviewStates.cardId, atCards.id),
            eq(atReviewStates.learnerId, learnerId),
          ),
        )
        .where(and(eq(atCards.themeId, themeSlug), isNull(atReviewStates.cardId))),
    ]);

  const bonusToday =
    settings.bonusNewCardsDate === thaiDateKey(now) ? settings.bonusNewCards : 0;
  const capRemaining = Math.max(
    0,
    settings.newCardsPerDay + bonusToday - (newTodayRow[0]?.n ?? 0),
  );
  const unseenRemaining = unseenRow[0]?.n ?? 0;
  const counts: AtSessionCounts = {
    dueCount: dueRow[0]?.n ?? 0,
    newRemaining: Math.min(capRemaining, unseenRemaining),
    unseenRemaining,
  };

  const chosenId =
    readyRow[0]?.cardId ??
    (counts.newRemaining > 0 ? newRow[0]?.cardId : undefined) ??
    futureRow[0]?.cardId;

  if (!chosenId) return { counts, card: null, hints: null };

  const [cardRow, stateRow] = await Promise.all([
    db
      .select({
        id: atCards.id,
        kind: atCards.kind,
        payload: atCards.payload,
        audioUrl: atCards.audioUrl,
      })
      .from(atCards)
      .where(eq(atCards.id, chosenId)),
    db
      .select({ fsrsCard: atReviewStates.fsrsCard })
      .from(atReviewStates)
      .where(
        and(
          eq(atReviewStates.learnerId, learnerId),
          eq(atReviewStates.cardId, chosenId),
        ),
      ),
  ]);

  if (!cardRow[0]) return { counts, card: null, hints: null };

  const scheduler = getScheduler();
  const fsrsCard = stateRow[0]
    ? hydrateFsrsCard(stateRow[0].fsrsCard)
    : createEmptyCard(now);

  const card = toStudyCard(cardRow[0], fsrsCard.lapses);
  if (!card) return { counts, card: null, hints: null };

  return { counts, card, hints: previewIntervals(scheduler, fsrsCard, now) };
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
  // simply skipped rather than surfaced as a fourth, unhandled row.
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
 * Everything one cross-theme practice-by-kind session needs.
 *
 * Unlike getAdvancedStudyData, the pool here is fixed by construction: every
 * query inner-joins at_review_states, so a card the Learner has never seen
 * cannot appear. There is no daily new-card cap to honor and no
 * ensureLearnerSettings call, because nothing here ever introduces a new card
 * — it only re-serves ones already in play. The `since` timestamp is what lets
 * the server tell "already practiced this session" apart from "practiced on an
 * earlier day, then left untouched" without any session storage:
 *
 *   Tier 1 — REPEAT-READY:    lastReview >= since AND due <= now. A card rated
 *                             in this session whose learning step has elapsed.
 *   Tier 2 — UNPRACTICED:     lastReview IS NULL OR lastReview < since, picked
 *                             at random. The bulk of the session — every pool
 *                             card not yet touched this time around.
 *   Tier 3 — FUTURE-TODAY:    lastReview >= since AND due > now AND
 *                             due <= end of Thailand day. Mirrors
 *                             getAdvancedStudyData's tier 3: a card just rated
 *                             Again sits here for ~1 minute so it can resurface
 *                             instead of ending the session early.
 *
 * Priority: repeat-ready > unpracticed > future-today — the same reasoning as
 * the per-theme flow, just without a cap to gate tier 2.
 */
export async function getAdvancedPracticeData(
  learnerId: string,
  kind: AtCardKind,
  since: Date,
  now: Date = new Date(),
): Promise<{
  counts: AtPracticeCounts;
  card: AtStudyCard | null;
  hints: IntervalHints | null;
}> {
  const dayEnd = endOfThailandDay(now);

  // Shared across every query below: this session's pool is this Learner's
  // already-introduced cards of this one kind, across every theme.
  const poolFilter = and(eq(atReviewStates.learnerId, learnerId), eq(atCards.kind, kind));
  const unpracticed = or(
    isNull(atReviewStates.lastReview),
    lt(atReviewStates.lastReview, since),
  );

  const [remainingRow, repeatRow, poolRow, readyRow, unpracticedRow, futureRow] =
    await Promise.all([
      // Header `remaining` — pool cards not yet rated this session.
      db
        .select({ n: count() })
        .from(atReviewStates)
        .innerJoin(atCards, eq(atCards.id, atReviewStates.cardId))
        .where(and(poolFilter, unpracticed)),
      // Header `repeatCount` — practiced-this-session cards due again before
      // end of Thai day. Tiers 1 and 3 combined: due <= now is a subset of
      // due <= dayEnd, so one count covers both.
      db
        .select({ n: count() })
        .from(atReviewStates)
        .innerJoin(atCards, eq(atCards.id, atReviewStates.cardId))
        .where(
          and(
            poolFilter,
            gte(atReviewStates.lastReview, since),
            lte(atReviewStates.due, dayEnd),
          ),
        ),
      // Header `poolSize` — every card of this kind ever seen, across all themes.
      db
        .select({ n: count() })
        .from(atReviewStates)
        .innerJoin(atCards, eq(atCards.id, atReviewStates.cardId))
        .where(poolFilter),
      // Tier 1.
      db
        .select({ cardId: atReviewStates.cardId })
        .from(atReviewStates)
        .innerJoin(atCards, eq(atCards.id, atReviewStates.cardId))
        .where(
          and(poolFilter, gte(atReviewStates.lastReview, since), lte(atReviewStates.due, now)),
        )
        .orderBy(asc(atReviewStates.due))
        .limit(1),
      // Tier 2 — random pick; see plan's "per-request ORDER BY random()" note.
      db
        .select({ cardId: atReviewStates.cardId })
        .from(atReviewStates)
        .innerJoin(atCards, eq(atCards.id, atReviewStates.cardId))
        .where(and(poolFilter, unpracticed))
        .orderBy(sql`random()`)
        .limit(1),
      // Tier 3.
      db
        .select({ cardId: atReviewStates.cardId })
        .from(atReviewStates)
        .innerJoin(atCards, eq(atCards.id, atReviewStates.cardId))
        .where(
          and(
            poolFilter,
            gte(atReviewStates.lastReview, since),
            gt(atReviewStates.due, now),
            lte(atReviewStates.due, dayEnd),
          ),
        )
        .orderBy(asc(atReviewStates.due))
        .limit(1),
    ]);

  const counts: AtPracticeCounts = {
    remaining: remainingRow[0]?.n ?? 0,
    repeatCount: repeatRow[0]?.n ?? 0,
    poolSize: poolRow[0]?.n ?? 0,
  };

  const chosenId = readyRow[0]?.cardId ?? unpracticedRow[0]?.cardId ?? futureRow[0]?.cardId;

  if (!chosenId) return { counts, card: null, hints: null };

  const [cardRow, stateRow] = await Promise.all([
    db
      .select({
        id: atCards.id,
        kind: atCards.kind,
        payload: atCards.payload,
        audioUrl: atCards.audioUrl,
      })
      .from(atCards)
      .where(eq(atCards.id, chosenId)),
    db
      .select({ fsrsCard: atReviewStates.fsrsCard })
      .from(atReviewStates)
      .where(
        and(eq(atReviewStates.learnerId, learnerId), eq(atReviewStates.cardId, chosenId)),
      ),
  ]);

  if (!cardRow[0]) return { counts, card: null, hints: null };

  const scheduler = getScheduler();
  // Every card in this pool has an at_review_states row by construction (all
  // three tiers inner-join it), so stateRow[0] is never actually absent — the
  // createEmptyCard fallback exists only to keep this hydration identical to
  // getAdvancedStudyData's, not because it is reachable here.
  const fsrsCard = stateRow[0] ? hydrateFsrsCard(stateRow[0].fsrsCard) : createEmptyCard(now);

  const card = toStudyCard(cardRow[0], fsrsCard.lapses);
  if (!card) return { counts, card: null, hints: null };

  return { counts, card, hints: previewIntervals(scheduler, fsrsCard, now) };
}

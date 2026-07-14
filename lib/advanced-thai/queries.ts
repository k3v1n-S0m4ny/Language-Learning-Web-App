import { and, asc, count, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { atCards, atReviewStates, atThemes } from "@/lib/db/schema";
import { ensureLearnerSettings } from "@/lib/review/queries";
import {
  createEmptyCard,
  getScheduler,
  hydrateFsrsCard,
  previewIntervals,
} from "@/lib/review/scheduler";
import { endOfThailandDay, startOfThailandDay } from "@/lib/review/time";
import type { IntervalHints } from "@/lib/review/types";
import type {
  GrammarPattern,
  PhraseEntry,
  VocabEntry,
} from "@/seed/advanced-thai/types";
import type { AtSessionCounts, AtStudyCard, AtThemeSummary } from "./types";

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

  const capRemaining = Math.max(
    0,
    settings.newCardsPerDay - (newTodayRow[0]?.n ?? 0),
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

  const capRemaining = Math.max(
    0,
    settings.newCardsPerDay - (newTodayRow[0]?.n ?? 0),
  );
  const counts: AtSessionCounts = {
    dueCount: dueRow[0]?.n ?? 0,
    newRemaining: Math.min(capRemaining, unseenRow[0]?.n ?? 0),
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

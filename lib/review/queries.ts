import { and, asc, count, eq, gt, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  cards,
  cardTags,
  learnerSettings,
  reviewLogs,
  reviewStates,
  tags,
  words,
} from "@/lib/db/schema";
import { computeGate, type GateCardRow, type HskGate } from "./hsk-gate";
import {
  createEmptyCard,
  getScheduler,
  hydrateFsrsCard,
  previewIntervals,
} from "./scheduler";
import { endOfThailandDay, startOfThailandDay } from "./time";
import type { IntervalHints, SessionCounts, StudyCard } from "./types";

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

// One deck-ordered scan of every Card, joined to this Learner's state, from which
// computeGate() derives the whole HSK gate: per-band totals, the unlocked band, the
// next new Card to serve, and how many unseen Cards are actually servable.
//
// This single query replaces BOTH the old `unseen` COUNT and the old Tier-2
// "next unseen card" SELECT, so it costs no extra round-trip. It returns one row
// per Card (204 today, ~50 bytes each), and every decision on top of it is made in
// JS — the same deliberate trade the stats page makes (see lib/review/stats.ts:2-5).
// Revisit if the deck ever grows past roughly 2,000 Cards.
//
// Mastery is a LEFT JOIN against a DISTINCT sub-select rather than a correlated
// EXISTS: the latter plans as a SubPlan per Card row. The gate predicate itself
// (isMasteryLog) is duplicated here in SQL only for the join; its meaning is
// documented once, in lib/review/hsk-gate.ts.
async function fetchGateRows(learnerId: string): Promise<GateCardRow[]> {
  const rows = await db.execute<{
    id: string;
    hsk_level: number | null;
    seen: boolean;
    mastered: boolean;
  }>(sql`
    SELECT c.id,
           c.hsk_level,
           (rs.card_id IS NOT NULL) AS seen,
           (m.card_id IS NOT NULL) AS mastered
    FROM ${cards} c
    LEFT JOIN ${reviewStates} rs
      ON rs.card_id = c.id AND rs.learner_id = ${learnerId}
    LEFT JOIN (
      SELECT DISTINCT card_id
      FROM ${reviewLogs}
      WHERE learner_id = ${learnerId}
        AND (rating = 4 OR ((log->>'state')::int = 2 AND rating >= 3))
    ) m ON m.card_id = c.id
    ORDER BY c.deck_order ASC, c.created_at ASC
  `);

  return rows.rows.map((r) => ({
    id: r.id,
    hskLevel: r.hsk_level,
    seen: r.seen,
    mastered: r.mastered,
  }));
}

// The session counts. Run in parallel (one round-trip wave) using plain
// query-builder calls — type-checked, no hand-written SQL.
async function fetchRawCounts(
  learnerId: string,
  now: Date,
): Promise<{ due: number; newToday: number }> {
  const dayStart = startOfThailandDay(now);
  // "Due today" = overdue cards (due <= now) PLUS same-day learning/relearning
  // steps that fire later today (due <= end-of-Thailand-day).  We use the same
  // predicate as the queue selection below so the header count always matches
  // what is actually served (A6).
  //
  // Safety (A5): ts-fsrs v5.4.0 (enable_short_term=true, learning_steps=["1m","10m"],
  // relearning_steps=["10m"]) was probed with node -e.  Findings:
  //   • New/Learning cards rated Again/Hard/Good → state=Learning, due ≤ now+10m (intraday) ✓
  //   • New card rated Easy → state=Review, due = +8 days ✗  (excluded — well past today)
  //   • Review card rated Again → state=Relearning, due = now+10m (intraday) ✓
  //   • Review card rated Hard/Good/Easy → state=Review, due ≥ now+27d ✗ (excluded)
  //   • Relearning + Again → state=Relearning, due = now+10m (intraday) ✓
  //   • Relearning + Hard → state=Relearning, due = now+15m (intraday) ✓
  //   • Relearning + Good → state=Review, due = +1 day ✗  (excluded)
  //   • Relearning + Easy → state=Review, due = +2 days ✗  (excluded)
  // Therefore endOfThailandDay correctly includes {Learning, Relearning} intraday steps
  // and excludes all graduated Review-state intervals.  No state-filter fallback needed.
  const dayEnd = endOfThailandDay(now);
  const [dueRow, newRow] = await Promise.all([
    db
      .select({ n: count() })
      .from(reviewStates)
      .where(
        and(eq(reviewStates.learnerId, learnerId), lte(reviewStates.due, dayEnd)),
      ),
    db
      .select({ n: count() })
      .from(reviewStates)
      .where(
        and(
          eq(reviewStates.learnerId, learnerId),
          sql`${reviewStates.createdAt} >= ${dayStart}`,
        ),
      ),
  ]);

  return {
    due: dueRow[0]?.n ?? 0,
    newToday: newRow[0]?.n ?? 0,
  };
}

// The supply of new Cards is now `gate.eligibleUnseenCount`, NOT the raw unseen
// count: the header must never promise a new Card the gate would refuse to serve
// (the A6 invariant — the count always matches what is actually served).
function toCounts(
  raw: { due: number; newToday: number },
  gate: HskGate,
  newCardsPerDay: number,
): SessionCounts {
  const capRemaining = Math.max(0, newCardsPerDay - raw.newToday);
  return {
    dueCount: raw.due,
    newRemaining: Math.min(capRemaining, gate.eligibleUnseenCount),
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
      eligibleUnseen: gate.eligibleUnseenCount,
    },
  };
}

// The Learner's HSK gate on its own, for the stats page and for submitReview's
// server-side check. Callers that already need the study screen get it from
// getStudyScreenData instead — do not call both.
export async function getHskGate(learnerId: string): Promise<HskGate> {
  return computeGate(await fetchGateRows(learnerId));
}

// Load a Card's Words (ordered) and Tag names in parallel.
async function loadStudyCard(cardId: string): Promise<StudyCard | null> {
  const [card] = await db.select().from(cards).where(eq(cards.id, cardId));
  if (!card) return null;

  const [wordRows, tagRows] = await Promise.all([
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
    // Placeholder — getStudyScreenData overwrites this with the real value once
    // the fsrs_card row is available. New (unseen) cards have lapses = 0.
    lapses: 0,
  };
}

// Everything the study screen needs, in as few round-trips as possible:
//   wave 1: settings + (due-id, new-id, raw counts) in parallel
//   wave 2: the chosen Card's words+tags+fsrs-state in parallel
// The fsrs_card jsonb stays server-side; only the formatted hints cross to the client.
export async function getStudyScreenData(
  learnerId: string,
  now: Date = new Date(),
): Promise<{
  counts: SessionCounts;
  card: StudyCard | null;
  hints: IntervalHints | null;
}> {
  // Broaden eligibility to end-of-Thailand-day so same-day learning/relearning
  // steps (Again → +1 min, Hard → +6 min, etc.) are served within the session
  // rather than waiting for wall-clock time to catch up (A1, A2).
  // Graduated Review-state cards rated Hard/Good/Easy land ≥ 27 days out, so
  // they are never pulled forward by this bound (A3).  See fetchRawCounts for
  // the full ts-fsrs v5.4.0 probe findings (A5).
  const dayEnd = endOfThailandDay(now);

  // === A-series queue selection (M9/A4) ======================================
  // Three tiers run in the same Promise.all wave (no extra round-trip):
  //
  //   Tier 1 — READY:        due <= now.  Overdue + intraday learning steps
  //                          whose wall-clock timer has already elapsed.
  //   Tier 2 — NEW:          unseen cards ordered by deck_order ASC (CSV row
  //                          order), created_at as tiebreak, RESTRICTED TO THE
  //                          LEARNER'S UNLOCKED HSK BANDS (see hsk-gate.ts).
  //                          Only served when the daily new-card cap allows.
  //   Tier 3 — FUTURE-TODAY: due > now AND due <= dayEnd. The failed card's
  //                          ~1-minute learning step will land here. Serving
  //                          it prevents a dead-end when only one card remains
  //                          and no ready or new card is available.
  //
  // The HSK gate deliberately constrains Tier 2 ONLY. Tiers 1 and 3 draw from
  // review_states — a Card that is already there was introduced while its band was
  // open, and locking a band must never strand it. So a locked band can slow the
  // intake of new Cards; it can never take away work the Learner already has.
  //
  // Priority: readyId > (cap allows ? newId : skip) > futureTodayId.
  //
  // WHY this fixes immediate-repeat (commit ac38cce): when a brand-new card is
  // rated Again, FSRS schedules it ~1 min out (Learning step). On the very next
  // render Tier 1 finds nothing ready (the failed card's due is ~1 min future),
  // Tier 2 advances the next new card, and the failed card only resurfaces when
  // its timer elapses — exactly the natural learning-step delay, not instantly.
  // Tier 3 guarantees a session with a single card never goes blank.
  // ============================================================================
  const [settings, raw, gateRows, readyRow, futureTodayRow] = await Promise.all([
    ensureLearnerSettings(learnerId),
    fetchRawCounts(learnerId, now),
    // Tier 2 + the unseen count, both derived from this one deck-ordered scan.
    fetchGateRows(learnerId),
    // Tier 1: cards whose due timestamp has already passed.
    db
      .select({ cardId: reviewStates.cardId })
      .from(reviewStates)
      .where(
        and(eq(reviewStates.learnerId, learnerId), lte(reviewStates.due, now)),
      )
      .orderBy(asc(reviewStates.due))
      .limit(1),
    // Tier 3: intraday learning-step cards not yet ready (due > now, <= dayEnd).
    db
      .select({ cardId: reviewStates.cardId })
      .from(reviewStates)
      .where(
        and(
          eq(reviewStates.learnerId, learnerId),
          gt(reviewStates.due, now),
          lte(reviewStates.due, dayEnd),
        ),
      )
      .orderBy(asc(reviewStates.due))
      .limit(1),
  ]);

  const gate = computeGate(gateRows);
  const counts = toCounts(raw, gate, settings.newCardsPerDay);

  const readyId = readyRow[0]?.cardId;
  const newCardId = gate.firstEligibleUnseenId ?? undefined;
  const futureTodayId = futureTodayRow[0]?.cardId;
  const chosenId = readyId ?? (counts.newRemaining > 0 ? newCardId : undefined) ?? futureTodayId;

  if (!chosenId) return { counts, card: null, hints: null };

  const [card, stateRow] = await Promise.all([
    loadStudyCard(chosenId),
    db
      .select({ fsrsCard: reviewStates.fsrsCard })
      .from(reviewStates)
      .where(
        and(
          eq(reviewStates.learnerId, learnerId),
          eq(reviewStates.cardId, chosenId),
        ),
      ),
  ]);

  if (!card) return { counts, card: null, hints: null };

  const scheduler = getScheduler();
  const fsrsCard = stateRow[0]
    ? hydrateFsrsCard(stateRow[0].fsrsCard)
    : createEmptyCard(now);
  const hints = previewIntervals(scheduler, fsrsCard, now);

  // Populate lapses from the persisted FSRS card so the client can show the
  // leech badge without receiving the full fsrs_card blob.
  card.lapses = fsrsCard.lapses;

  return { counts, card, hints };
}

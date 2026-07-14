// The HSK band gate: new Cards are only served from a band the Learner has
// unlocked, and a band unlocks once the band below it is 80% mastered.
//
// Pure — no database access, no `@/lib/db` import (importing it constructs a
// neon() client at module load, which throws under `tsx --test`). Same rationale
// as lib/thai/exam-pure.ts. Every gate decision in the app is made here, so the
// queue and the Server Action cannot drift apart.

// 80, not 90. The bar is a fraction of a band's cards, so every Card added to a band
// raises the absolute number needed to clear it. Seeding the travel/transport set put
// 29 new Cards into band 1 (130 -> 159), which at 90% moved the bar from 117 to 144
// mastered — the band grew faster than the Learner could climb it. 80% keeps the gate's
// purpose (do not serve HSK 4 to someone who has not met HSK 1) while leaving the
// ladder reachable as the deck grows.
export const HSK_UNLOCK_THRESHOLD_PERCENT = 80;

// Bands 1-6 are as published; 7 is the merged "HSK 7-9" advanced band, which HSK
// itself does not subdivide. See the cards.hsk_level comment in lib/db/schema.ts.
export const MAX_HSK_BAND = 7;

export function hskLabel(band: number): string {
  return band === MAX_HSK_BAND ? "HSK 7-9" : `HSK ${band}`;
}

// === Mastery ================================================================
//
// A Card is mastered when the Learner has EITHER rated it Easy at least once, OR
// recalled it correctly (Good/Easy) *after* it had already graduated to Review
// state and survived a real multi-day interval.
//
// Easy alone would be wrong in both directions: a Learner who honestly rates Good
// (the grade FSRS wants) would never master anything and would sit at band 1
// forever, while pressing Easy on a card seen for the first time would be a free
// unlock. The second clause lets honest grading progress; the Easy clause remains
// a guaranteed escape hatch, which is what makes every Card masterable and so
// makes a hard deadlock impossible.
//
// review_logs is append-only, so mastery is permanently sticky — a later lapse can
// never re-lock a band the Learner already opened. (This is the load-bearing lesson
// from lib/thai/exam-pure.ts:14-24: gate on a sticky signal, never a live one.)
//
// PROBE (ts-fsrs v5.4.0, `npx tsx`, request_retention=0.85): ReviewLog.state is the
// state the Card was in BEFORE the review, not after.
//   NEW      + Again/Hard/Good  -> log.state=0 (New)       -> card.state=1 (Learning)
//   NEW      + Easy             -> log.state=0 (New)       -> card.state=2 (Review)
//   LEARNING + Good/Easy        -> log.state=1 (Learning)  -> card.state=2 (Review)
//   REVIEW   + Again            -> log.state=2 (Review)    -> card.state=3 (Relearning)
//   REVIEW   + Hard/Good/Easy   -> log.state=2 (Review)    -> card.state=2 (Review)
//   State enum: New=0, Learning=1, Review=2, Relearning=3
// So `log.state === 2` means "this review happened while the Card was graduated",
// which is exactly the evidence of retention we want. A first-sight Easy logs
// state=0 and is therefore admitted only by the Easy clause, as intended.
const STATE_REVIEW = 2;
const RATING_GOOD = 3;
const RATING_EASY = 4;

/** `priorState` is ReviewLog.state — the Card's state BEFORE this review. */
export function isMasteryLog(rating: number, priorState: number): boolean {
  if (rating === RATING_EASY) return true;
  return priorState === STATE_REVIEW && rating >= RATING_GOOD;
}

// === The ladder =============================================================
//
// unlocked(1) = true;  unlocked(B) = unlocked(B-1) AND bandPasses(B-1).
//
// Once false the ladder is false for every band above, so the unlocked set is
// always a PREFIX 1..K — a single scalar, never a set. Keep it that way: nothing
// in bandPasses may depend on a band other than its own.

/**
 * A band with no Cards passes. If it did not, an empty band would be an infinite
 * wall that pins the ladder forever with no action a Learner could take to clear
 * it — and refresh-seed-db.ts can empty a band by deleting Cards. This is why the
 * gate does NOT reuse Thai's isUnitUnlocked(percentMastered(...)), whose
 * percentMastered(0, 0) returns 0 and would fail an empty band.
 */
export function bandPasses(mastered: number, total: number): boolean {
  if (total === 0) return true;
  return mastered * 100 >= total * HSK_UNLOCK_THRESHOLD_PERCENT;
}

/** Cards needed to clear a band of `total` Cards. */
export function requiredToPass(total: number): number {
  return Math.ceil((total * HSK_UNLOCK_THRESHOLD_PERCENT) / 100);
}

/**
 * The single eligibility predicate, used by BOTH the queue and submitReview.
 *
 * A null band is ungated: an unlevelled Card can never be adjudicated, so it must
 * never be strandable. Note this cannot be safely re-expressed in SQL — `hsk_level
 * <= K` evaluates to UNKNOWN for NULL and silently drops those rows — which is
 * exactly why eligibility is decided here, in one place, and never in a WHERE clause.
 */
export function isCardEligible(
  hskLevel: number | null,
  unlockedBand: number,
): boolean {
  return hskLevel === null || hskLevel <= unlockedBand;
}

export interface GateCardRow {
  id: string;
  hskLevel: number | null;
  /** Has a review_states row for this Learner — i.e. has been introduced. */
  seen: boolean;
  /** Has a review_logs row satisfying isMasteryLog. */
  mastered: boolean;
}

export interface BandProgress {
  band: number;
  total: number;
  mastered: number;
  required: number;
  percentMastered: number;
  unlocked: boolean;
}

export interface HskGate {
  bands: BandProgress[];
  /** Highest unlocked band. New Cards are served from bands <= this (plus nulls). */
  unlockedBand: number;
  /** The next band to open, or null at the top of the ladder. */
  nextBand: number | null;
  /** The lowest band still under threshold — what actually blocks nextBand. */
  blockingBand: BandProgress | null;
  /** First unseen, eligible Card in deck order. Replaces the old Tier-2 query. */
  firstEligibleUnseenId: string | null;
  /** Unseen Cards the gate would actually serve. Replaces the raw `unseen` count. */
  eligibleUnseenCount: number;
}

/**
 * Derive the whole gate from one deck-ordered scan of the Learner's cards.
 * `rows` MUST already be sorted by deck_order — firstEligibleUnseenId is just the
 * first match, and the queue relies on that ordering (M9/A5).
 */
export function computeGate(rows: GateCardRow[]): HskGate {
  const totals = new Map<number, { total: number; mastered: number }>();
  for (const row of rows) {
    if (row.hskLevel === null) continue;
    const tally = totals.get(row.hskLevel) ?? { total: 0, mastered: 0 };
    tally.total += 1;
    if (row.mastered) tally.mastered += 1;
    totals.set(row.hskLevel, tally);
  }

  const passes = (band: number): boolean => {
    const tally = totals.get(band);
    // A band absent from the tally has no Cards at all, and must pass — see bandPasses.
    return bandPasses(tally?.mastered ?? 0, tally?.total ?? 0);
  };

  // K = the first band under threshold; every band above it is locked.
  //
  // This is the WHOLE gate. There is deliberately no "highest band already served"
  // high-water mark on top of it.
  //
  // An earlier version had one, to stop the gate from yanking away a band the
  // Learner was already working in. That protection was redundant and actively
  // harmful. Redundant, because a Card already in review_states is exempt from the
  // gate anyway — the gate only ever filters UNSEEN Cards, so nothing in progress can
  // be stranded (see the tier comments in queries.ts). Harmful, because the deck is
  // not band-ordered (an HSK 7-9 Card sits at deck position 63), so ordinary study
  // had already served the owner Cards from bands 2, 3, 4, 6 and 7 — the high-water
  // mark read that as "band 7 unlocked" and, since the ladder is a prefix, handed
  // them the entire deck. The gate was switched off for the only active Learner.
  let unlockedBand = MAX_HSK_BAND;
  for (let band = 1; band < MAX_HSK_BAND; band += 1) {
    if (!passes(band)) {
      unlockedBand = band;
      break;
    }
  }

  const bands: BandProgress[] = [];
  for (let band = 1; band <= MAX_HSK_BAND; band += 1) {
    const { total, mastered } = totals.get(band) ?? { total: 0, mastered: 0 };
    if (total === 0) continue;
    bands.push({
      band,
      total,
      mastered,
      required: requiredToPass(total),
      percentMastered: Math.round((mastered / total) * 100),
      unlocked: band <= unlockedBand,
    });
  }

  // Without a high-water mark the ladder is exact, so the band that blocks progress is
  // always the highest unlocked one — you are held at the first band you have not cleared.
  const nextBand = unlockedBand < MAX_HSK_BAND ? unlockedBand + 1 : null;
  const blockingBand =
    bands.find((b) => b.band === unlockedBand && !bandPasses(b.mastered, b.total)) ??
    null;

  const eligibleUnseen = rows.filter(
    (row) => !row.seen && isCardEligible(row.hskLevel, unlockedBand),
  );

  return {
    bands,
    unlockedBand,
    nextBand,
    blockingBand,
    firstEligibleUnseenId: eligibleUnseen[0]?.id ?? null,
    eligibleUnseenCount: eligibleUnseen.length,
  };
}

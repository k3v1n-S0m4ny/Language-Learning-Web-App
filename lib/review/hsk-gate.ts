// The HSK band gate: new Cards are only served from a band the Learner has
// unlocked, and a band unlocks once the band below it is fully mastered.
//
// Pure — no database access, no `@/lib/db` import (importing it constructs a
// neon() client at module load, which throws under `tsx --test`). Same rationale
// as lib/thai/exam-pure.ts. Every gate decision in the app is made here, so the
// queue and the Server Actions cannot drift apart.

// Relative, not "@/lib/ladder/ladder": this module must stay importable by
// `tsx --test`, which does not resolve the tsconfig path alias. Same constraint
// as lib/ladder/distractors.ts.
import { topStep } from "../ladder/ladder";

// 100, raised from 80 with the move to the ladder. Under FSRS "mastered" meant a
// rating pattern — Easy once, or Good on an already-graduated card — which a
// Learner could hit on a card they barely knew, so the bar had to sit below 100%
// to stay reachable. Reaching the top step of the ladder is a far harder and far
// more honest claim: five correct answers across three formats, ending in cold
// English→Chinese production. At that standard "you have learnt this band" means
// every card in it, and a partial bar would let genuinely unlearnt cards through.
//
// This is only safe BECAUSE unlocks are persisted (see hsk_unlocks in schema.ts).
// A live 100% computation would re-lock a cleared band the moment one card was
// seeded into it, halting study — see bandsToPersist below.
export const HSK_UNLOCK_THRESHOLD_PERCENT = 100;

// Bands 1-6 are as published; 7 is the merged "HSK 7-9" advanced band, which HSK
// itself does not subdivide. See the cards.hsk_level comment in lib/db/schema.ts.
export const MAX_HSK_BAND = 7;

export function hskLabel(band: number): string {
  return band === MAX_HSK_BAND ? "HSK 7-9" : `HSK ${band}`;
}

// === Mastery ================================================================
//
// A Card is mastered when it has reached the top step of the Mandarin ladder —
// English→Chinese production. Getting there takes five correct answers (two at
// multiple choice, two at recognition, then the promotion into production), and
// no lucky single rating can shortcut it.
//
// This replaces isMasteryLog, which read the append-only review_logs table and
// was therefore permanently sticky: a later lapse could not un-master a card.
// Reading `review_states.step` instead is a LIVE signal — a demotion out of the
// top step does reduce the mastered count. That reversal is deliberate and it is
// safe only because the UNLOCK is stored separately and never recomputed: the
// count can fall, the door it already opened cannot close. Gate on a sticky
// signal, never a live one (lib/thai/exam-pure.ts:14-24) — here the sticky signal
// is the hsk_unlocks row, not the step.
const MANDARIN_TOP_STEP = topStep("mandarin");

/** `step` is review_states.step, or null when the Card has never been introduced. */
export function isMastered(step: number | null): boolean {
  return step !== null && step >= MANDARIN_TOP_STEP;
}

// === The ladder =============================================================
//
// unlocked(1) = true;  unlocked(B) = unlocked(B-1) AND (bandPasses(B-1) OR stored(B)).
//
// Once false the ladder is false for every band above, so the unlocked set is
// always a PREFIX 1..K — a single scalar, never a set. Keep it that way: nothing
// in bandPasses may depend on a band other than its own.

/**
 * A band with no Cards passes. If it did not, an empty band would be an infinite
 * wall that pins the ladder forever with no action a Learner could take to clear
 * it — and refresh-seed-db.ts can empty a band. This is why the gate does NOT
 * reuse Thai's isUnitUnlocked(percentMastered(...)), whose percentMastered(0, 0)
 * returns 0 and would fail an empty band.
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
 * The single eligibility predicate, used by BOTH the round builder and the
 * submit action.
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
  /**
   * The Learner's ladder position on this Card, or null when no review_states
   * row exists — which is also what "unseen" means, so the two are one field.
   */
  step: number | null;
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
  /** Unseen, eligible Cards in deck order — the round's new-card supply. */
  eligibleUnseenIds: string[];
  /**
   * Bands that have just been EARNED and are not yet recorded in hsk_unlocks.
   * The caller writes these (from a Server Action, never from a render). See the
   * derivation below for why an unlock earned from an empty band is not included.
   */
  bandsToPersist: number[];
}

/**
 * Derive the whole gate from one deck-ordered scan of the Learner's cards plus
 * their recorded unlocks.
 *
 * `rows` MUST already be sorted by deck_order — eligibleUnseenIds is just the
 * matches in order, and the round relies on that to introduce cards in deck-file
 * sequence.
 *
 * `storedUnlocks` are the bands already written to hsk_unlocks. They are ORs, not
 * overrides: a stored band is open whatever the live counts say, which is the
 * whole point of storing them.
 */
export function computeGate(
  rows: GateCardRow[],
  storedUnlocks: Iterable<number> = [],
): HskGate {
  const stored = new Set(storedUnlocks);

  const totals = new Map<number, { total: number; mastered: number }>();
  for (const row of rows) {
    if (row.hskLevel === null) continue;
    const tally = totals.get(row.hskLevel) ?? { total: 0, mastered: 0 };
    tally.total += 1;
    if (isMastered(row.step)) tally.mastered += 1;
    totals.set(row.hskLevel, tally);
  }

  const tallyFor = (band: number) => totals.get(band) ?? { total: 0, mastered: 0 };
  const passes = (band: number): boolean => {
    const { mastered, total } = tallyFor(band);
    // A band absent from the tally has no Cards at all, and must pass — see bandPasses.
    return bandPasses(mastered, total);
  };

  // K = the first band that neither passes live nor has its successor already
  // recorded; every band above it is locked.
  //
  // There is deliberately no "highest band already served" high-water mark on top
  // of this. An earlier version had one, and it was both redundant (a Card already
  // in review_states is exempt from the gate anyway — the gate only ever filters
  // UNSEEN Cards) and harmful: the deck is not band-ordered, so ordinary study had
  // served the owner Cards from bands 2, 3, 4, 6 and 7, the high-water mark read
  // that as "band 7 unlocked", and the ladder being a prefix it handed over the
  // whole deck. hsk_unlocks is the sanctioned replacement — it records bands
  // actually EARNED, not bands merely encountered.
  let unlockedBand = MAX_HSK_BAND;
  for (let band = 1; band < MAX_HSK_BAND; band += 1) {
    if (passes(band) || stored.has(band + 1)) continue;
    unlockedBand = band;
    break;
  }

  const bands: BandProgress[] = [];
  for (let band = 1; band <= MAX_HSK_BAND; band += 1) {
    const { total, mastered } = tallyFor(band);
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

  // The band that blocks progress is the highest unlocked one — you are held at
  // the first band you have not cleared. A band held open only by a stored unlock
  // is not blocking anything, so this reads the live counts.
  const nextBand = unlockedBand < MAX_HSK_BAND ? unlockedBand + 1 : null;
  const blockingBand =
    bands.find((b) => b.band === unlockedBand && !bandPasses(b.mastered, b.total)) ??
    null;

  // Which unlocks are worth writing down.
  //
  // Only a band EARNED by clearing a non-empty band below it. An unlock that
  // exists only because the band below is empty is left unrecorded on purpose:
  // persisting it would mean seeding that empty band later could never gate
  // anything, because the door above it was already nailed open. Empty bands
  // still unlock live (bandPasses), they just do not become permanent facts.
  const bandsToPersist: number[] = [];
  for (let band = 2; band <= unlockedBand; band += 1) {
    if (stored.has(band)) continue;
    const below = tallyFor(band - 1);
    if (below.total > 0 && bandPasses(below.mastered, below.total)) {
      bandsToPersist.push(band);
    }
  }

  const eligibleUnseenIds = rows
    .filter((row) => row.step === null && isCardEligible(row.hskLevel, unlockedBand))
    .map((row) => row.id);

  return {
    bands,
    unlockedBand,
    nextBand,
    blockingBand,
    eligibleUnseenIds,
    bandsToPersist,
  };
}

// The scheduler. This replaces ts-fsrs entirely: there is no memory model, no
// per-card stability or difficulty, and nothing is trained. A card that passes
// at its top step moves one rung up a fixed table and is scheduled that many
// days out.
//
// Growth is 3x per rung, chosen over FSRS's ~0.85-retention curve deliberately:
// fewer reviews, faster deck throughput, accepting that a hard card and an easy
// card now receive identical treatment. Binary grading gives the scheduler no
// signal to tell them apart, so the safety net is the `demotions` counter rather
// than the interval itself.
//
// Rungs are days, never hours. Sub-day intervals only existed to serve FSRS
// learning steps, and the ladder replaces those with in-session climbing: a card
// mid-climb is re-served within the same round, so it never needs a due date
// measured in minutes.
export const INTERVAL_RUNG_DAYS = [1, 3, 9, 27, 81, 243, 729] as const;

export const MAX_RUNG = INTERVAL_RUNG_DAYS.length - 1;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days a card is scheduled out at `rung`, clamped to the table's ends. */
export function intervalDaysForRung(rung: number): number {
  const clamped = Math.min(Math.max(rung, 0), MAX_RUNG);
  return INTERVAL_RUNG_DAYS[clamped];
}

/** The rung a card moves to after a top-step pass. Saturates at the cap. */
export function nextRung(rung: number): number {
  return Math.min(rung + 1, MAX_RUNG);
}

export function dueFromRung(now: Date, rung: number): Date {
  return new Date(now.getTime() + intervalDaysForRung(rung) * DAY_MS);
}

// A card is "mature" once its schedule has stretched past three weeks — rung 3,
// which is 27 days. The 21-day line is the SRS convention and is what the stats
// page reported under FSRS (scheduled_days >= 21); rung 3 is the first rung that
// clears it, so the figure keeps meaning the same thing across the change.
//
// Note a card is only ever ABOVE rung 0 after it has passed at its top step, so
// maturity implies graduation and cannot be claimed mid-climb.
export const MATURE_RUNG = 3;

export function isMature(rung: number): boolean {
  return rung >= MATURE_RUNG;
}

// Pure mastery/unlock rules for the Read-Thai course (M11). No FSRS — mastery
// here is the simple "3-correct-in-a-row" rule from the plan's Appendix.

export const MASTERY_STREAK = 3;
export const UNLOCK_THRESHOLD_PERCENT = 90;
export const DRILL_ROUND_SIZE = 15;

// Applying one attempt to an existing (streak, masteredAt) pair.
export function applyAttempt(
  current: { streak: number; masteredAt: Date | null },
  correct: boolean,
  now: Date,
): { streak: number; masteredAt: Date | null; newlyMastered: boolean } {
  if (!correct) {
    return { streak: 0, masteredAt: current.masteredAt, newlyMastered: false };
  }
  const streak = current.streak + 1;
  const wasMastered = current.masteredAt !== null;
  if (streak >= MASTERY_STREAK && !wasMastered) {
    return { streak, masteredAt: now, newlyMastered: true };
  }
  return { streak, masteredAt: current.masteredAt, newlyMastered: false };
}

export function percentMastered(masteredCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.round((masteredCount / totalCount) * 100);
}

export function isUnitUnlocked(previousUnitPercent: number): boolean {
  return previousUnitPercent >= UNLOCK_THRESHOLD_PERCENT;
}

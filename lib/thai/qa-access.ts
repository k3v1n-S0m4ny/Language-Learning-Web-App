// Owner-approved, INTENTIONALLY PERMANENT QA progression bypass, scoped to
// exactly one email. This ships to production (not a temporary dev-only
// flag): the owner's own account gets every built Read-Thai unit unlocked,
// bypassing the 90%-mastery gate (lib/thai/mastery.ts's isUnitUnlocked),
// so any unit can be QA'd without grinding through prerequisites. Real
// mastery numbers (percentMastered, masteredItems, lessonComplete) are never
// touched — only the exposed `unlocked` flag is overridden, and only for
// this exact email. No other account is affected.
export const THAI_QA_UNLOCK_EMAIL = "k3v1n@arisadesiam.com";

export function isThaiQaUnlockEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === THAI_QA_UNLOCK_EMAIL;
}

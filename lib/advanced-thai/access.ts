// Advanced Thai is the owner's PERSONAL course — unlike Read-Thai (shared with
// two beta testers) and Mandarin (shared with the other learner), no one else
// sees it. This is an allowlist, not a cap: an account is either in or it is
// not, and everything else 404s.
//
// Enforcement is server-side at every Advanced-Thai route, and does not depend
// on the UI hiding anything. Mirrors the single-email pattern already used by
// lib/thai/qa-access.ts.
//
// Note the direction of the check. lib/access.ts's isRestrictedLearner() is a
// DENY-list — it names the two beta testers so they can be kept out of Mandarin.
// Adding Advanced Thai to that list would work today, but it would mean any
// future account is admitted by DEFAULT, which is the wrong failure mode for a
// personal course. So this is an ALLOW-list: unknown accounts are refused.
const ADVANCED_THAI_EMAILS = new Set<string>(["k3v1n@arisadesiam.com"]);

export function isAdvancedThaiLearner(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADVANCED_THAI_EMAILS.has(email.trim().toLowerCase());
}

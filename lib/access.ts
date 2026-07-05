// Restricted beta learners (owner-approved, ships to production). These
// accounts may sign in — they're in ALLOWED_EMAILS (see auth.ts) — but are
// scoped to the Read-Thai course ONLY (no Mandarin flow) and capped at Thai
// unit 2 while units 3+ are still under construction. Mirrors the per-email
// pattern of lib/thai/qa-access.ts.
//
// Enforcement is server-side and does not rely on the UI: app/page.tsx forces
// the Thai home for these accounts, app/stats (Mandarin stats) redirects them
// away, setActiveMode refuses to store "mandarin", and the Thai lesson/drill
// routes not-found any unit above the cap. Hiding the mode toggle and locking
// units 3+ on the map is UI polish layered on top of those guards.
//
// When a unit ships for these testers, raise RESTRICTED_THAI_MAX_UNIT; to give
// an account full access, remove it from this set.
const RESTRICTED_LEARNER_EMAILS = new Set<string>([
  "prancer@gmail.com",
  "goonerrafat@gmail.com",
]);

// Highest Thai unit these accounts may open (lesson or drill). Units above this
// return not-found and render locked ("In construction") on the unit map.
export const RESTRICTED_THAI_MAX_UNIT = 2;

export function isRestrictedLearner(email: string | null | undefined): boolean {
  if (!email) return false;
  return RESTRICTED_LEARNER_EMAILS.has(email.trim().toLowerCase());
}

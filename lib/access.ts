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

// Thai units 1..RESTRICTED_THAI_MAX_UNIT are always open to these accounts. The
// single unit just past the ceiling opens the moment the tester FINISHES the
// previous unit (its `unlocked` flag flips true at 90% mastery) — so unit 3
// unlocks on completing unit 2. Everything higher returns not-found and renders
// locked ("In construction") on the unit map. Bump this ceiling as each further
// unit is polished for testers.
export const RESTRICTED_THAI_MAX_UNIT = 2;

export function isRestrictedLearner(email: string | null | undefined): boolean {
  if (!email) return false;
  return RESTRICTED_LEARNER_EMAILS.has(email.trim().toLowerCase());
}

// Whether a restricted tester may open `unit` (lesson or drill). `unitUnlocked`
// is that unit's own `summary.unlocked` — true once the previous unit is
// finished. Units at/below the always-open ceiling are open unconditionally;
// the one unit just past it opens only once unlocked; everything higher is
// closed. Non-restricted learners never go through this — callers guard on
// isRestrictedLearner first.
export function restrictedUnitOpen(unit: number, unitUnlocked: boolean): boolean {
  if (unit <= RESTRICTED_THAI_MAX_UNIT) return true;
  if (unit === RESTRICTED_THAI_MAX_UNIT + 1) return unitUnlocked;
  return false;
}

# Handoff: Read-Thai QA Unlock (email-gated progression bypass)
Agent: implementer | Date: 2026-07-04 | Status: COMPLETE

## Completed
- `lib/thai/qa-access.ts` (new) — `THAI_QA_UNLOCK_EMAIL = "k3v1n@arisadesiam.com"` and `isThaiQaUnlockEmail(email)`, which trims + lowercases the input and compares against the constant; returns `false` for null/undefined/empty. Top comment documents this as an owner-approved, intentionally-permanent QA bypass shipping to prod.
- `lib/thai/queries.ts` (modified) — `getUnitSummaries(learnerId)` now imports `auth` from `@/auth` and `isThaiQaUnlockEmail` from `./qa-access`. At the top of the function it resolves `const session = await auth(); const qaUnlockAll = isThaiQaUnlockEmail(session?.user?.email);`. For regular built units (the `unitMasteryStats` branch), the pushed summary's `unlocked` field becomes `qaUnlockAll ? true : unlocked` while the `previousUnitUnlocksNext` propagation on the next line still uses the real, un-overridden `unlocked` value (`previousUnitUnlocksNext = unlocked && isUnitUnlocked(pct);` — unchanged). `percentMastered`, `masteredItems`, `lessonComplete` are untouched. Unit 1 (lesson-only) was already unconditionally `unlocked: true`, so no change was needed there; unbuilt units still push `unlocked: false` unconditionally (also unaffected, per spec — "for BUILT units only"). Added a comment above the `auth()` call explaining why resolving session here is safe (every caller is request-scoped; a missing/other session yields `qaUnlockAll = false`, i.e. normal gating).
- `lib/thai/qa-access.test.ts` (new) — `node:test` + `node:assert/strict`, matching `lib/mandarin/tone-sandhi.test.ts`'s import/run style. 6 cases: exact match true; case-insensitive + surrounding-whitespace match true; a different email false; empty string false; null false; undefined false.

No other file was touched. Function signatures of `getUnitSummaries`/`getUnitSummary` are unchanged; no new params threaded through any caller — the auth()-inside approach closes every enforcement path (`thai-home.tsx`, drill/lesson page guards, `submitThaiAttempt`'s gate, the drill-summary snapshot) automatically since they all funnel through `getUnitSummaries`.

## Left Undone
Nothing — all steps in the task spec were implemented as described.

## Commands Run
- `npm test` — exit 0
  ```
  ✔ undefined returns false (0.0727ms)
  ℹ tests 30
  ℹ suites 0
  ℹ pass 30
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 359.9834
  ```
  (includes the 6 new `qa-access.test.ts` cases: "exact match returns true", "case-insensitive + surrounding-whitespace match returns true", "a different allowed-learner-style email returns false", "empty string returns false", "null returns false", "undefined returns false" — all passed, all pre-existing 24 tests also still pass.)

- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  (no warnings/errors emitted)

- `npm run build` — exit 0
  ```
  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats


  ƒ Proxy (Middleware)

  ○  (Static)   prerendered as static content
  ƒ  (Dynamic)  server-rendered on demand
  ```
  (build included the pre-existing two-lockfile Turbopack "inferred workspace root" warning near the top of output — expected/harmless per task instructions, left untouched.)

Exit codes were re-verified explicitly in a follow-up combined run: `test exit: 0`, `lint exit: 0`, `build exit: 0`.

## Issues Discovered
None. The architecture note in the task prompt was accurate: `getUnitSummaries` is genuinely the single funnel for unlock state across the unit map, both render guards, the drill-submission gate, and the drill-summary snapshot, so overriding it in one place closes all four paths without touching any of those call sites.

## Spec Deviations
None. Implemented exactly as specified:
- Constant + predicate function signatures match the spec verbatim.
- Override applied only to built, non-lesson-only units' exposed `unlocked` field.
- `previousUnitUnlocksNext` propagation math intentionally left keyed off the real (non-overridden) `unlocked` value, per the explicit instruction not to touch that math.
- No signature changes to `getUnitSummaries`/`getUnitSummary`; no new params threaded through callers.
- Did not touch the DB, run migrations, or run any seed script.

## Procedure Compliance
- Plan consulted before coding: yes (read `.claude/plans/active-plan.md` — a Phase 0 glass-redesign plan unrelated to this QA-unlock task; this task's own spec was supplied directly in the prompt and followed exactly; also read `lib/thai/queries.ts`, `lib/thai/types.ts`, `lib/thai/actions.ts`, `auth.ts`, and `lib/mandarin/tone-sandhi.test.ts` for conventions before writing any code)
- Tests run before finishing: yes — `npm test` exit 0, `30 pass, 0 fail` (verbatim above)
- Handoff written: yes (this file)

## Note on unrelated working-tree changes
`git status` at the end of this task also shows modifications to `.claude/agent-memory/code-reviewer/MEMORY.md`, `.claude/plans/glass-redesign.handoff.md`, and two new untracked `.claude/agent-memory/code-reviewer/feedback_*.md` files. These were already present in the working tree before this task started (per the session's initial `gitStatus` snapshot) and were NOT touched by this implementation — only `lib/thai/queries.ts` (modified) and `lib/thai/qa-access.ts` / `lib/thai/qa-access.test.ts` (new) are this task's changes. Left uncommitted per instructions; orchestrator will review then commit.

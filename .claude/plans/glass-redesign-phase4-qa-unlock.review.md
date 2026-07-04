# Review Summary - Read-Thai QA Unlock (email-gated progression bypass)

## Result
PASS

## Files Reviewed
- `lib/thai/qa-access.ts` (new)
- `lib/thai/qa-access.test.ts` (new)
- `lib/thai/queries.ts` (modified — `getUnitSummaries`/`getUnitSummary`)
- `lib/thai/actions.ts` (`submitThaiAttempt`, `getUnitProgressSnapshot` — blast-radius check)
- `lib/thai/mastery.ts` (`isUnitUnlocked`, `percentMastered` — unchanged, confirmed)
- `app/thai/[unit]/drill/page.tsx` (render guard — blast-radius check)
- `app/thai/[unit]/lesson/page.tsx` (render guard — blast-radius check)
- `components/thai/thai-home.tsx`, `components/thai/unit-row.tsx` (home-screen render path — blast-radius check)
- `app/page.tsx` (learnerId derivation — confirmed session-scoped, not spoofable)
- `auth.ts` (ALLOWED_EMAILS gate — confirmed the QA email is a legitimately signed-in account)
- `.env.local` (confirmed `ALLOWED_EMAILS` contains `k3v1n@arisadesiam.com, b3nz@arisadesiam.com` — QA email is a real allowed learner, second learner is a distinct exact string that cannot match)
- `.claude/plans/glass-redesign-phase4-qa-unlock.impl.md` (handoff)

## Findings
### CRITICAL
None.

### HIGH
None.

### MEDIUM
None.

### LOW
- `lib/thai/queries.ts:138-144` — `getUnitSummary(learnerId, unit)` calls `getUnitSummaries` (full 14-unit computation + a fresh `auth()` resolution) just to return one element. This is pre-existing behavior, not introduced by this diff (the function already fully recomputed before this change), so not a regression — noting only as residual perf overhead if `getUnitSummary` is ever called in a hot path.
- `lib/thai/qa-access.ts` header comment is unusually long for a 5-line file; acceptable given the security sensitivity and the explicit "why permanent" justification requested by the owner.

## Assertions Checked

**A1 — Strict scoping (email match cannot false-positive):** PASS.
`isThaiQaUnlockEmail` (`lib/thai/qa-access.ts:11-14`) returns `false` on falsy input, otherwise does `email.trim().toLowerCase() === THAI_QA_UNLOCK_EMAIL`, an exact string equality against the lowercase literal `"k3v1n@arisadesiam.com"` — no substring/regex/`includes` match, so lookalike or superstring emails (e.g. `notk3v1n@arisadesiam.com`, `k3v1n@arisadesiam.com.evil.com`) cannot match. Verified test coverage: exact match, case+whitespace variant, a different real-shaped email, `""`, `null`, `undefined` — all 6 pass (re-ran independently, see Commands). Cross-checked against `.env.local`'s `ALLOWED_EMAILS`: the *only* other allowed learner (`b3nz@arisadesiam.com`) is a different exact string and cannot match under any trim/case transform. No Unicode-homoglyph risk beyond what any `===` string comparison already has (no normalization bug introduced).

**A2 — Complete coverage / no bypass gap:** PASS.
Grepped the full repo for `isUnitUnlocked`, `getUnitSummary`, and `.unlocked` usage. Every consumer of unlock state resolves it from `getUnitSummaries`/`getUnitSummary`, with no independent re-implementation of the 90% check found:
- `app/thai/[unit]/drill/page.tsx:28-32` — `current?.unlocked` from `getUnitSummaries`.
- `app/thai/[unit]/lesson/page.tsx:63,110` — `summary?.unlocked` from `getUnitSummary`.
- `components/thai/thai-home.tsx:17` → `components/thai/unit-row.tsx:12-13` — pure prop-drilled render, `locked = !built || !unlocked`, no recomputation.
- `lib/thai/actions.ts:171-173` (`submitThaiAttempt`) — re-derives the *gating unit* server-side (correctly, since some drill types are gated by a later unit than the item's home unit) but the actual lock/unlock decision itself comes from `gatingUnitSummary?.unlocked`, i.e. `getUnitSummaries`. No independent 90% check.
- `lib/thai/actions.ts:257-263` (`getUnitProgressSnapshot`) — `next?.unlocked` from `getUnitSummaries`.
`isUnitUnlocked` (the actual 90%-threshold function, `lib/thai/mastery.ts:36-38`) is called in exactly one place in the whole repo outside its own definition: `lib/thai/queries.ts:132`, which is the line computing the *real* `previousUnitUnlocksNext` propagation, not the exposed override. `scripts/seed-thai-db.ts` was checked and does NOT call `getUnitSummaries` (only a comment references it); it computes its own regression-guard stats directly from `unitMasteryStats`/`reachability.ts`, so it is unaffected by and does not bypass this change. No other file computes lock state independently. `getUnitSummaries` is confirmed the single chokepoint.

**A3 — Mastery math not distorted:** PASS.
`lib/thai/queries.ts:116-132`: `total`, `masteredCount`, `pct` (`percentMastered`) are computed once from `unitMasteryStats`/`percentMastered` before the override is applied and are never touched by `qaUnlockAll`. The pushed summary's `masteredItems: masteredCount` and `percentMastered: pct` (lines 124-126) are the real, unmodified values. Only line 127's `unlocked: qaUnlockAll ? true : unlocked` is overridden. Line 132's propagation, `previousUnitUnlocksNext = unlocked && isUnitUnlocked(pct)`, reads the local `const unlocked` (line 118, `= previousUnitUnlocksNext`, the REAL computed value), not the overridden field written into the summary object — confirmed by reading the variable reference directly (it is not `summaries[summaries.length-1].unlocked`, it is the separate local binding). This means the QA account's own real progression state continues to compute exactly as it would without the override; only the *displayed/enforced* flag is force-true. `lessonComplete: true` (line 129, built-unit lessons always readable per A4) is unconditional and predates this change — not affected either way.

**A4 — No unintended prod exposure beyond intent:** PASS.
The override key (`qaUnlockAll`) can only become `true` via `isThaiQaUnlockEmail(session?.user?.email)`, which requires a resolved NextAuth session with a matching email (A1). Unauthenticated visitors get `session === null` → `session?.user?.email === undefined` → `false`. Any other authenticated learner (in practice, only `b3nz@arisadesiam.com` per `ALLOWED_EMAILS`, since `auth.ts`'s `signIn` callback rejects everyone else at the OAuth layer) gets `false`. No broader scoping (no domain-wildcard, no substring, no env-var-driven list) exists — it is a single hardcoded literal.

**A5 — auth() coupling safe:** PASS.
All real callers of `getUnitSummaries`/`getUnitSummary` are request-scoped: three Server Components (`app/thai/[unit]/drill/page.tsx`, `app/thai/[unit]/lesson/page.tsx`, `components/thai/thai-home.tsx`, itself rendered from `app/page.tsx` which already calls `auth()` per-request) and two Server Actions (`lib/thai/actions.ts`'s `submitThaiAttempt`, `getUnitProgressSnapshot`). No build-time, script, or cron caller exists — `scripts/seed-thai-db.ts` was specifically checked and does not import or call either function. A null/missing session yields `qaUnlockAll = false`, i.e. normal gating is preserved, confirmed by code reading and by the existing test suite's other-email/null/undefined cases passing. No `unstable_cache`/`revalidate` wrapper was found around `getUnitSummaries` or its callers, so there is no risk of the QA-unlocked view being cached and served to a different user.

## Commands Run
All re-run independently (fresh shell), not copied from the implementer's pasted output.

- `npm test` — exit 0
  ```
  ✔ exact match returns true (0.8214ms)
  ✔ case-insensitive + surrounding-whitespace match returns true (0.2321ms)
  ✔ a different allowed-learner-style email returns false (0.1001ms)
  ✔ empty string returns false (0.0879ms)
  ✔ null returns false (0.2997ms)
  ✔ undefined returns false (0.135ms)
  ℹ tests 30
  ℹ pass 30
  ℹ fail 0
  ℹ duration_ms 289.6986
  ```
  Matches implementer's claimed 30/30 pass. No disagreement.

- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  No warnings/errors. Matches implementer's claim.

- `npm run build` — exit 0
  ```
  ⚠ Warning: Next.js inferred your workspace root... (pre-existing two-lockfile warning, harmless, matches expectation)
  ▲ Next.js 16.2.6 (Turbopack)
  ✓ Compiled successfully in 6.2s
    Running TypeScript ...
    Finished TypeScript in 5.5s ...
  ✓ Generating static pages using 10 workers (6/6) in 666ms
  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ```
  Matches implementer's claim. No disagreement.

- `git status --short` — confirmed the working-tree diff is exactly: modified `lib/thai/queries.ts`; new `lib/thai/qa-access.ts`, `lib/thai/qa-access.test.ts`, plus the pre-existing unrelated `.claude/*` memory/handoff files the implementer flagged as untouched-by-them (verified: these are agent-memory/plan bookkeeping files from a prior review round, not part of this feature's blast radius).

## Residual Risk
- None blocking. The override is a single hardcoded exact-match literal gating a single `boolean` field, mechanically isolated to one line (`queries.ts:127`), with the propagation math (line 132) reading the real pre-override value. All four enforcement surfaces (unit map, lesson-page CTA, drill-page render guard, drill-submission server action) were independently traced back to the same funnel and none re-implements the threshold check.
- Not independently tested: an actual live sign-in as `k3v1n@arisadesiam.com` against the real Google OAuth flow in a deployed environment (would require live credentials/session; out of scope for static code review). The unit-level proof (A1–A5) is exhaustive at the code level but this is worth a one-time manual smoke test in prod after deploy, per the owner's normal QA practice.
- `scripts/seed-thai-db.ts`'s regression guard computes unlock-deadlock detection from `unitMasteryStats` directly, not `getUnitSummaries` — this was already true before this change and is unaffected by it, but worth knowing the seed script's invariant check is not itself QA-unlock-aware (nor does it need to be, since it never runs as the QA-unlock learner).

## Procedure Compliance
- Plan/spec consulted before review: yes (read the task's assertions list plus `.claude/plans/glass-redesign-phase4-qa-unlock.impl.md`)
- Implementation summary read: yes
- Every changed file read in full: yes, plus all four downstream consumers and `auth.ts`/`.env.local` for blast-radius verification
- Commands re-run independently (not trusting pasted output): yes — `npm test`, `npm run lint`, `npm run build`, all exit 0, all consistent with the implementer's claims (no discrepancy found)
- Review summary written: yes

# Review Summary — Unit 2 Flashcard Pilot (Read-Thai)

## Result
PASS

## Re-review pass (round 2)
Coordinator reported fixes for both the round-1 CRITICAL and MEDIUM findings. Re-checked adversarially — read the actual diffs myself against `origin/main`, did not trust the message — then re-ran every gate command fresh.

1. **CRITICAL (empty-queue crash) — RESOLVED, confirmed.**
   `components/thai/drill/flashcard-session.tsx` now has an explicit guard between the `if (summary) {...}` block and the main render:
   ```
   if (!current) {
     return (
       <div className="rounded-[var(--r-lg)] border border-border-base bg-surface p-6 text-sm text-foreground-muted">
         Finishing…
       </div>
     );
   }
   ```
   This sits exactly in the gap I flagged: after `setQueue(rest)` (rest=[]) commits its own render but before `getUnitProgressSnapshot`'s result lands in `summary`. Traced the render order by hand again: `if (summary)` is checked first (so once the snapshot arrives, "Deck cleared" renders correctly, not stuck on "Finishing…"), and `if (!current)` is checked second, before line ~123's `current.glyph` dereference — so the crash path is gone. I did not find a case where `!current` is reachable outside this exact completion window (the "Missed it" branch always rotates rather than shrinking the queue, so `current` stays defined there). One residual, non-blocking gap: if `getUnitProgressSnapshot` itself throws (network error), there's still no try/catch, so the UI would be stuck on "Finishing…" forever rather than erroring — but that's a pre-existing gap shared with `DrillSession`'s identical unguarded `await getUnitProgressSnapshot(unit)` call, not a regression introduced by this fix, and not something the original finding asked to fix.

2. **MEDIUM (grandfather applied at only one site) — RESOLVED, confirmed.**
   `isRequiredTypeMastered(masteredSet, requiredType)` (`lib/thai/reachability.ts`) is now the single definition of the letter-sound → letter-read alias (`masteredSet.has(requiredType) || (requiredType === "letter-read" && masteredSet.has("letter-sound"))`), and all three consumers I flagged now route through it:
   - `unitMasteryStats` (reachability.ts) — the old ad-hoc `unit === 2` branch is gone; it's now `requiredTypes.every((dt) => isRequiredTypeMastered(masteredSet, dt))` unconditionally, so behavior for every other unit is provably unchanged (plain `masteredSet.has(dt)` whenever `dt !== "letter-read"`).
   - `buildDrillRound` sampling weight (`lib/thai/drill.ts:1063-1067`) — now builds `masteredSet` from the learner's progress rows and calls the same helper; a legacy-mastered unit-2 consonant now correctly weights as `fullyMastered` even without a `letter-read` row.
   - `submitThaiAttempt`'s `itemFullyMastered`/`newlyMastered` (`lib/thai/actions.ts:230-246`) — the DB query for "other required types" now explicitly widens to include `"letter-sound"` whenever `"letter-read"` is required (`queryTypes`), so the legacy row is actually fetched before the helper is applied; without this widening the helper alone couldn't have fixed it (the row would never have been queried), so this is the correct fix, not just a cosmetic wrapper.
   - Verified the alias is one-directional (letter-sound does NOT get satisfied by letter-read; other required types never accept the alias) both via the new test and via my own probe (below) — matches the intent ("both measure the same competency" only in the legacy→new direction).

## Files Reviewed (cumulative, both passes)
- lib/thai/reachability.ts
- lib/thai/types.ts
- lib/thai/drill.ts
- lib/thai/flashcards.ts
- lib/thai/actions.ts
- components/thai/drill/flashcard-session.tsx
- components/thai/drill/drill-session.tsx (comparison baseline for the completion-race pattern)
- app/thai/[unit]/drill/page.tsx
- lib/thai/flashcard-mastery.test.ts (re-read this pass — new `isRequiredTypeMastered` test)
- lib/thai/queries.ts, lib/thai/mastery.ts, lib/db/schema.ts (dependency check)
- seed/thai/items.ts (unit-2 content shape check)
- lib/thai/actions.ts, lib/thai/drill.ts, lib/thai/reachability.ts (re-read this pass — full diff of both fixes against origin/main)

## Findings

### CRITICAL
- None open. (Round 1: empty-queue crash in `flashcard-session.tsx` on clearing the last card — RESOLVED, see re-review pass above.)

### MEDIUM
- None open. (Round 1: grandfather clause applied only to `unitMasteryStats`, inconsistent with `allReachableDrillTypesForItem` consumers — RESOLVED, see re-review pass above.)

### LOW (carried forward, non-blocking)
- **`lib/thai/actions.ts:265`** — the `item.kind !== "consonant"` check in `submitFlashcardGrade` is currently unreachable dead-code protection (every unit-2 item is `kind: "consonant"`, confirmed against `seed/thai/items.ts:26-34`); cheap, correct defense-in-depth, no action needed.
- **`lib/thai/drill.ts:44-49`** (`"letter-read": ["consonant"]` in `VALID_KINDS_FOR_DRILL_TYPE`) — confirmed genuinely inert (no `case "letter-read"` in `expectedAnswerFor`, and `KNOWN_DRILL_TYPES` excludes it from `submitThaiAttempt`); no exploit path.
- **No RTL/component test for the flashcard client loop.** The new `isRequiredTypeMastered` unit test is good, targeted coverage for the MEDIUM fix, but the CRITICAL fix (the `!current` guard) still has no automated test — the pure-function suite can't exercise React render timing. A React Testing Library test simulating "grade the last card with a delayed/mocked `getUnitProgressSnapshot`, assert no throw and 'Finishing…' or the summary eventually renders" would close this gap. Not blocking (I independently traced the render order by hand and consider the fix correct), but worth adding before this pilot gets more usage.
- **`getUnitProgressSnapshot` failure path.** If that call rejects, `FlashcardSession` is stuck on "Finishing…" indefinitely with no retry/error UI — pre-existing pattern shared with `DrillSession`, not a regression from either fix, not blocking this review.

## Assertions Checked
- **A1 (self-report can't be abused to unlock beyond the rules): PASS** (unchanged from round 1 — this code path wasn't touched by either fix).
- **A2 (unlock math: clearing all 9 → 100% → unit 3 unlocks; grandfather doesn't over/under-count the gate itself): PASS.** Re-verified independently this pass (probe below) against the refactored `isRequiredTypeMastered`-based `unitMasteryStats` — identical results to round 1 (unit 2: 100% max-achievable, grandfather test passes, cross-unit-only fixture correctly rejected).
- **A3 (no dangling unit-2 MCQ code path): PASS** (unchanged).
- **A4 (seed-time invariants still hold after the refactor): PASS** — re-ran the guard functions fresh against `ALL_THAI_ITEMS` post-fix (see Commands Run): all 13 drilled units still show 100% max-achievable / 0 orphans, `assertUnitMasteryScopingGuard` still passes.
- **A5 (client loop correctness): PASS** — the `!current` guard closes the exact race identified in round 1; traced render ordering by hand (see re-review pass notes) and found no remaining path where `current.glyph` is dereferenced while `current` is `undefined`.
- **New assertion this pass — grandfather consistency across all mastery-check call sites: PASS.** All three consumers (`unitMasteryStats`, `buildDrillRound` weight, `submitThaiAttempt` badge) now route through the single `isRequiredTypeMastered` definition; confirmed `submitThaiAttempt`'s DB query was also widened (`queryTypes`) so the legacy row is actually fetched, not just theoretically eligible for the helper.

## Commands Run (this re-review pass — fresh, not trusting the coordinator's claims)
- `npm test` — exit 0:
  ```
  ✔ isRequiredTypeMastered: legacy letter-sound satisfies letter-read, nothing else does (0.1082ms)
  ...
  ℹ tests 37
  ℹ pass 37
  ℹ fail 0
  ```
  Agrees with the coordinator's claimed 37/37 (36 + 1 new helper test).
- `npx tsc --noEmit` — exit 0, no output. Agrees with coordinator's claim.
- `npx eslint app/thai/[unit]/drill/page.tsx components/thai/drill/flashcard-session.tsx lib/thai/actions.ts lib/thai/drill.ts lib/thai/flashcards.ts lib/thai/reachability.ts lib/thai/types.ts lib/thai/flashcard-mastery.test.ts` — exit 0, no output. Agrees with coordinator's claim.
- Independent probe (scratch `.ts` file inside the repo for import resolution, deleted after use; confirmed via `git status --porcelain` that nothing but the reviewed diff remains): re-ran `maxAchievablePercentForUnit`/`findUnreachableDrillableIds` for all 13 `DRILLED_UNITS` plus `assertUnitMasteryScopingGuard`, and directly exercised `isRequiredTypeMastered`:
  ```
  unit 2: maxAchievable=100% orphans=0
  unit 3: maxAchievable=100% orphans=0
  ...
  unit 14: maxAchievable=100% orphans=0
  [reachability] OK — unitMasteryStats correctly scopes unit 2's own percentage to its own reachable drill types (M13/A6 unlock-math regression guard).
  letter-read<-letter-sound: true
  letter-sound<-letter-read (should be false): false
  letter-final<-letter-sound (should be false): false
  ALL GUARDS OK
  ```
  No DB touched (pure in-memory functions); no `next build` run, per instruction.

## Residual Risk
- No RTL/component test covers the exact CRITICAL bug class (async-transition render race); recommend adding one, not blocking.
- `getUnitProgressSnapshot` failure path has no error handling in either `FlashcardSession` or `DrillSession` — pre-existing gap, not introduced by these fixes, not blocking.
- `submitFlashcardGrade`'s self-report trust model (no server-side "did you actually flip the card" check) remains an intentional, documented design choice, not a gap.
- This worktree's `.claude/plans/` previously held stale, unrelated glass-redesign plan content; there is still no feature-local `active-plan.md` for this pilot to check assertions against beyond the task brief.

## Procedure Compliance
- Plan consulted before review: yes (active-plan.md read both passes; found unrelated/stale, noted)
- Implementation summary read: yes (both passes; round 2's updated implementation-summary.md read and cross-checked against the actual diff rather than trusted at face value)
- Review summary written: yes (this file, updated in place for the re-review pass)

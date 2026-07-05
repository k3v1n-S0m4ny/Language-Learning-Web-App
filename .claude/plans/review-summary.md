# Review Summary - Unit 3 flashcards (generalized from unit-2 pilot) + Name-IPA column

## Result
PASS (with one MEDIUM finding to fix before/soon after merge, and two LOW documentation nits — none block shipping)

## Files Reviewed
- `.claude/plans/active-plan.md`
- `.claude/plans/implementation-summary.md`
- `lib/thai/flashcards.ts`
- `app/thai/[unit]/drill/page.tsx`
- `lib/thai/actions.ts` (`submitFlashcardGrade`, `submitThaiAttempt`)
- `lib/thai/reachability.ts` (full file)
- `lib/thai/flashcard-mastery.test.ts`
- `components/thai/lessons/consonant-table.tsx`
- `seed/thai/items.ts` (`MID_CONSONANTS`, `HIGH_CONSONANTS`, `LOW_CONSONANTS_A/B`)
- `seed/thai/types.ts` (`ConsonantItem.metadata.nameIpa`)
- `components/thai/drill/flashcard-session.tsx`
- `lib/thai/drill.ts` (`buildSubjectPool`, `buildDrillRound` — not in the plan's file list, reviewed anyway since it consumes `reachableDrillTypesForUnit`)
- `lib/thai/queries.ts` (`getUnitSummaries`, spot-check only)
- `scripts/seed-thai-db.ts` (spot-check of the seed-time invariants, not modified by this change)
- `git log --oneline -10`, `git status`, `git stash show -p` for working-tree state

## Findings

### CRITICAL
None.

### HIGH
None. The unlock-check-per-item fix in `submitFlashcardGrade` is correct (`summaries.find(s => s.unit === item.unit)`, `lib/thai/actions.ts:303`), and the structural guard (`!FLASHCARD_UNITS.has(item.unit) || item.kind !== "consonant" || !item.drillable`, `lib/thai/actions.ts:292`) correctly excludes the obsolete `ฃ` (unit 3, `drillable:false`) from self-graded submission. No regression for unit 2: its unlock lookup resolves to the same `summaries.find(s => s.unit === 2)` as before, just derived from `item.unit` instead of hardcoded.

### MEDIUM
- **`lib/thai/drill.ts:313-330` (`buildSubjectPool`) has a stale, now-inconsistent unit range and comment left over from this generalization.** The comment says "Unit 2 is the flashcard pilot ... Only units 3-5 use this MCQ letter-sound/letter-class/audio-letter pool" and the code branches on `if (unit >= 3 && unit <= 5)` — both wrong since unit 3 is now a flashcard unit, matching `reachableDrillTypesForUnit`'s own (correctly updated) `unit >= 4 && unit <= 5` MCQ branch in `lib/thai/reachability.ts:242`.
  - Currently harmless in production: `app/thai/[unit]/drill/page.tsx:54` gates `buildDrillRound` behind `isFlashcardUnit ? null : ...`, and `buildDrillRound`/`buildSubjectPool` are called from nowhere else in the codebase (verified via grep — only that one call site).
  - But it is a real landmine: if this branch is ever exercised directly for unit 3 (a future refactor that removes/loosens the `isFlashcardUnit` gate, a QA/admin script, or a test that calls `buildDrillRound(learnerId, 3)` directly), it would build an MCQ round hardcoding `letter-sound`/`letter-class`/`audio-letter` as the subject's `drillTypes` — types `reachableDrillTypesForUnit(3, ...)` no longer offers for unit 3 (it now returns `letter-read` only). The round would render (since `expectedAnswerFor` doesn't consult the unit), but every submitted answer would then be rejected by `submitThaiAttempt`'s `unitOfferingDrillType(itemId, "letter-sound", ALL_THAI_ITEMS)` returning `null` (no drilled unit's session offers that pair for a unit-3 item anymore) — throwing "Drill type does not apply to this item" for every single answer. A confusing, hard-to-diagnose failure mode if it's ever triggered.
  - The plan's own step-2 file list (`.claude/plans/active-plan.md:39-44`) never mentions `lib/thai/drill.ts`, so this is a genuine spec gap, not something the implementer skipped against instructions — but it should still be fixed: narrow the range to `unit >= 4 && unit <= 5` and update the comment, for consistency with `reachability.ts`'s single-source-of-truth branch and to remove the landmine.

### LOW
- `components/thai/drill/flashcard-session.tsx:20-27` — the file-level comment still says "Unit 2 flashcard pilot" and "clearing the whole deck once takes unit 2 to 100% and unlocks unit 3", both stale now that the component is genuinely unit-agnostic (it correctly uses the `unit`/`summary.nextUnit` props everywhere in actual code). Comment-only, no functional impact.
- `seed/thai/items.ts:38` — comment "Unit 3: High-class consonants (11; ฃ shown, not drilled)" is accurate; no issue, noted only because it's the one place worth double-checking the drillable/obsolete split against `reachableDrillTypesForUnit(3)`'s reachable-count of 10 (confirmed matching, see Commands Run).

## Assertions Checked
- A1 (no lingering `FLASHCARD_UNIT` singular references): PASS — grepped the whole repo; only the plan and implementation-summary markdown files (historical narrative) reference the old singular name, no source file does.
- A2 (`submitFlashcardGrade` unlock check derives the unit from the graded item, not hardcoded; no unit-2 regression): PASS — `lib/thai/actions.ts:303` uses `item.unit`; traced that this resolves identically to the old hardcoded-2 lookup for unit-2 items.
- A3 (`reachableDrillTypesForUnit`'s unit ranges have no gap/overlap: unit 3 flashcard-only, units 4-5 still MCQ): PASS — `unit === 2 || unit === 3` (flashcard) and `unit >= 4 && unit <= 5` (MCQ) are disjoint and contiguous with the rest of the unit-6-through-14 branches; independently reproduced via a standalone probe (see Commands Run) — unit 2 → `{letter-read}` only, unit 3 → `{letter-read}` only, unit 4 → `{letter-sound, letter-class, audio-letter}`.
- A4 (tests genuinely exercise unit 3, not a copy-paste of unit-2 fixture data with the unit number swapped): PASS — `lib/thai/flashcard-mastery.test.ts`'s `ITEMS` fixture uses distinct ids (`consonant:u2`/`u3`/`u4`), distinct glyphs (ก/ข/ค), and distinct `finalIpa` values (`k`/`t`/`k`) per unit; the 6 new unit-3 tests are structurally separate assertions against that unit-3-specific fixture data, not parameterized duplicates of the unit-2 ones.
- A5 (re-run `tsc`, `eslint`, `test` myself, not trust pasted output): PASS — all three re-run independently below, results match the implementer's claims exactly (42/42 tests, clean tsc, clean lint). Also re-ran `npm run build` (implementer claimed success; reproduced).
- Additional assertion I added — HIGH_CONSONANTS `nameIpa` values are non-empty, formatted consistently with `MID_CONSONANTS` (macron/grave/circumflex/acute/caron diacritics + `ː` length marker), and free of copy-paste duplication: PASS — scripted a duplicate-value scan across all `nameIpa: "..."` occurrences in `seed/thai/items.ts`; 30 total, 0 duplicates. I am not a Thai phonology expert and did not independently re-derive each transcription; the implementer's own handoff already flags two cross-checks against unit-6 syllable data (ขา → `kʰǎː`, ฝา → `fǎː`) and recommends owner spot-check, which I'd defer to as well.

## Commands Run
All re-run fresh by me (not the implementer's pasted output), from repo root, current working tree (uncommitted generalization changes on top of the two cherry-picked commits `513d9a2`/`3b6724c`).

- `npx tsc --noEmit` — exit 0
  ```
  (no output — clean)
  ```
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
- `npm test` — exit 0
  ```
  ✔ unit 2 is reachable through letter-read ONLY (not the MCQ trio) (1.0304ms)
  ✔ unit 3 is reachable through letter-read ONLY (generalized from the unit-2 pilot) (0.0843ms)
  ✔ units 4-5 keep the original letter-sound/letter-class/audio-letter MCQ trio (0.0851ms)
  ...
  ℹ tests 42
  ℹ pass 42
  ℹ fail 0
  ℹ duration_ms 231.379
  ```
  Matches the implementer's claimed 42/42. No disagreement.
- `npm run build` — exit 0
  ```
  ✓ Compiled successfully in 3.7s
    Running TypeScript ...
    Finished TypeScript in 3.9s ...
  ✓ Generating static pages using 10 workers (6/6) in 482ms
    Finalizing page optimization ...
  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ```
  Matches the implementer's claimed success. No disagreement.
- Standalone probe (own scratch `.mjs`, `file://`-imported `lib/thai/reachability.ts` + `seed/thai/items.ts` directly via `tsx`, independent of the implementer's own probe) — exit 0
  ```
  --- assertUnitMasteryScopingGuard (unit 2 + 3) ---
  [reachability] OK — unitMasteryStats correctly scopes unit 2's own percentage to its own reachable drill types (M13/A6 unlock-math regression guard).
  [reachability] OK — unitMasteryStats correctly scopes unit 3's own percentage to its own reachable drill types (M13/A6 unlock-math regression guard).
  --- reachableDrillTypesForUnit(2) sample ---
  size: 9 sample types: [ 'letter-read' ]
  --- reachableDrillTypesForUnit(3) sample ---
  size: 10 sample types: [ 'letter-read' ]
  --- reachableDrillTypesForUnit(4) sample ---
  size: 12 sample types: [ 'letter-sound', 'letter-class', 'audio-letter' ]
  --- maxAchievablePercentForUnit for all DRILLED_UNITS ---
  unit 2: max% = 100, orphans = 0
  unit 3: max% = 100, orphans = 0
  unit 4: max% = 100, orphans = 0
  unit 5: max% = 100, orphans = 0
  unit 6: max% = 100, orphans = 0
  unit 7: max% = 100, orphans = 0
  unit 8: max% = 100, orphans = 0
  unit 9: max% = 100, orphans = 0
  unit 10: max% = 100, orphans = 0
  unit 11: max% = 100, orphans = 0
  unit 12: max% = 100, orphans = 0
  unit 13: max% = 100, orphans = 0
  unit 14: max% = 100, orphans = 0
  DONE
  ```
  Confirms the implementer's own probe output independently (unit 3 reachable count of 10, 100% achievable, unit-2/3 scoping guard both pass, no unreachable-drillable-item orphans in any drilled unit).
- Duplicate-`nameIpa` scan (own ad hoc `node -e`, not from the implementer) — exit 0
  ```
  duplicate nameIpa values: []
  total nameIpa count: 30
  ```
- `git log --oneline -10`, `git status`, `git stash show -p stash@{0} --stat` — confirmed working tree state matches the handoff's description (two cherry-picked commits `513d9a2`/`3b6724c` on top of `d2fd41e`, generalization changes uncommitted, one stash entry containing only unrelated pre-existing plan/memory-doc changes, not this feature's logic).

No disagreement found between my re-run results and the implementer's pasted output in `implementation-summary.md`.

## Residual Risk
- `lib/thai/drill.ts`'s stale `unit >= 3 && unit <= 5` MCQ branch/comment (MEDIUM finding above) should be fixed for consistency, even though it is dead code today.
- Unit-3 `nameIpa` transcription accuracy is not mechanically verifiable by this review (or by the implementer, per their own handoff) — owner spot-check is still the only real check on phonological correctness, per the plan's own caveat.
- Unit-3 audio (`audioUrl`) remains largely ungenerated — explicitly called out by the plan as expected/out-of-scope, and `FlashcardSession` already degrades gracefully (omits the "Hear it" button) when absent. No code issue, just a content gap.
- One pre-existing stash entry (`stash@{0}`) remains un-dropped per the implementer's note (blocked by the repo's safety hook without explicit user approval) — confirmed its contents are unrelated to this feature (plan/memory-doc changes only) and already reflected in the working tree, so it is inert, not a hidden risk to this change.
- Manual `/thai/3/drill` walkthrough (flip/reveal, "Missed it" requeue, deck-clear celebration) from the plan's own Verification section was not performed by this review (no running dev server / DB session available in this review pass) — recommend the owner do this pass, or route it through qa-engineer, before considering the feature fully verified end-to-end.

## Procedure Compliance
- Plan consulted before review: yes
- Implementation summary read: yes
- Review summary written: yes

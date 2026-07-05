# Handoff: Unit 3 flashcards (generalized from unit-2 pilot) + Name-IPA column
Agent: implementer | Date: 2026-07-05 | Status: COMPLETE

Plan read before starting: yes — `.claude/plans/active-plan.md` ("Unit 3
exercises should match Unit 2's flashcard style"), in full.

## Completed

**Task 1 — bring the pilot onto `glass-redesign` and generalize to unit 3**

- Cherry-picked `7c47397` and `cea4da7` from the `thai-unit2-flashcards`
  history onto `glass-redesign` (now commits `513d9a2` and `3b6724c` on this
  branch). Both applied with **zero conflicts** in tracked source files —
  `seed/thai/items.ts` merged cleanly (unit 2's pilot additions and unit 3's
  `HIGH_CONSONANTS` content, added independently on this branch, touched
  disjoint line ranges). The only conflict was in an untracked-session
  artifact, `.claude/agent-memory/code-reviewer/MEMORY.md`, surfaced while
  restoring a stash of pre-existing (unrelated, already in progress before I
  started) uncommitted changes in the working tree — resolved by keeping both
  sets of lines (pure memory-file content, no logic).
- `lib/thai/flashcards.ts`: replaced `FLASHCARD_UNIT = 2` with
  `FLASHCARD_UNITS = new Set([2, 3])`. `buildFlashcardDeck` now queries
  `eq(thaiItems.unit, unit)` and validates `FLASHCARD_UNITS.has(unit)`.
  `NAME_IPA_BY_ID` is now built from `ALL_THAI_ITEMS` (filtered to
  `kind === "consonant"`) instead of `MID_CONSONANTS` alone, so unit-3 cards
  resolve their own name IPA.
- `app/thai/[unit]/drill/page.tsx`: `isFlashcardUnit = FLASHCARD_UNITS.has(unit)`.
- `lib/thai/actions.ts` `submitFlashcardGrade`: structural guard is now
  `!FLASHCARD_UNITS.has(item.unit)`; the unlock check now looks up
  `summaries.find(s => s.unit === item.unit)` (was hardcoded to unit 2), so a
  unit-3 grade checks unit 3's own unlock state, not unit 2's.
- `lib/thai/reachability.ts` `reachableDrillTypesForUnit`: the flashcard
  branch is now `if (unit === 2 || unit === 3)`; the MCQ branch narrowed to
  `if (unit >= 4 && unit <= 5)`. Updated all adjacent comments (the
  `DrillTypeId` union doc comment, `canDrillTypeScore`'s `letter-read` case,
  the grandfather-clause doc comment on `isRequiredTypeMastered`, and the
  `unitMasteryStats` inline comment) from "unit 2" to "units 2-3" language.
- `lib/thai/types.ts`'s `"letter-read"` drill type and the grandfather clause
  itself (`requiredType === "letter-read" && masteredSet.has("letter-sound")`
  in `isRequiredTypeMastered`) were left untouched, per spec — both are
  already unit-agnostic.
- Regression guard: refactored `assertUnitMasteryScopingGuard` into a new
  private `assertUnitMasteryScopingGuardForUnit(unit, allItems)` helper (same
  negative/positive-control fixture logic, parameterized), then had the
  exported `assertUnitMasteryScopingGuard` call it for both unit 2 and unit 3.
  `scripts/seed-thai-db.ts` needed no changes — it already calls the exported
  function by its unchanged name/signature.
- `lib/thai/flashcard-mastery.test.ts`: extended the synthetic fixture with a
  unit-3 consonant (alongside the existing unit-2 one) and a unit-4 consonant
  (to prove the MCQ trio still applies to 4-5, not just "not 2"). Added
  mirrored unit-3 test cases for: reachability (letter-read only), mastery
  counting, the letter-sound grandfather, the cross-unit letter-final
  non-count, and 100%-achievability. 12 tests in this file now (was 6).

**Task 2 — Name-IPA column**

- `components/thai/lessons/consonant-table.tsx`: added a "Name IPA" column
  between Name and Meaning, rendering `[${item.metadata.nameIpa}]` or an em
  dash when absent (same null-handling pattern as the existing Final-IPA
  column). Single shared component, so both `MidConsonantLesson` and
  `HighConsonantLesson` pick it up with no per-unit changes.
- `seed/thai/items.ts`: authored `metadata.nameIpa` for all 11
  `HIGH_CONSONANTS` entries (10 drillable + the obsolete ฃ, included for table
  consistency). Tone/phonology derived from Thai tone rules (mid class
  unmarked-live=mid; high class unmarked-live=rising, unmarked-dead=low,
  mai-ek=low, mai-tho=falling) using the same
  macron/grave/circumflex/acute/caron diacritic convention already used by
  `MID_CONSONANTS`. Two entries were cross-checked directly against
  ALREADY-EXISTING unit-6 syllable items in the same file that happen to
  share the same word (ขา → `kʰǎː`, ฝา → `fǎː` — both exact matches to my
  independently-derived transcriptions), which gives high confidence in the
  rest:
  - ข ไข่ → `kʰɔ̌ː kʰàj`
  - ฃ ขวด → `kʰɔ̌ː kʰùat`
  - ฉ ฉิ่ง → `tɕʰɔ̌ː tɕʰìŋ`
  - ฐ ฐาน → `tʰɔ̌ː tʰǎːn`
  - ถ ถุง → `tʰɔ̌ː tʰǔŋ`
  - ผ ผึ้ง → `pʰɔ̌ː pʰɯ̂ŋ`
  - ฝ ฝา → `fɔ̌ː fǎː`
  - ศ ศาลา → `sɔ̌ː sǎːlāː`
  - ษ ฤๅษี → `sɔ̌ː rɯ́ːsǐː`
  - ส เสือ → `sɔ̌ː sɯ̌a`
  - ห หีบ → `hɔ̌ː hìːp`
  Owner should still spot-check these per the plan's own note ("transcription
  accuracy isn't mechanically verifiable").

## Left Undone

- Nothing from the spec. Unit-3 audio (`audioUrl`) remains largely
  ungenerated (only unit-2's ป has been batch-regenerated per prior work) —
  explicitly called out in the plan as expected/out-of-scope, not a gap
  introduced here; `FlashcardSession` already omits the audio button when
  `audioUrl` is null.
- Did not commit any of this work. The two cherry-picks landed as real
  commits (`513d9a2`, `3b6724c` — `git cherry-pick` inherently commits); my
  subsequent generalization/authoring edits are left as uncommitted
  working-tree changes for review, per the repo's normal
  implementer -> reviewer -> commit flow.
- One pre-existing stash entry (`stash@{0}`, "pre-existing uncommitted changes
  before task cherry-pick") remains in the stash list — its contents were
  already popped back into the working tree (conflict resolved), so it's
  redundant, but the repo's safety hook blocks `git stash drop`/`clear`
  without explicit user approval, so I left it rather than force it.

## Commands Run

- `git cherry-pick 7c47397` — exit 0
  ```
  [glass-redesign 513d9a2] Add Read-Thai unit 2 self-graded flashcard pilot + fix ป audio
   Date: Sun Jul 5 14:20:11 2026 +0700
   17 files changed, 774 insertions(+), 173 deletions(-)
  ```
- `git cherry-pick cea4da7` — exit 0
  ```
  [glass-redesign 3b6724c] Unit-2 flashcards: font switcher, name IPA, initial/final sounds
   Date: Sun Jul 5 15:00:05 2026 +0700
   7 files changed, 158 insertions(+), 28 deletions(-)
  ```
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
  ℹ tests 42
  ℹ suites 0
  ℹ pass 42
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 246.8966
  ```
- `npm run build` — exit 0
  ```
  ✓ Compiled successfully in 3.5s
    Running TypeScript ...
    Finished TypeScript in 4.2s ...
  ✓ Generating static pages using 10 workers (6/6) in 421ms
    Finalizing page optimization ...
  ```
- Standalone probe (ad hoc scratch script importing
  `assertUnitMasteryScopingGuard` + `ALL_THAI_ITEMS` directly, not committed
  anywhere) — exit 0
  ```
  [reachability] OK — unitMasteryStats correctly scopes unit 2's own percentage to its own reachable drill types (M13/A6 unlock-math regression guard).
  [reachability] OK — unitMasteryStats correctly scopes unit 3's own percentage to its own reachable drill types (M13/A6 unlock-math regression guard).
  DONE
  ```
- Standalone probe (ad hoc scratch script checking
  `reachableDrillTypesForUnit(3, ...)`, `maxAchievablePercentForUnit(3, ...)`,
  and printing every `HIGH_CONSONANTS` nameIpa against real seed content) — exit 0
  ```
  unit 3 reachable count: 10 (expect 10 drillable high consonants, ฃ excluded)
  ... (all 10 map to ["letter-read"]) ...
  max achievable %: 100
  HIGH_CONSONANTS nameIpa:
  ข ข ไข่ -> kʰɔ̌ː kʰàj
  ฃ ฃ ขวด -> kʰɔ̌ː kʰùat
  ฉ ฉ ฉิ่ง -> tɕʰɔ̌ː tɕʰìŋ
  ฐ ฐ ฐาน -> tʰɔ̌ː tʰǎːn
  ถ ถ ถุง -> tʰɔ̌ː tʰǔŋ
  ผ ผ ผึ้ง -> pʰɔ̌ː pʰɯ̂ŋ
  ฝ ฝ ฝา -> fɔ̌ː fǎː
  ศ ศ ศาลา -> sɔ̌ː sǎːlāː
  ษ ษ ฤๅษี -> sɔ̌ː rɯ́ːsǐː
  ส ส เสือ -> sɔ̌ː sɯ̌a
  ห ห หีบ -> hɔ̌ː hìːp
  ```

## Issues Discovered

- The working tree had pre-existing uncommitted changes (4 modified files +
  3 untracked memory files) from a prior session, unrelated to this task, when
  I started. Cherry-picking with those in place failed (`error: Your local
  changes... would be overwritten by merge`), so I stashed them
  (`git stash push -u`), did both cherry-picks, then popped the stash back —
  one merge conflict in a code-reviewer memory file (see above), resolved by
  keeping both sides. Net effect: the pre-existing changes are back in the
  working tree unchanged in content, just landed around the two new commits
  instead of before them.
- `seed/thai/items.ts` merged with zero conflicts despite the plan's
  expectation of "likely conflicts" there — the pilot's unit-2-only additions
  and this branch's independently-added unit-3 `HIGH_CONSONANTS` content
  happened to touch disjoint line ranges.
- This implementation-summary.md file already existed in the repo (carried in
  via the `7c47397` cherry-pick, written by the original pilot's implementer
  agent for that separate task). It has been overwritten with this task's own
  summary per session protocol; its prior content (unit-2 pilot build) is
  preserved in git history at commit `513d9a2` if needed for reference.

## Spec Deviations

- None. Implemented exactly as specified: `FLASHCARD_UNITS` set,
  `unit === 2 || unit === 3` reachability branch, `unit >= 4 && unit <= 5` MCQ
  branch, per-item unlock lookup in `submitFlashcardGrade`,
  `ALL_THAI_ITEMS`-sourced `NAME_IPA_BY_ID`, Name-IPA column in the shared
  `ConsonantTable`, and `nameIpa` authored for all of `HIGH_CONSONANTS`
  (including the non-drilled ฃ, which the spec allowed but didn't require).
- One interpretive call: the spec said "extend or duplicate" the regression
  guard fixture for unit 3 — I chose to **factor it into a parameterized
  private helper** (`assertUnitMasteryScopingGuardForUnit`) called twice from
  the still-exported `assertUnitMasteryScopingGuard`, rather than duplicating
  the whole function body under a new name. This keeps the exported symbol's
  name/signature stable (no `scripts/seed-thai-db.ts` changes needed) while
  avoiding copy-pasted fixture logic.

## Procedure Compliance
- Plan consulted before coding: yes
- Tests run before finishing: yes — `npm test` (`42 passed, 0 failed`, verbatim summary above), plus `npx tsc --noEmit` (clean), `npm run lint` (clean), and `npm run build` (succeeded), all re-run after the final round of comment edits.
- Handoff written: yes

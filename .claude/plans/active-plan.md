# Plan: Unit 3 exercises should match Unit 2's flashcard style

## Context

Read-Thai unit 2 (mid-class consonants) has a self-graded, "clear-the-deck"
flashcard drill built as a pilot (`thai-unit2-flashcards` branch/worktree,
commits `7c47397` + `cea4da7`, owner-approved 2026-07-05). That pilot was
never merged into `main` or the current `glass-redesign` branch — on this
branch, units 2 and 3 both still render the old generic multiple-choice
`DrillSession` and look identical.

The owner has confirmed: **the flashcard mechanic is the correct, intended
style ("the truth"); the multiple-choice drill is stale.** Unit 3 (high-class
consonants) should get the same flip-card, self-graded, clear-the-deck
exercise unit 2 has, not the MCQ round.

Unit 3's *lesson* content (`ConsonantClassLesson`) is unrelated and already
correct — this plan only touches the *drill/exercise* page.

Separately, the owner also wants a **Name-IPA column added to the lesson
consonant tables** for both units 2 and 3 (`ConsonantTable`, used by both
`MidConsonantLesson` and `HighConsonantLesson` via the shared
`ConsonantClassLesson` shell). The table currently shows Letter / Name /
Meaning / Class / Initial IPA / Final IPA, but never renders
`metadata.nameIpa` (the IPA reading of the acrophonic name itself, e.g.
"kɔ̄ː kàj" for ก ไก่) even though the type field exists. Unit 2's seed data
already has `nameIpa` authored for all 9 mid-class consonants; unit 3's
`HIGH_CONSONANTS` has none authored yet.

## Approach

1. **Bring the flashcard pilot onto `glass-redesign`.** Cherry-pick
   `7c47397` and `cea4da7` from `thai-unit2-flashcards` rather than merging
   the whole branch (that branch's lesson-content and beta-tester-gating
   commits, `a4e08d2`/`2ea297a`, appear to already be present on this branch
   through separate history — a full merge would duplicate/conflict them).
   Resolve conflicts by hand; re-run `tsc`/`eslint`/tests after.

   Files this touches: `app/thai/[unit]/drill/page.tsx`,
   `components/thai/drill/flashcard-session.tsx`, `lib/thai/actions.ts`,
   `lib/thai/drill.ts`, `lib/thai/flashcards.ts`, `lib/thai/reachability.ts`,
   `lib/thai/types.ts`, `lib/thai/flashcard-mastery.test.ts`,
   `seed/thai/items.ts`, `seed/thai/types.ts`, `scripts/generate-thai-audio.ts`,
   `app/globals.css`, `app/layout.tsx`.

2. **Generalize the pilot from "unit 2 only" to "units 2 and 3."** The pilot
   hard-codes a single `FLASHCARD_UNIT = 2` constant in several places. Widen
   each to a set/membership check instead of adding a second one-off branch:

   - `lib/thai/flashcards.ts`: replace `FLASHCARD_UNIT` (single number) with
     `FLASHCARD_UNITS = new Set([2, 3])`. `buildFlashcardDeck(learnerId, unit)`
     currently queries `eq(thaiItems.unit, FLASHCARD_UNIT)` — change to
     `eq(thaiItems.unit, unit)` and validate `FLASHCARD_UNITS.has(unit)`
     instead of `unit !== FLASHCARD_UNIT`. `NAME_IPA_BY_ID` is built from
     `MID_CONSONANTS` only — rebuild it from `ALL_THAI_ITEMS` (or
     `MID_CONSONANTS` + `HIGH_CONSONANTS`) so unit-3 cards resolve name IPA
     too (note: `HIGH_CONSONANTS` in `seed/thai/items.ts` currently has no
     `nameIpa` authored for any entry — the UI already renders gracefully
     without it, so this is not a blocker, just an expected gap until/unless
     that content gets authored later).
   - `app/thai/[unit]/drill/page.tsx`: `isFlashcardUnit = FLASHCARD_UNITS.has(unit)`.
   - `lib/thai/actions.ts::submitFlashcardGrade`: the structural guard
     `item.unit !== FLASHCARD_UNIT` → `!FLASHCARD_UNITS.has(item.unit)`; the
     unlock check currently looks up `summaries.find(s => s.unit === FLASHCARD_UNIT)`
     hard-coded to unit 2 — change to look up `item.unit` so a unit-3 grade
     checks unit 3's own unlock state.
   - `lib/thai/reachability.ts::reachableDrillTypesForUnit`: the
     `if (unit === 2) { ... "letter-read" ... }` branch becomes
     `if (unit === 2 || unit === 3)`; the MCQ branch
     `if (unit >= 3 && unit <= 5)` narrows to `if (unit >= 4 && unit <= 5)`
     (units 4-5 keep the existing MCQ trio unless/until told otherwise).
     Update the adjacent comments referencing "unit 2 flashcard" /
     "Units 3-5 keep the MCQ trio" to reflect units 2-3 vs 4-5.
   - Leave `lib/thai/types.ts`'s `"letter-read"` drill type and the
     grandfather clause in `isRequiredTypeMastered`
     (`requiredType === "letter-read" && masteredSet.has("letter-sound")`)
     as-is — both are already unit-agnostic and will correctly grandfather
     any prior unit-3 MCQ progress into flashcard mastery.

3. **Audio gap is expected, not a blocker.** Unit 3 consonants mostly have no
   `audioUrl` yet (only unit 2's ป has been batch-generated per memory) —
   `FlashcardSession` already omits the "▶ Hear it" button when `audioUrl` is
   null, so unit 3 flashcards will simply show fewer audio buttons until a
   future audio batch run covers unit 3. Not in scope for this change.

4. **Tests.** Extend/duplicate `lib/thai/flashcard-mastery.test.ts` coverage
   (and the module-load-time regression-guard fixtures in
   `reachability.ts` that currently assert against `unitMasteryStats(2, ...)`
   as a representative case) to also exercise unit 3, so a future regression
   in the unit-3 unlock math is caught the same way unit 2's is.

5. **Add a Name-IPA column to the lesson tables (both units).** In
   `components/thai/lessons/consonant-table.tsx`, add a column rendering
   `item.metadata.nameIpa` (fall back to an em dash or omit the cell when
   absent, consistent with the existing Final-IPA null handling). This is
   one shared component, so both `MidConsonantLesson` (unit 2) and
   `HighConsonantLesson` (unit 3) pick it up automatically — no per-unit
   component changes needed.

   Unit 2's `MID_CONSONANTS` already has `nameIpa` authored for all 9
   entries. Unit 3's `HIGH_CONSONANTS` (`seed/thai/items.ts`) does not —
   author `metadata.nameIpa` for its 10 drillable high-class consonants
   (ข ฉ ฐ ถ ผ ฝ ศ ษ ส ห; the obsolete ฃ is not drilled but can get one too
   for table consistency), following the same transcription convention
   already used for `MID_CONSONANTS` (tone-marked IPA of the full acrophonic
   name, e.g. `"kɔ̄ː kàj"`). This is a small content-authoring task the
   implementer should do carefully and the owner should spot-check, since
   transcription accuracy isn't mechanically verifiable.

## Verification

- `tsc` and `eslint` clean; full test suite passes (pilot commit shows
  37/37 prior to this change — confirm still green after generalizing).
- Manually walk `/thai/3/drill` as a test learner: cards render for all
  drillable high-class consonants, flip/reveal shows initial+final IPA and
  name, "Missed it" rotates the card to the back, clearing the whole deck
  once shows the completion summary and (on first clearance) the unit-4
  unlock celebration.
- Confirm `/thai/2/drill` still behaves identically to before (no
  regression from the `FLASHCARD_UNIT` → `FLASHCARD_UNITS` generalization).
- Confirm a learner who already has unit-3 MCQ (`letter-sound`) progress
  from before this change is grandfathered into flashcard mastery (existing
  `isRequiredTypeMastered` logic), not forced to redo the deck.
- Visually check `/thai/2/lesson` and `/thai/3/lesson`: both tables now show
  a Name-IPA column; unit 2's is populated for all rows, unit 3's is
  populated for its 10 drillable rows (owner to spot-check transcription
  accuracy).

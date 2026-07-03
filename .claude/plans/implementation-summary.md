---
status: COMPLETE
updated: 2026-07-03
---

# Handoff: Read-Thai M14 — units 12 (signs+leaders), 13 (numerals), 14 (spaceless tap-split)
Agent: implementer | Date: 2026-07-03 | Status: COMPLETE

## Completed

**A1 — Seed content (new kinds + items, units 12-14)**
- `seed/thai/types.ts:165-256` — four new `ThaiItem` union members:
  `SpecialSignItem` (kind `special-sign`), `LeaderWordItem` (kind
  `leader-word`), `NumeralItem` (kind `numeral`), `PhraseItem` (kind
  `phrase`) — metadata fields exactly per the contract (`functionKey`,
  `leaderChar`/`baseConsonant`/`derivation`, `value`/`name`/`nameIpa`,
  `syllables`/`boundaries`/`gloss` respectively).
- `seed/thai/items.ts` — `SPECIAL_SIGNS` (4 rows, verbatim from research doc
  §8), `LEADER_WORDS` (12 rows, verbatim from `m14-content-leaders.md`),
  `NUMERALS` (10 rows, verbatim from `m14-content-numerals.md`), `PHRASES`
  (20 rows, verbatim from `m14-content-phrases.md`) — all IPA normalized to
  the codebase's existing no-slash convention (`tʰ`/`kʰ`/`tɕʰ` superscript-h,
  not the content bank's Roman-h `th`/`kh`/`ch` spelling) and cross-checked
  against IPA already present in `WORD_BANK` for overlapping words (เจ็ด,
  หก, ห้า, สอง, สาม, ข้าว all match exactly, confirming consistency).
  `ALL_THAI_ITEMS` includes all four new arrays; `BUILT_UNITS` = `[1..14]`.
- `scripts/seed-thai-db.ts` — new `assertPhraseBoundariesValid()` (seed-time
  assertion, called from `main()`): every phrase's `boundaries` is checked
  strictly increasing, in range `1..len-1`, and re-splitting `[...display]`
  at those indices reproduces `syllables[i].thai` concatenation exactly.
  Passed 20/20 on every run (see Commands Run).

**A2 — Reachability wiring**
- `lib/thai/reachability.ts`:
  - `DrillTypeId` (line ~63) gains `sign-function`, `leader-tone`,
    `audio-leader`, `numeral-value`, `value-numeral`, `audio-numeral`,
    `phrase-split`.
  - `DRILLED_UNITS` (line ~82) gains `12, 13, 14`.
  - `canEverHaveAudio` (line ~98): `leader-word`/`numeral` → true;
    `special-sign`/`phrase` → false.
  - `canDrillTypeScore` (line ~163+): 7 new branches, matching the contract.
  - `reachableDrillTypesForUnit` (line ~285+): new `unit===12` branch (both
    `special-sign` and `leader-word` kinds — unlike units 10/11, these items
    ARE tagged `unit:12` directly, no cross-unit sourcing needed),
    `unit===13` branch (numeral both directions + audio), `unit===14` branch
    (phrase-split).
  - `maxAchievablePercentForUnit` needed no code change — it derives from
    `reachableDrillTypesForUnit` + `canDrillTypeScore` generically; verified
    100% for units 12/13/14 by the seed run (see Commands Run).
- `lib/thai/types.ts`: `DrillType` union gains the same 7 types;
  `DrillQuestion` gains optional `phrase: {chars, syllables}`; new exported
  pure function `serializeBoundaries(boundaries: number[]): string` (sorted,
  deduped, comma-joined) — the single shared serialization both
  `lib/thai/drill.ts::expectedAnswerFor` (server) and
  `components/thai/drill/phrase-split-question.tsx` (client) use, so a
  learner's tapped set and the seed content's canonical set always compare
  equal as strings.
- `lib/thai/drill.ts`: `VALID_KINDS_FOR_DRILL_TYPE` gains the 7 mappings;
  `expectedAnswerFor` gains 7 branches (phrase-split via
  `serializeBoundaries`).
- `lib/thai/actions.ts`: `KNOWN_DRILL_TYPES` gains the same 7 entries (the
  server-action-level allowlist checked before any DB write in
  `submitThaiAttempt`).

**A3 — Unit 12 drills**
- `lib/thai/drill.ts`: `buildSubjectPool` unit-12 branch (fetches
  `unit===12` items, builds per-kind drillTypes); new distractor helpers
  `signFunctionDistractors` (other 3 signs' own functionKey/functionLabel)
  and `leaderSpellingDistractors` (adversarial leaderless-base spelling —
  `[...display].slice(1)` — plus other leader words as same-family
  confusables); `buildQuestion` branches for `sign-function` (4-way MC),
  `leader-tone` (5-way MC over ALL tones via the existing `toneDistractors`
  — this structurally guarantees the "tone without the leader" adversarial
  option is always present, since with only 5 tones total and 4 distractors
  there's no room for it to be excluded; reveal shows `gloss — derivation`),
  `audio-leader` (degrades gracefully — returns `null`/samples nothing until
  `audioUrl` is populated).
- `components/thai/lessons/special-signs-lesson.tsx` (new) — renders the
  §8 small-marks table, the silent-leader ห/อ explanation with the
  นา/หนา and มา/หมา worked contrasts (text closely follows
  `seed/thai/research/reading-thai-script.html` lines 758-773, preserving
  every clause/caveat), the 12 drilled leader words, and the true/false-
  cluster note as lesson-only prose (doc lines 766-768, including the "not
  quizzed" / source-note caveat).
- `app/thai/[unit]/lesson/page.tsx` unit===12 branch renders it.

**A4 — Unit 13 drills**
- `lib/thai/drill.ts`: `buildSubjectPool` unit-13 branch; `DIGIT_CONFUSABLE_GROUPS`
  ({1,9},{3,7},{4,5},{6,9} — curated, symmetric, falls back to the general
  digit pool for 0/2/8 exactly like `finalSoundDistractors`' `FINAL_GROUPS`
  pattern); `digitValueDistractors`/`numeralGlyphDistractors` helpers;
  `buildQuestion` branches for `numeral-value` (Thai glyph → Arabic digit
  string), `value-numeral` (Arabic digit → Thai glyph), `audio-numeral`
  (degrades gracefully until clip lands).
- `components/thai/lessons/numerals-lesson.tsx` (new) — digit table, the
  "๒๐๒๖ = 2026 / ๙๙ = 99" note (doc §9 verbatim), spoken-name table with
  IPA + tone sparkline, and the ๑ citation-vs-colloquial tone caveat.
- `app/thai/[unit]/lesson/page.tsx` unit===13 branch renders it.

**A5 — Unit 14: spaceless reading (tap-boundary widget)**
- `components/thai/drill/phrase-split-question.tsx` (new) — sibling of
  `tone-assembly-question.tsx`. Renders `phrase.chars` as tappable cells with
  a toggle button BETWEEN each pair of characters (positions `1..len-1`); a
  "Check" button serializes the tapped set via `serializeBoundaries` and
  calls `onSubmit` exactly once (mirrors tone-assembly's "one server attempt
  on the final answer" contract). After Check, shows per-syllable
  IPA+gloss reinforcement locally — never logged (no second server call).
  Boundary coloring on reveal: green = correct+selected, amber (`highlight`)
  = correct+missed, clay = selected+wrong.
- `lib/thai/drill.ts`: `buildSubjectPool` unit-14 branch; `buildQuestion`
  branch for `phrase-split` — carries `phrase: {chars: [...item.display],
  syllables}`, `options: []` (unused — not MC).
- `components/thai/drill/drill-session.tsx`: added `isPhraseSplit` check that
  skips the standard prompt-box + MC-options-grid entirely and renders
  `<PhraseSplitQuestion>` instead; the shared "Next / Finish round" button
  and phase machinery are unchanged (reused as-is).
- `components/thai/lessons/spaceless-reading-lesson.tsx` (new) — the three
  cues (leading vowels / vowel shape / final consonant) and both worked
  examples (ไปโรงเรียน, แมวกินปลา) transcribed from doc §10 (lines
  800-803).
- `app/thai/[unit]/lesson/page.tsx` unit===14 branch renders it.

**A6 — Audio batch (CODE ONLY — batch NOT run)**
- `scripts/generate-thai-audio.ts`'s `buildManifest()` gains two branches:
  `leader-word` → `item.display` (the word itself); `numeral` →
  `item.metadata.name` (the Thai digit NAME, e.g. หนึ่ง — NOT the glyph).
  Header comment updated to describe the two new sources.
  **The paid batch was NOT executed** — left to the orchestrator per task
  instructions (hard paid gate).

**A7 — Course-complete wrap-up**
- `seed/thai/items.ts`: `BUILT_UNITS = [1..14]`. `lib/thai/queries.ts`
  needed NO code change — `getUnitSummaries`' "coming soon" branch is
  already driven purely by `BUILT_UNITS.includes(unit)`, so units 12-14 now
  render as real units automatically. `components/thai/unit-row.tsx`
  likewise needed no change (same mechanism).
- `app/thai/[unit]/lesson/page.tsx`: `BUILT_LESSON_UNITS` → includes 12-14;
  the "Next unit →" link condition changed from `unit < 11` to `unit < 14`
  (no dangling affordance pointing past 14 — unit 14's lesson page now shows
  no "Next unit" link).
- `app/thai/[unit]/drill/page.tsx`: `DRILLABLE_UNITS` → includes 12-14.
- Project memory (`m11-thai-reading-course-decisions.md`) was **deliberately
  NOT edited** — per this task's explicit instruction ("Do NOT edit project
  memory — the orchestrator does that").

**A8 — Regression + non-Thai safety**
- No Mandarin schema/route/component touched (all edits scoped to
  `lib/thai/*`, `seed/thai/*`, `app/thai/*`, `components/thai/*`,
  `scripts/{seed-thai-db,generate-thai-audio}.ts`).
- `assertUnitMasteryScopingGuard` and the two reachability invariants all
  pass on both seed runs (see Commands Run) — units 1-11's existing
  unlock/mastery math is untouched (no edits to units 2-11's branches in
  `reachability.ts`/`drill.ts` beyond appending new cases).
- `npm run build` / lint / typecheck clean; `seed:thai` idempotent on the
  second run (0 inserted / 241 upserted / 0 deleted).

## Left Undone
- **A6's paid audio batch runtime** — intentionally left to the orchestrator
  (hard paid gate; instructions explicitly forbid running it). The manifest
  code is ready: `npm run audio:thai -- --dry` will report the clip count
  including the new leader-word/numeral-name candidates once run. Until the
  batch runs, `audio-leader`/`audio-numeral` sample nothing and units 12/13
  legitimately sit below 100% for a learner who has mastered every other
  drill type — the same documented M12/M13 re-lock pattern, not a bug.

## Commands Run

- `npx tsc --noEmit -p tsconfig.json` — exit 0
  ```
  (no output — clean)
  ```

- `npm run seed:thai` (first run, after A1+A2 wiring complete) — exit 0
  ```
  [reachability] OK — every drillable item across units 2,3,4,5,6,7,8,9,10,11,12,13,14 (230 total) is reachable as a drill subject.
  [reachability] OK — every drilled unit (2,3,4,5,6,7,8,9,10,11,12,13,14) can reach 100% percentMastered given its own drill session.
  [reachability] OK — unitMasteryStats correctly scopes unit 2's own percentage to its own reachable drill types (M13/A6 unlock-math regression guard).
  [phrase-boundaries] OK — every unit-14 phrase (20 checked) has boundaries that reproduce its syllable split exactly.
  [delete] 0 dropped item(s).

  Done. 46 inserted, 195 upserted-as-update, 0 deleted. Total items: 241.
  ```
  (Before: 195 thai_items, matching the M13 handoff's documented count.
  After: 241 — +46, i.e. 4 signs + 12 leaders + 10 numerals + 20 phrases.)

- `npm run seed:thai` (second run, idempotency proof) — exit 0
  ```
  [reachability] OK — every drillable item across units 2,3,4,5,6,7,8,9,10,11,12,13,14 (230 total) is reachable as a drill subject.
  [reachability] OK — every drilled unit (2,3,4,5,6,7,8,9,10,11,12,13,14) can reach 100% percentMastered given its own drill session.
  [reachability] OK — unitMasteryStats correctly scopes unit 2's own percentage to its own reachable drill types (M13/A6 unlock-math regression guard).
  [phrase-boundaries] OK — every unit-14 phrase (20 checked) has boundaries that reproduce its syllable split exactly.
  [delete] 0 dropped item(s).

  Done. 0 inserted, 241 upserted-as-update, 0 deleted. Total items: 241.
  ```

- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  (no findings)

- `npm run build` — exit 0
  ```
  ✓ Compiled successfully in 6.0s
    Running TypeScript ...
    Finished TypeScript in 9.7s ...
    Collecting page data using 10 workers ...
  ✓ Generating static pages using 10 workers (6/6) in 916ms
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

- Final re-verification after a trivial comment-only edit (no logic change):
  `npx tsc --noEmit` — exit 0 (clean); `npm run lint` — exit 0 (clean);
  `npm run build` — exit 0 (same route table as above); `npm run seed:thai`
  — exit 0, `0 inserted, 241 upserted-as-update, 0 deleted. Total items: 241.`
  with all four invariant OK lines printed (identical to the second run
  above).

## Issues Discovered
- The content bank's phrase/numeral IPA used Roman-letter aspiration (`th`,
  `kh`, `ch`) rather than the codebase's existing IPA superscript convention
  (`tʰ`, `kʰ`, `tɕʰ`) used throughout `WORD_BANK`. Converted all new IPA to
  match — verified against several exact word overlaps already present in
  `WORD_BANK` (เจ็ด, หก, ห้า, สอง, สาม, ข้าว), all of which matched the
  converted forms exactly, giving high confidence the conversion is correct
  and not a fresh transcription decision.
- `assertEveryDrillableItemIsReachable`'s "230 total" figure (not 232) is
  correct, not a bug: it excludes the two intentionally-non-drillable
  obsolete consonants (ฃ, ฅ) in addition to the 8 `final` rows and the unit-1
  lesson marker (241 total − 1 marker − 8 finals − 2 obsolete = 230).

## Spec Deviations
- **`scripts/generate-thai-audio.ts`'s extended function is not literally
  named `deriveAudioText`** (the task prompt's phrasing) — the real file has
  no such function; the per-kind text derivation is inline in
  `buildManifest()` (there is only a `deriveVowelAudioText` helper for the
  vowel case). Extended `buildManifest()`'s inline branches instead, which is
  functionally identical to what a `deriveAudioText` extension would do.
- **`special-sign:paiyannoi`'s example IPA is an empty string** (`ipa: ""`).
  The content bank's source (research doc §8) gives only `"(e.g. กรุงเทพฯ)"`
  for this row with no accompanying IPA — inventing one would violate the "no
  invented IPA" rule, so the field is left empty rather than fabricated. This
  is lesson-illustration-only content (never drilled), so it carries no
  reachability/scoring risk.
- **`value-numeral`'s `promptKind` reuses `"vowel"`** purely for its existing
  CSS styling bucket (mono font vs. font-thai) rather than adding a new
  `promptKind` variant to the type — the prompt is a bare Arabic digit
  string, not a vowel; documented with an inline comment at the call site to
  avoid future confusion.
- Everything else matches the contract as written; no other deviations.

## Procedure Compliance
- Plan consulted before coding: yes (`active-plan.md` A1-A8 + build order,
  and all three `m14-content-*.md` artifacts + the merged `m14-content-bank.md`,
  read in full before writing any seed content).
- Content integrated verbatim: yes — every Thai word, IPA reading, tone,
  gloss, and boundary array for leader words/numerals/phrases was copied
  from the vetted artifacts (only the IPA aspiration-mark notation was
  normalized to the codebase's existing convention, not re-transcribed).
- Tests run before finishing: cite `npm run seed:thai` (twice, idempotent,
  0 inserted/241 upserted/0 deleted on the second run, all 4 invariant OK
  lines), `npx tsc --noEmit` (exit 0), `npm run lint` (exit 0), `npm run
  build` (exit 0) — all under Commands Run above with verbatim output.
- Paid audio batch: NOT run (code-only, per instructions).
- Handoff written: yes (this file — replaces the stale M13 handoff that
  previously occupied this path; M13's content chain is preserved at
  `.claude/plans/m13-archive--implementation-summary.md`).

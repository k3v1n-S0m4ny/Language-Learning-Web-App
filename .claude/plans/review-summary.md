---
status: COMPLETE
updated: 2026-07-03
---

# Review Summary - Read-Thai M14 (units 12/13/14: special signs & silent leaders, numerals, spaceless reading)

## Result
PASS

No CRITICAL or HIGH findings. Four LOW findings (cosmetic/documentation only,
none functional). All eight assertions (A1-A8) verified directly against
code, re-run commands, and the vetted content bank.

## Files Reviewed
- `.claude/plans/active-plan.md` (Validation Contract A1-A8)
- `.claude/plans/implementation-summary.md`
- `.claude/plans/m14-content-bank.md`, `m14-content-leaders.md`,
  `m14-content-numerals.md`, `m14-content-phrases.md`
- `seed/thai/types.ts`, `seed/thai/items.ts`
- `lib/thai/reachability.ts`, `lib/thai/types.ts`, `lib/thai/drill.ts`,
  `lib/thai/actions.ts`, `lib/thai/queries.ts` (read-only, unchanged)
- `scripts/seed-thai-db.ts`, `scripts/generate-thai-audio.ts`
- `components/thai/drill/phrase-split-question.tsx`,
  `components/thai/drill/drill-session.tsx`
- `components/thai/lessons/special-signs-lesson.tsx`,
  `components/thai/lessons/numerals-lesson.tsx`,
  `components/thai/lessons/spaceless-reading-lesson.tsx`
- `app/thai/[unit]/lesson/page.tsx`, `app/thai/[unit]/drill/page.tsx`
- `components/thai/unit-row.tsx` (read-only, confirms A7)
- `seed/thai/research/reading-thai-script.html` (source-of-truth doc, §8-§10)
- Full `git diff HEAD` for every changed file (checked for unintended
  modifications to existing units 1-11 logic — all diffs are additive)

## Findings by severity

### CRITICAL
None found.

### HIGH
None found.

### MEDIUM
None found.

### LOW
- `lib/thai/queries.ts:55` — stale comment: "Units 1-9 reflect real progress;
  10-14 render as locked 'coming soon' placeholders (no content yet)." This
  is no longer true — `BUILT_UNITS` is now `[1..14]` and `TOTAL_UNITS === 14`,
  so the loop in `getUnitSummaries` never reaches an unbuilt unit and
  "Coming soon" (`components/thai/unit-row.tsx:23`) can never render for any
  unit. The code itself is correct (verified: `built` is driven purely by
  `BUILT_UNITS.includes(unit)`); only the comment is out of date. Cosmetic,
  no functional risk.
- `lib/thai/drill.ts:989-991` — `value-numeral`'s `promptKind` reuses
  `"vowel"` purely for its CSS bucket (mono font for a bare Arabic digit,
  not Thai script) rather than adding a real `promptKind` variant. Documented
  by the implementer as a spec deviation with an inline comment. Functions
  correctly (digit prompts render in mono font, which is the right visual
  choice) but is a naming smell that could confuse a future reader searching
  for "everywhere `promptKind === 'vowel'` is handled."
- `seed/thai/items.ts:313` — `special-sign:paiyannoi`'s `example.ipa` is an
  empty string (research doc §8 gives no IPA for this example). Rendering
  code (`special-signs-lesson.tsx:52-61`) correctly guards on
  `example.ipa && (...)`, so the empty string is skipped gracefully with no
  rendering artifact. Non-drilled content (lesson-illustration only), so no
  reachability/scoring risk. Flagging only because an empty-string field is
  slightly unusual and worth a `| null` type instead of `""` if touched again.
- Project memory `m11-thai-reading-course-decisions.md` was **not** updated
  with the M14-shipped / course-complete entry — per the implementer's task
  instructions this was explicitly deferred to the orchestrator, not an
  implementer or review defect. Flagging as an outstanding housekeeping item
  before this milestone is considered fully closed out.

## Assertions Checked

**A1 — Seed content (new kinds + items, units 12-14).** PASS. Verified
`seed/thai/types.ts` adds exactly the four new `ThaiItem` union members
(`SpecialSignItem`, `LeaderWordItem`, `NumeralItem`, `PhraseItem`) with the
metadata shapes the contract specifies. Verified `seed/thai/items.ts`
contains 4 special-sign rows, 12 leader-word rows (all 4 mandatory
อ-leader words present: อย่า/อยาก/อย่าง/อยู่; `ให้` correctly absent), 10
numeral rows, and 20 phrase rows (all from the content bank, not a subset —
better than the plan's own "~15-20" estimate). Spot-compared every field
(display, IPA, tone, gloss, derivation, boundaries) against
`m14-content-{leaders,numerals,phrases}.md` line-by-line for all 12 leader
words, all 10 numerals, and all 20 phrases — every value is a verbatim
match. IPA aspiration-notation conversion (`th→tʰ`, `kh→kʰ`, `ch→tɕʰ`)
verified consistent with existing `WORD_BANK` entries for the 6 overlapping
words the implementer cited (เจ็ด, หก, ห้า, สอง, สาม, ข้าว) — confirmed by
direct grep, all six match the pre-existing convention exactly, so this is
a genuine notation normalization, not a re-transcription. `ALL_THAI_ITEMS`
includes all four new arrays; `BUILT_UNITS = [1..14]`.

**A2 — Reachability wiring (BINDING).** PASS. All 7 new `DrillTypeId`
values are wired into `DrillTypeId`, `DRILLED_UNITS` (12,13,14 added),
`canEverHaveAudio` (leader-word/numeral → true; special-sign/phrase →
false), `canDrillTypeScore` (7 matching branches), `reachableDrillTypesForUnit`
(new unit 12/13/14 branches, own-session sourcing since these items are
unit-tagged directly, unlike units 10/11's cross-unit sourcing), and
`VALID_KINDS_FOR_DRILL_TYPE` (`lib/thai/drill.ts`) + `DrillType`
(`lib/thai/types.ts`). `maxAchievablePercentForUnit` confirmed 100% for
units 12/13/14 via the live seed run (see Commands Run) — the
`[reachability] OK` lines print for all three units. `findUnreachableDrillableIds`
implicitly empty (the same seed-run invariant would throw otherwise).
Confirmed `unitMasteryStats`/`getUnitSummaries` use
`reachableDrillTypesForUnit` (own-session), never
`allReachableDrillTypesForItem` (cross-unit union) — read the full
implementation, this pattern is unchanged from M13 and unit 12/13/14 are
NOT cross-unit-sourced units in the first place (they source from their own
`unit:12/13/14` tagged rows), so the M12-era deadlock class cannot recur for
them. Verified `canDrillTypeScore` is a genuinely independent
re-implementation (not calling into `reachableDrillTypesForUnit`), so a
future gap between the two functions would be caught by
`assertEveryUnitCanReach100Percent` at seed time — reasoned through this
architecturally (did not live-break the file, per reviewer boundaries) by
confirming the two functions share no code path and would diverge visibly
if one were edited without the other (e.g. removing the `audio-leader`
branch from `canDrillTypeScore` while leaving it in
`reachableDrillTypesForUnit` would immediately drop unit 12's
`maxAchievablePercentForUnit` below 100, which the seed script throws on).
`assertPhraseBoundariesValid` (new, `scripts/seed-thai-db.ts`) independently
re-verifies every phrase's `boundaries` are strictly increasing, in range
`1..len-1`, and reproduce `syllables[i].thai` on re-split — ran and printed
`OK — every unit-14 phrase (20 checked)` on both my own seed runs.

**A3 — Unit 12 drills.** PASS. `sign-function`: 4-way MC, distractors are
the other 3 signs' own (functionKey, functionLabel) — always exactly 3
distractors since only 4 rows exist total (verified via
`signFunctionDistractors`). `leader-tone`: 5-way MC via `toneDistractors`
(all 4 other tones from the 5-tone `Tone` union) — this structurally
guarantees the "tone without the leader" adversarial distractor is always
present (verified `TONE_ORDER` has exactly 5 elements matching `Tone`).
Reveal shows `gloss — derivation` (confirmed in `buildQuestion`).
`audio-leader`: degrades gracefully (`buildSubjectPool` only adds
`audio-leader` to a subject's drillTypes when `item.audioUrl` is truthy;
`buildQuestion` also independently returns `null` if `!audioUrl`) —
distractors prefer the adversarial leaderless-base spelling
(`[...display].slice(1)`, e.g. หมา→มา) plus other leader words, verified no
collision risk by hand-checking all 12 words' leaderless forms are mutually
distinct and distinct from any full leader-word spelling. Lesson page
(`special-signs-lesson.tsx`) renders the small-marks table, the นา/หนา and
มา/หมา worked contrasts, the true/false-cluster note as prose only (with the
doc's own "not quizzed" / source-note caveat preserved) — spot-compared
against `reading-thai-script.html` lines 758-768, faithful transcription,
no dropped caveat (the M13 lesson's recurring bug class).

**A4 — Unit 13 drills.** PASS. `numeral-value`/`value-numeral` both
implemented with `DIGIT_CONFUSABLE_GROUPS` = `{1:[9], 3:[7], 4:[5], 5:[4],
6:[9], 7:[3], 9:[1,6]}` — verified this correctly encodes the content bank's
curated groups `{๓,๗} {๖,๙} {๔,๕} {๑,๙}` (digit 9 legitimately has two
partners since it appears in two of the curator's pairs; 0/2/8 correctly
fall back to the general pool). `audio-numeral` degrades gracefully
(same `audioUrl`-gated pattern as `audio-leader`). Lesson page
(`numerals-lesson.tsx`) renders the digit table, the "๒๐๒๖ = 2026 / ๙๙ = 99"
note verbatim from doc §9, and the ๑ citation-vs-colloquial caveat from the
content bank's own note.

**A5 — Unit 14 spaceless reading (tap-boundary widget).** PASS — this was
the highest-risk item and got the deepest check. Verified the client
(`phrase-split-question.tsx`) and server (`lib/thai/drill.ts::expectedAnswerFor`)
both import and call the *same* `serializeBoundaries` function from
`lib/thai/types.ts` (`[...new Set(boundaries)].sort((a,b)=>a-b).join(",")`)
— there is no second, independently-written serialization to drift out of
sync (eliminates the whole "client/server format mismatch" bug class by
construction, not just by careful parallel implementation). Boundary
indices confirmed code-point (`[...item.display]` server-side building
`phrase.chars`; client toggle buttons render for `i > 0` over that same
`chars` array, i.e. positions `1..len-1`, matching the documented
"boundary = new-syllable-starts-here" semantics exactly). Confirmed exactly
one `onSubmit` call per phrase: `PhraseSplitQuestion.check()` is guarded by
local `checked` state (button disappears once checked) AND the parent
`DrillSession.submitAnswer` is separately guarded by `phase !== "answering"`
— double-guarded, no double-submit path found. Confirmed the post-split IPA
reinforcement (`phrase.syllables` map) is rendered purely from already-known
client props after `checked` flips true — no second server call, matching
the tone-assembly "one server attempt on the final answer" contract.
Independently re-verified all 20 phrases' `boundaries` arrays reproduce
`syllables[i].thai` by re-reading `m14-content-phrases.md`'s own char-index
breakdown for a sample of 6 phrases (ไปไหน, โรงเรียน, แมวกินปลา, ไปโรงเรียน,
เด็กกินนม, ไปโรงเรียนไทย) against `seed/thai/items.ts` — all match; the
seed-time `assertPhraseBoundariesValid` additionally confirms all 20
mechanically on every run.

**A6 — Audio batch (paid gate, code only).** PASS (code-only, batch
correctly NOT run). `scripts/generate-thai-audio.ts`'s `buildManifest`
gains `leader-word → item.display` and `numeral → item.metadata.name`
(the spoken name, not the glyph) — confirmed via diff, minimal additive
change, no other logic touched. Did not run `npm run audio:thai` (per
instructions).

**A7 — Course-complete wrap-up.** PASS. `BUILT_UNITS = [1..14]`,
`TOTAL_UNITS = 14`. Confirmed `getUnitSummaries`' `!built` branch (which
renders "Coming soon" via `unit-row.tsx:23`) can structurally never fire for
any unit 1-14 now, since the summaries loop runs `for (unit = 1; unit <=
TOTAL_UNITS; unit++)` and every one of those units is in `BUILT_UNITS`.
Lesson page's "Next unit →" link condition changed from `unit < 11` to
`unit < 14` — confirmed unit 14's lesson page renders no such link (no
dangling affordance past the final unit). `DRILLABLE_UNITS` in
`app/thai/[unit]/drill/page.tsx` includes 12-14. One residual: project
memory `m11-thai-reading-course-decisions.md` not yet updated (see LOW
findings) — explicitly deferred to the orchestrator per task instructions,
not a code defect.

**A8 — Regression + non-Thai safety.** PASS. Confirmed via `git diff
--stat` that zero Mandarin-scoped files were touched (no `cards`, `words`,
`review_states`, or any non-`thai`/`seed`/`app/thai`/`components/thai`
path in the diff). Confirmed via targeted `git diff | grep '^-'` on
`lib/thai/reachability.ts`, `lib/thai/drill.ts`, `lib/thai/types.ts`,
`lib/thai/actions.ts`, `seed/thai/types.ts`, and `seed/thai/items.ts` that
every removed line is a union-type/array/import-list line immediately
replaced by an extended version — no existing unit 1-11 branch logic was
edited, only appended to. `components/thai/drill/drill-session.tsx`'s diff
confirmed purely additive (wraps existing MC-render block in a new
`!isPhraseSplit` conditional; adds one new `isPhraseSplit` branch before the
existing `tone-assembly` branch; nothing else changed). `npm run build` /
`npx tsc --noEmit` / `npm run lint` all clean (my own re-run, see below).
`npm run seed:thai` idempotent across two of my own runs (`0 inserted, 241
upserted-as-update, 0 deleted` both times), all four invariant OK lines
printed both times.

## Commands Run

All commands below are **my own** re-runs (not the implementer's pasted
output), run fresh from a clean shell in the repo root.

- `npx tsc --noEmit -p tsconfig.json` — exit 0
  ```
  (no output — clean)
  ```
  Matches the implementer's claim.

- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  (no findings). Matches the implementer's claim.

- `npm run build` — exit 0
  ```
  ✓ Compiled successfully in 7.3s
    Running TypeScript ...
    Finished TypeScript in 10.0s ...
    Collecting page data using 10 workers ...
  ✓ Generating static pages using 10 workers (6/6) in 912ms
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
  Same route table as the implementer's paste. Matches.

- `npm run seed:thai` (my own run #1, against the already-seeded live DB)
  — exit 0
  ```
  [reachability] OK — every drillable item across units 2,3,4,5,6,7,8,9,10,11,12,13,14 (230 total) is reachable as a drill subject.
  [reachability] OK — every drilled unit (2,3,4,5,6,7,8,9,10,11,12,13,14) can reach 100% percentMastered given its own drill session.
  [reachability] OK — unitMasteryStats correctly scopes unit 2's own percentage to its own reachable drill types (M13/A6 unlock-math regression guard).
  [phrase-boundaries] OK — every unit-14 phrase (20 checked) has boundaries that reproduce its syllable split exactly.
  [delete] 0 dropped item(s).

  Done. 0 inserted, 241 upserted-as-update, 0 deleted. Total items: 241.
  ```

- `npm run seed:thai` (my own run #2, idempotency re-confirmation) — exit 0
  ```
  [reachability] OK — every drillable item across units 2,3,4,5,6,7,8,9,10,11,12,13,14 (230 total) is reachable as a drill subject.
  [reachability] OK — every drilled unit (2,3,4,5,6,7,8,9,10,11,12,13,14) can reach 100% percentMastered given its own drill session.
  [reachability] OK — unitMasteryStats correctly scopes unit 2's own percentage to its own reachable drill types (M13/A6 unlock-math regression guard).
  [phrase-boundaries] OK — every unit-14 phrase (20 checked) has boundaries that reproduce its syllable split exactly.
  [delete] 0 dropped item(s).

  Done. 0 inserted, 241 upserted-as-update, 0 deleted. Total items: 241.
  ```
  Both of my runs are consistent with each other and with the implementer's
  claimed output (`0 inserted, 241 upserted-as-update, 0 deleted`, all four
  invariant OK lines, 230-item reachability total). No discrepancy found
  between my re-run and the implementer's pasted output.

- `git diff HEAD --stat` — exit 0 (used to verify A8's Mandarin-isolation
  and additive-only claims; output reproduced in the Assertions section
  above). Confirmed 13 files changed, all within
  `lib/thai/*`, `seed/thai/*`, `app/thai/*`, `components/thai/*`,
  `scripts/{seed-thai-db,generate-thai-audio}.ts`, plus the two plan docs.

Did NOT run `npm run audio:thai` (paid gate, correctly out of scope per
task instructions).

## Residual Risk
- The paid audio batch (`audio:thai`) has not been run. Until it runs,
  `audio-leader` and `audio-numeral` sample nothing and units 12/13 will
  legitimately sit below 100% for a learner who has otherwise mastered
  every other drill type in those units — this is the same documented,
  intentional M12/M13 re-lock pattern, not a defect, but it means the
  course is not yet fully "complete" end-to-end from a learner's
  perspective until that batch runs and the clips land.
- Project memory (`m11-thai-reading-course-decisions.md`) has not been
  updated with the M14-shipped / course-complete entry. Deferred to the
  orchestrator per the implementer's task instructions — flagging so it
  isn't silently dropped once this milestone's handoff chain closes.
- No automated test suite exists in this repo (verified via `package.json`
  — only `lint`/`build`/`tsc`/the seed-time invariants serve as
  verification, consistent with all prior Read-Thai milestones). This is
  pre-existing project structure, not something introduced by M14, but
  means correctness relies on the seed-time invariants + manual/reviewer
  content spot-checks rather than an executable regression suite for the
  drill-scoring logic itself.
- I did not execute a live "deliberately break the wiring" test against
  `lib/thai/reachability.ts` (would require editing a source file, which is
  outside this review's write boundary). My confidence that the seed
  invariant would fire on a real gap is based on static code reading
  (confirming `canDrillTypeScore` and `reachableDrillTypesForUnit` are
  independently written with no shared implementation to both drift
  incorrectly) rather than an executed regression test.

## Procedure Compliance
- Plan (`active-plan.md`, A1-A8 + locked decisions + doc quotes) consulted
  before review: yes, read in full.
- Implementation summary read before review: yes, read in full, all
  Commands Run / Issues Discovered / Spec Deviations sections cross-checked
  against my own independent re-run and code reading.
- Content bank (`m14-content-bank.md` + all three per-bucket artifacts)
  read and spot-checked against seeded content verbatim: yes — all 12
  leader words, all 10 numerals, and all 20 phrases individually compared
  field-by-field against `seed/thai/items.ts`.
- Commands independently re-run (not trusting implementer's paste): yes —
  `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run seed:thai`
  (twice) all re-run fresh by me with verbatim output captured above; no
  discrepancy found versus the implementer's claims.
- Review summary written: yes (this file).

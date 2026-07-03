---
status: COMPLETE
updated: 2026-07-03
---

# Review Summary - M13 Read Thai (tone-rules engine, syllable decode, word-bank expansion)

## Result
APPROVE-WITH-FINDINGS (Round 2, final)

Round 1 result (REQUEST-CHANGES) is preserved below for the record. Round 2
fixed the HIGH finding and 2 of the 3 LOW findings; the third LOW was
correctly left unfixed per my own Round-1 "awareness only, not a new gap"
note. No new issues introduced. See "Round 2" section below for the
re-verification.

---

## Round 1 Result (superseded — see Round 2 below)
REQUEST-CHANGES

One confirmed, reproducible HIGH-severity content-correctness bug in the unit-10
`tone-assembly` branching builder (affects 20/100 word-bank rows — 20% of the
unit's content). All other assertions (A1, A3-A7) pass on independent re-run.
This is not a security, data-loss, or reachability/mastery-deadlock bug — it is
a curriculum-accuracy defect in a graded exercise that directly contradicts
both the source doc's own flowchart annotation and this same PR's own lesson
copy. Given A2 explicitly requires "mirroring the doc's full flowchart," and
the fix is a small, well-scoped one-line gate, I'm recommending it be fixed
before calling A2 done rather than deferring it.

## Files Reviewed
- `.claude/plans/active-plan.md` (Validation Contract A1-A7)
- `.claude/plans/implementation-summary.md`
- `.claude/plans/m13-word-bank.md` (vetted artifact)
- `lib/thai/reachability.ts`
- `lib/thai/drill.ts`
- `lib/thai/actions.ts`
- `lib/thai/queries.ts`
- `lib/thai/mastery.ts`
- `lib/thai/tone.ts`
- `lib/thai/types.ts`
- `seed/thai/types.ts`
- `seed/thai/items.ts`
- `scripts/seed-thai-db.ts`
- `scripts/generate-thai-audio.ts` (unmodified — confirmed via `git status`)
- `app/thai/[unit]/lesson/page.tsx`
- `app/thai/[unit]/drill/page.tsx`
- `components/thai/drill/drill-session.tsx`
- `components/thai/drill/tone-assembly-question.tsx`
- `components/thai/lessons/tone-rules-lesson.tsx`
- `components/thai/lessons/syllable-decode-lesson.tsx`
- `components/thai/unit-row.tsx`
- `lib/db/schema.ts`, `lib/db/migrations/0003_thai_progress_drill_type.sql`
- `seed/thai/research/reading-thai-script.html` (grepped for the tone-rules
  flowchart / tone-grid sections to independently verify the doc's actual
  rules, not just the plan's paraphrase of them)

## Findings

### CRITICAL
None.

### HIGH
- **`lib/thai/drill.ts:511-538` (`buildToneAssemblySteps`) — the `tone-assembly`
  branching builder asks a "Short or long vowel?" step for every unmarked dead
  syllable, regardless of initial-consonant class. The source doc explicitly
  states this step is class-gated: `seed/thai/research/reading-thai-script.html`
  (grepped independently) reads *"④ Dead: how long is the vowel? (length only
  matters for the Low class)"* and gives a worked example: *"Mid + dead → low
  (for Mid class, length makes no difference)."* `lib/thai/tone.ts`'s own
  `TONE_GRID_ROWS` data confirms this: for "dead, short" vs "dead, long," Mid
  and High class both resolve to `low` in both rows (only Low class differs:
  `high` vs `falling`). The same implementer's own `components/thai/lessons/
  tone-rules-lesson.tsx:27` states this correctly in prose: *"for dead
  syllables only, the vowel length (short or long) — length never changes the
  answer for mid/high class."* The drill mechanic contradicts its own lesson
  page.
  - I independently probed the seed data: 20 of the 100 word-bank rows are
    `asmEligible: true`, unmarked, dead, and mid/high class (ปาก, บาป, เด็ก,
    ดอก, เจ็ด, จับ, ตัด, ติด, ผัก, หก, สุข, ขับ, ตอบ, ปีก, บาท, ออก, ขาด, สอบ,
    ฝาก, ถูก — script + output captured under Commands Run below). For every
    one of these, the `tone-assembly` drill asks the learner to pick short/long
    vowel as if it determines the tone, when per the doc it does not.
  - Does NOT cause an incorrect final score: the vowel-length step is
    client-side-only feedback (per contract), and the final `tone` step's
    correct answer is `metadata.tone`, independent of what the learner picks
    at the length step. The bug is purely in which steps get *asked*, not in
    the scored outcome — but it actively teaches an incorrect mental model
    for 20% of unit 10's content, and directly violates A2's "mirroring the
    doc's full flowchart" requirement.
  - Fix direction: gate the vowel-length step (and its subsequent branching)
    on `cls === "low"` in `buildToneAssemblySteps`; for mid/high class dead
    syllables, go straight from the live/dead step to the tone step (whose
    correct answer is always `low` for those two classes per the grid).

### MEDIUM
None.

### LOW
- `lib/thai/actions.ts:157` — `if (gatingUnit >= 2)` is now a tautology: since
  `DRILLED_UNITS` starts at 2 (`lib/thai/reachability.ts:82`) and
  `unitOfferingDrillType` already threw on `null` two lines above, `gatingUnit`
  can never be `< 2` at this point. The A6.1 fix (`> 2` → `>= 2`) is correct
  and closes the described bypass, but the resulting conditional is dead
  weight — harmless, but worth simplifying to an unconditional block (or a
  comment noting the invariant) so a future reader doesn't wonder what case
  `< 2` is guarding against.
- `lib/thai/reachability.ts:389-441` (`assertUnitMasteryScopingGuard`) — a
  well-constructed, non-vacuous positive/negative-control fixture (confirmed:
  it derives the positive-control's required-types set from
  `reachableDrillTypesForUnit` itself rather than hardcoding, avoiding the
  M13 implementer's own first-draft mistake noted in "Issues Discovered").
  Residual limitation, already honestly documented in the file's own header
  comment (lines 337-345): the guard only proves `unitMasteryStats` itself is
  correctly scoped — it does not assert that `getUnitSummaries` actually
  calls `unitMasteryStats` rather than reintroducing the old cross-unit logic
  inline. A future regression that bypasses `unitMasteryStats` entirely
  (rather than breaking it) would not be caught. Not a new gap introduced by
  this PR; flagging for awareness only.
- `lib/thai/reachability.ts:150-152` (`canDrillTypeScore` case `"mark-tone"`)
  vs `lib/thai/reachability.ts:246-247` (`reachableDrillTypesForUnit`'s unit-10
  branch) — `canDrillTypeScore` requires both `toneMark != null` AND
  `tone != null`, but the unit-10 branch only gates on `toneMark != null` when
  deciding to offer `mark-tone`. Currently harmless (I confirmed empirically:
  every word-bank row with `toneMark` set also has `tone` set — 0/100
  mismatches), but the two functions are meant to be independently
  cross-checked (per this file's own header, "deliberately NOT shared code");
  right now they'd only actually disagree if a future word-bank row shipped a
  mark without a resolved tone, which would silently drop that word from
  `maxAchievablePercentForUnit`'s 100% rather than fail loudly at the specific
  offending row. Low risk given current data; worth a matching `tone != null`
  check in the unit-10 branch for defense in depth.

## Assertions Checked

- **A1 (word-bank expansion + tone metadata)** — PASS. Mechanically counted
  100 `kind: "syllable"` rows in `seed/thai/items.ts` (`grep -c`). Spot-checked
  20+ rows word-for-word against `m13-word-bank.md` (existing 30: ปลา, พร,
  ทราย, สบาย; new 70: มด, ทุก, รับ, ได้, ใต้, โต๊ะ, เก๊, ตั๋ว, เก๋, เดี๋ยว) —
  verbatim match on Thai/IPA/gloss/class/mark/live/len/final/tone/asm for
  every row checked, including the two corrected irregular rows (ได้/ใต้:
  `vowelLength: "long"` despite the `ไ◌`/`ใ◌` short-vowel-looking spelling,
  with the artifact's own "CORRECTED" note preserved in `sourceNote`) and the
  four irregular-content rows (โต๊ะ's `finalSound: null` with the ʔ
  explanation preserved; พร/ทราย's `asmEligible: false` with the irregular-
  spelling note; สบาย's all-null tone-derivation fields with the
  multi-syllable note). Independently re-derived tone from
  class+mark/live+length against a from-scratch transcription of the doc's
  tone grid for all 100 rows: 99/99 resolvable rows match, 1 correctly
  skipped (สบาย) — see Commands Run. `npm run seed:thai` run twice by me
  (fresh state already applied; both runs idempotent) — second run: 0
  inserted / 195 upserted / 0 deleted, matching the implementer's claim
  exactly. Drillable-flip for the 9 previously-`finalSound:null` rows
  (ปลา, ดี, มือ, คา, ขา, ข่า, นา, มา, ไป) confirmed `drillable: true` in the
  seed source and DB (`syllable drillable: [{ drillable: true, n: 100 }]`).
  No M11-style unreachable-denominator regression — the seed-time invariants
  (`assertEveryDrillableItemIsReachable`, `assertEveryUnitCanReach100Percent`)
  both pass cleanly for units 2-11.

- **A2 (unit 10 tone-rules assembly engine)** — PASS WITH FINDING. Drill type
  wiring (`DrillTypeId`, `DRILLED_UNITS`, `canDrillTypeScore`,
  `maxAchievablePercentForUnit`) all correctly extended and mechanically
  verified via the seed-time invariants (all pass). `mark-tone` MC drill
  correctly built. Unit map / lesson page correctly activate unit 10 (no
  longer "coming soon" — confirmed `BUILT_UNITS` includes 10 and
  `unit-row.tsx`'s `built` flag now renders it live). Unlock gating (≥90% on
  unit 9) unchanged and correctly wired via `getUnitSummaries`. **However**
  the `tone-assembly` branching-step content itself has the HIGH finding
  above: the vowel-length step is not gated on class, contradicting the doc's
  explicit flowchart annotation for 20/100 words. Per-step feedback vs
  single-logged-attempt behavior is correctly implemented and matches contract
  exactly (verified in `tone-assembly-question.tsx` / `drill-session.tsx`
  — only the FINAL step's chosen value ever reaches `submitThaiAttempt`).
  Server-side trust: the server re-derives `expected` from `metadata.tone`
  server-side (`expectedAnswerFor`) and never trusts a client value — same
  established pattern as every other drill type; a client could in principle
  call `submitThaiAttempt` directly with a guessed correct tone without
  walking the UI steps at all, but this is true of every MC drill type in this
  app (not a new vulnerability introduced by tone-assembly) and consistent
  with the app's non-adversarial, self-paced-learner threat model already
  accepted in M11/M12.

- **A3 (unit 11 syllable decode)** — PASS. `word-ipa` 4-option MC verified:
  each distractor mutates exactly one dimension (tone via `retoneIpa`, vowel
  length via `mutateLengthIpa`, final via `mutateFinalIpa`), operating on
  Unicode NFD combining marks matching the corpus's documented diacritic
  convention. Traced the fallback path (pool-based distractors) for words
  lacking enough single-dimension mutations (e.g. open syllables with no
  final) — correctly filters out self-collisions via the `seen` set built
  from `Set` dedup + explicit `!==` checks; no risk of a distractor
  accidentally equaling the correct answer found in review. Gloss + audio
  correctly hidden until `phase === "revealed"` (`hideAudioUntilRevealed` in
  `drill-session.tsx`), gated only for `word-ipa` as specified.

- **A4 (unit 6 audio-word)** — PASS. `audio-word` structurally required for
  every unit-6 word-bank row via `canEverHaveAudio` (kind `syllable` ⇒
  always true — no hidden-vowel-style dead end possible). Confirmed the
  intentional re-lock behavior is correctly wired: `buildSubjectPool`'s unit-6
  branch only offers `audio-word` once `item.audioUrl` is actually populated
  (degrades gracefully pre-batch, same pattern as `audio-letter`/`audio-form`/
  `audio-tone`), while `reachableDrillTypesForUnit`/`maxAchievablePercentForUnit`
  correctly treat it as structurally required regardless of `audioUrl`
  presence — meaning unit 6's `percentMastered` is intentionally capped below
  100% until the paid batch runs and learners re-drill, exactly per the M12
  precedent the contract cites.

- **A5 (audio manifest, paid-gated)** — PASS (pipeline code path only, batch
  correctly NOT run). Confirmed via `git status` that
  `scripts/generate-thai-audio.ts` has zero uncommitted changes — the
  implementer's claim that no code changes were needed checks out: its
  manifest builder already gates on `item.kind === "syllable" && item.drillable`,
  and all 100 word-bank rows are now `drillable: true`. Verified the dry-run
  cost arithmetic independently: 652 chars × $30/1M = $0.01956 ≈ $0.0196
  (matches); 232 chars × $30/1M = $0.00696 ≈ $0.0070 (matches). Did not
  re-run the dry-run myself (no reason to duplicate a read-only, no-spend,
  already-verified command against a script confirmed byte-identical to
  HEAD's already-reviewed M12 version). Batch itself correctly not run —
  owner gate still pending per the contract.

- **A6 (M12 residual fixes)** — PASS.
  - **A6.1 unit-2 bypass**: confirmed closed. `lib/thai/actions.ts:157`'s
    `gatingUnit >= 2` now routes unit-2 attempts through the same
    `getUnitSummaries`-backed unlock check as every other unit (previously
    `> 2` skipped this check entirely for gatingUnit===2). Confirmed no new
    lockout of the unit-1 lesson-marker flow: `markUnit1LessonRead` is a
    separate server action that never calls `submitThaiAttempt` or
    `unitOfferingDrillType`, so it's structurally unaffected (see LOW finding
    above re: the resulting tautological condition).
  - **A6.2 unlock-math regression guard**: confirmed present, non-vacuous
    (positive + negative control, independently re-read), and running on
    every `npm run seed:thai` invocation (I re-ran it myself and saw the OK
    line — see Commands Run). See LOW finding above for its one honestly-
    documented residual gap (doesn't guard against `getUnitSummaries`
    bypassing `unitMasteryStats` entirely).
  - **A6.3 backfill CASE coverage**: the migration SQL
    (`lib/db/migrations/0003_thai_progress_drill_type.sql:45-52`) has exactly
    6 CASE branches (consonant/vowel/syllable/lesson-marker/tone-word/ELSE) —
    I read this independently and confirmed the implementer's claimed test
    matrix (consonant→letter-sound, vowel→form-sound, syllable→word-final,
    lesson-marker→lesson-read, tone-word→audio-tone, ELSE via kind `final`
    →letter-sound) covers all 6 real branches, not a repeated single case.
    The one-off test script was deleted per the established convention before
    I could re-run it myself, so this assertion rests on my independent read
    of the migration SQL + the implementer's pasted output, not a live
    re-run — flagged as residual risk below.

- **A7 (quality gates)** — PASS, independently re-run (see Commands Run). All
  four re-run commands (`tsc --noEmit`, `lint`, `build`, `seed:thai`)
  matched the implementer's claimed exit codes and output shape exactly. DB
  count query re-run independently, matched exactly (195 total / 100
  syllable all drillable / mandarin 204 cards, 478 words unchanged).
  Regression: confirmed no Mandarin files touched (`git status` shows only
  Thai-scoped files), no `/thai/stats` changes (`git status` on that path is
  empty), unit 9's tone-confusion-matrix/audio-tone code paths untouched
  (only shared `DrillSession`/`buildSubjectPool`/`reachability.ts` extended
  with new branches, no existing branches edited — confirmed by reading the
  diffs, not just trusting the claim).

## Commands Run

- `npx tsc --noEmit` — exit 0
  ```
  (no output)
  ```

- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint

  ```

- `npm run build` — exit 0
  ```
  ▲ Next.js 16.2.6 (Turbopack)
  ✓ Compiled successfully in 6.9s
    Running TypeScript ...
    Finished TypeScript in 4.5s ...
  ✓ Generating static pages using 10 workers (6/6) in 458ms
  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ```

- `npm run seed:thai` (my own independent re-run, third time overall including
  the implementer's two) — exit 0
  ```
  [reachability] OK — every drillable item across units 2,3,4,5,6,7,8,9,10,11 (184 total) is reachable as a drill subject.
  [reachability] OK — every drilled unit (2,3,4,5,6,7,8,9,10,11) can reach 100% percentMastered given its own drill session.
  [reachability] OK — unitMasteryStats correctly scopes unit 2's own percentage to its own reachable drill types (M13/A6 unlock-math regression guard).
  [delete] 0 dropped item(s).

  Done. 0 inserted, 195 upserted-as-update, 0 deleted. Total items: 195.
  ```
  Matches the implementer's claimed idempotency evidence exactly (0/195/0).

- Read-only DB count verification (ad-hoc `.mjs` script, written under
  `.artifacts/` per project convention, deleted after use) — exit 0
  ```
  total thai_items: 195
  by kind: [
    { kind: 'consonant', n: 44 }, { kind: 'final', n: 8 },
    { kind: 'lesson-marker', n: 1 }, { kind: 'syllable', n: 100 },
    { kind: 'tone-word', n: 12 }, { kind: 'vowel', n: 30 }
  ]
  syllable drillable: [ { drillable: true, n: 100 } ]
  mandarin cards: 204
  mandarin words: 478
  ```
  Matches the implementer's claimed evidence exactly (no destructive SQL run
  — SELECT-only, per the DB warning constraint).

- Tone-derivation self-consistency check (ad-hoc `.mjs` script importing
  `WORD_BANK` directly and re-deriving tone from an independently-transcribed
  copy of the doc's grid, NOT reusing any of the implementer's code) — exit 0
  ```
  { checked: 99, fails: 0, skipped: 1, total: 100 }
  ```
  Independently confirms the implementer's "99/99 match, 0 mismatches"
  self-consistency claim rather than trusting it.

- Tone-assembly class-gating probe (ad-hoc `.mjs` script, the basis for the
  HIGH finding above) — exit 0
  ```
  20 tone-assembly-eligible words are unmarked+dead+mid/high-class
  [ 'ปาก (mid, long)', 'บาป (mid, long)', 'เด็ก (mid, short)', 'ดอก (mid, long)',
    'เจ็ด (mid, short)', 'จับ (mid, short)', 'ตัด (mid, short)', 'ติด (mid, short)',
    'ผัก (high, short)', 'หก (high, short)', 'สุข (high, short)', 'ขับ (high, short)',
    'ตอบ (mid, long)', 'ปีก (mid, long)', 'บาท (mid, long)', 'ออก (mid, long)',
    'ขาด (high, long)', 'สอบ (high, long)', 'ฝาก (high, long)', 'ถูก (high, long)' ]
  ```

- `grep -rn` on `seed/thai/research/reading-thai-script.html` for the tone
  flowchart's own class-gating text (independent confirmation the doc really
  does say this, not just my inference from the grid) — exit 0, relevant
  lines:
  ```
  637: (length only matters for the Low class)
  725: Mid + dead → low (for Mid class, length makes no difference).
  ```

- `git status --porcelain=v1` — exit 0, confirms
  `scripts/generate-thai-audio.ts` and `app/thai/stats/*` have zero
  uncommitted changes (A5/A7 regression scope claims).

- Mechanical row count: `grep -c 'kind: "syllable"' seed/thai/items.ts` → `100`
  — exit 0.

- Duplicate-id check within `kind: "syllable"` rows (the four cross-kind
  duplicate `display` values the artifact calls out — คา/ขา/ข่า/นา — are
  intentional syllable-vs-tone-word duplicates, not `id` collisions) — exit 0,
  no duplicate `id`s found.

No disagreement found between my re-runs and the implementation summary's
pasted output on any of the above — all counts, exit codes, and console lines
matched exactly.

## Residual Risk

- **A2's HIGH finding is unfixed as of this review.** Recommend the
  implementer add a `cls === "low"` gate before the vowel-length step in
  `buildToneAssemblySteps` (skip straight to the tone step for mid/high class
  dead syllables) before this milestone is called done.
- **A6.3's backfill CASE test was not independently re-run by me** — the
  one-off script was already deleted (per the established no-scratch-files-
  left-behind convention) by the time I reviewed. My PASS verdict rests on
  independently reading the migration SQL's 6 branches and confirming the
  implementer's claimed test matrix maps onto all 6, not on re-executing it.
  Low risk (the SQL is simple and already applied/frozen; this affects a
  historical one-time migration, not live behavior), but noting the gap for
  completeness per this project's "re-run, don't trust" standard.
- **A5's paid batch has not run** — by design (owner gate pending). Pipeline
  code path reviewed and correct; the actual clip generation, upload, and DB
  write-back (`put`/`db.update` calls in `generate-thai-audio.ts`) were not
  exercised by this review (would require spending real money) and remain
  unverified until the gated run happens.
- The three MEDIUM/LOW findings (tautological unit-2 gate check, the
  regression guard's documented architectural limitation, and the
  `mark-tone` cross-check asymmetry) are all low-risk/cosmetic and do not
  block approval on their own.

## Round 1 Procedure Compliance
- Plan consulted before review: yes (`active-plan.md` A1-A7 read in full
  before touching any other file).
- Implementation summary read: yes (not trusted — every command re-run
  independently; every content/data claim spot-checked against source files
  or ad-hoc verification scripts, not just the pasted output).
- Review summary written: yes.

---

# Round 2 — re-review of the HIGH + 2 LOW fixes

## Context
Coordinator reported the implementer fixed the Round 1 HIGH finding and 2 of
the 3 LOW findings (third LOW left unfixed, per my own Round 1 "awareness
only" note). The owner-gated audio batch also ran between rounds (182/195
`thai_items` now have `audio_url`, 100/100 syllables). Neither
`generate-thai-audio.ts` nor `seed:thai` was re-run by the implementer this
round (no seed content changed) — I independently verified this claim rather
than accepting it, and additionally re-ran `seed:thai` myself as a
belt-and-braces idempotency + invariant re-check.

## Re-verification of each fix

### HIGH fix — `lib/thai/drill.ts::buildToneAssemblySteps` class-gated — CONFIRMED FIXED
Read the current source directly (`lib/thai/drill.ts:527-549`): the
vowel-length step is now wrapped in `if (cls === "low") { ...push
vowelLength...}`, followed unconditionally by `steps.push(toneStep("tone"))`.
For mid/high class dead syllables this now produces exactly the 4-step
sequence (class → markPresent → liveDead → tone) with no vowel-length
question; for low class dead syllables the 5-step sequence (…→ vowelLength →
tone) is preserved. The inline comment correctly cites the same doc
annotation and `TONE_GRID_ROWS` reasoning I cited in Round 1. This is a
direct, unambiguous fix of the exact code path I flagged — no partial fix, no
new edge case introduced (the `!vowelLength` defensive null-return is now
only reachable inside the `cls === "low"` branch, which is correct: low-class
dead syllables are exactly the ones for which `vowelLength` must be resolved
for the step to make sense).

I did not re-run the implementer's own (deleted) verification script, but I
did not need to duplicate it: I independently confirmed the fix's
completeness two other ways —
1. Re-read the UI layer (`components/thai/drill/tone-assembly-question.tsx`
   and `components/thai/drill/drill-session.tsx`) and grepped the whole
   `components/` tree for `steps.length`/`stepIndex`/`vowelLength` — every
   reference is fully generic to `steps.length` (`isLastStep = stepIndex ===
   steps.length - 1`, `Step {stepIndex + 1} / {steps.length}`), confirming
   the implementer's claim that these files needed no changes to support a
   variable 4-vs-5-step sequence.
2. Checked file modification timestamps directly (`Get-Item ... LastWriteTime`):
   `tone-assembly-question.tsx` (1:33 PM) and `drill-session.tsx` (1:34 PM)
   both predate the Round 2 edits to `drill.ts`/`actions.ts`/`reachability.ts`
   (2:48 PM) — hard evidence these files were genuinely untouched this round,
   not just an unverified claim in the handoff.

### LOW fix 1 — `lib/thai/actions.ts` tautological check simplified — CONFIRMED, NO REGRESSION
Read `lib/thai/actions.ts:155-164` directly: the `if (gatingUnit >= 2)`
wrapper is gone: the unlock check (`getUnitSummaries` lookup +
`gatingUnitSummary?.unlocked` guard) now runs unconditionally after the
`gatingUnit === null` early-throw, with a comment explaining why `>= 2` was
always true. Behaviorally identical to Round 1's already-correct-but-oddly-
gated version — confirmed no regression (the unit-2-bypass fix from A6.1
still holds; unit-1's lesson marker still bypasses this action entirely via
`markUnit1LessonRead`, unaffected).

### LOW fix 2 — `lib/thai/reachability.ts` `mark-tone` defense-in-depth — CONFIRMED
Read `lib/thai/reachability.ts:239-258` directly: the unit-10 branch's
`mark-tone` condition is now `meta.toneMark != null && meta.tone != null`,
matching `canDrillTypeScore`'s `"mark-tone"` case exactly (both now require
the same two conditions). Confirmed via my own re-run of `npm run seed:thai`
(reachability invariants still pass — see Commands Run) that this is a
genuine no-op against current data, as claimed.

### Third LOW correctly left unfixed
`assertUnitMasteryScopingGuard`'s documented architectural limitation
(`lib/thai/reachability.ts:337-345`) is unchanged — this matches my Round 1
recommendation exactly ("not a new gap introduced by this PR; flagging for
awareness only"). No action needed; confirmed not silently dropped or
mis-scoped in the handoff (implementer's Round 2 section explicitly names it
and explains why it was left).

## New issues introduced this round
None found. I read every changed line in `drill.ts`, `actions.ts`, and
`reachability.ts` (not just the hunks the implementer described) to check for
collateral changes — all three diffs are scoped exactly to what Round 2
claims, no unrelated edits.

## Commands Run (Round 2 — my own independent re-run)

- `npx tsc --noEmit` — exit 0
  ```
  (no output)
  ```

- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint

  ```

- `npm run build` — exit 0
  ```
  ▲ Next.js 16.2.6 (Turbopack)
  ✓ Compiled successfully in 5.2s
    Running TypeScript ...
    Finished TypeScript in 4.1s ...
  ✓ Generating static pages using 10 workers (6/6) in 568ms
  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ```

- `npm run seed:thai` (my own re-run, not strictly required since no seed
  content changed, but run anyway as a belt-and-braces idempotency + audio-
  preservation + invariant check) — exit 0
  ```
  [reachability] OK — every drillable item across units 2,3,4,5,6,7,8,9,10,11 (184 total) is reachable as a drill subject.
  [reachability] OK — every drilled unit (2,3,4,5,6,7,8,9,10,11) can reach 100% percentMastered given its own drill session.
  [reachability] OK — unitMasteryStats correctly scopes unit 2's own percentage to its own reachable drill types (M13/A6 unlock-math regression guard).
  [delete] 0 dropped item(s).

  Done. 0 inserted, 195 upserted-as-update, 0 deleted. Total items: 195.
  ```

- Read-only DB check (ad-hoc `.mjs`, deleted after use) — audio survived my
  own seed re-run intact — exit 0
  ```
  total thai_items: 195
  thai_items with audio_url: 182
  syllable rows with audio_url: 100
  mandarin cards: 204 words: 478
  ```
  Matches the implementer's Round 2 claim exactly (182/195, 100/100
  syllables). Re-checked again after my own `seed:thai` run — still 182,
  confirming the `onConflictDoUpdate` SET clause genuinely never touches
  `audio_url` (I independently verified this by reading
  `scripts/seed-thai-db.ts`'s SET list in Round 1 — `audioUrl`/`audio_url` is
  not among `kind, unit, display, initialIpa, finalIpa, consonantClass,
  metadata, drillable`).

- File-modification-time check (`Get-Item ... LastWriteTime`, PowerShell) —
  confirms `tone-assembly-question.tsx`/`drill-session.tsx` untouched this
  round (1:33-1:34 PM) vs. `drill.ts`/`actions.ts`/`reachability.ts`
  genuinely edited this round (2:48 PM); also confirms `seed/thai/items.ts`
  and `seed/thai/types.ts` untouched since before Round 1's completion
  (1:26-1:29 PM), corroborating the "no seed content changed" claim.

No disagreement found between my Round 2 re-runs and the implementer's Round
2 handoff — all exit codes, counts, and console lines matched exactly.

## Round 2 Assertions Checked
- **A2 HIGH finding** — RESOLVED. Verified by direct source read + UI-layer
  generality check + file-mtime evidence (see above).
- **A6.1-adjacent LOW (tautological check)** — RESOLVED, no regression.
- **A2/A6.2-adjacent LOW (`mark-tone` defense-in-depth)** — RESOLVED, no
  regression, confirmed via passing seed-time invariants.
- **A6.2 architectural-limitation LOW** — correctly left open, as
  recommended.
- **A7 (quality gates)** — PASS, independently re-run, matches exactly.
- **A5 (audio batch)** — the batch itself ran outside this review's scope
  (owner-gated, already executed per coordinator's context); I verified
  read-only that its writes are intact and undisturbed by the Round 2 code
  changes and by my own `seed:thai` re-run (182/195 audio_url populated,
  100/100 syllables — unchanged across three separate read checks I ran).

## Round 2 Residual Risk
- The documented architectural limitation in `assertUnitMasteryScopingGuard`
  (does not guard against `getUnitSummaries` bypassing `unitMasteryStats`
  entirely) remains, by design — informational only, not blocking.
- A6.3's backfill CASE-coverage test still rests on my Round 1 read of the
  migration SQL rather than a live re-run (script was deleted before Round 1
  review; nothing changed about this in Round 2). Unchanged, low-risk,
  already noted in Round 1.
- The actual paid audio batch's execution (API calls, Blob uploads) was still
  not exercised by me directly — I only confirmed its *results* are present
  and undisturbed via read-only SQL. This is expected and appropriate (no
  reason to re-spend money verifying a completed, gated batch).

## Round 2 Procedure Compliance
- Round 1 review summary re-read before this re-review: yes (in full).
- Implementation summary's Round 2 section read: yes (not trusted — every
  claim independently re-verified via direct source reads, greps, file-mtime
  checks, and command re-runs, per this project's "re-run, don't trust"
  standard).
- Review summary updated with Round 2 section and final verdict: yes.
- Frontmatter status/updated kept current: yes (`status: COMPLETE`,
  `updated: 2026-07-03`).

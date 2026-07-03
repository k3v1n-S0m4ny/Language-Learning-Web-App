---
status: COMPLETE
updated: 2026-07-03
---

# Review Summary — M12 Read Thai (audio batch, drillType migration, unit 9, listening drills, confusion matrix)

## Result
**APPROVE-WITH-FINDINGS** (round 2 — see "## Round 2 re-review" below for the
current, authoritative verdict; superseded round-1 verdict retained below for
history.)

## Result (round 1, superseded)
**REQUEST-CHANGES** (BLOCKED)

Two independent CRITICAL bugs make the entire course beyond unit 2 permanently
unreachable through legitimate play, even now that the paid audio batch has
run. This is not the "units may legitimately re-lock" outcome the owner
approved — it is "units can never unlock in the first place." I verified both
computationally against the actual shipped code (not the implementer's own
tooling), reproduced below.

## Files Reviewed
- `lib/db/schema.ts`, `lib/db/migrations/0003_thai_progress_drill_type.sql`, `lib/db/migrations/meta/0003_snapshot.json`, `lib/db/migrations/meta/_journal.json`
- `lib/thai/reachability.ts`, `lib/thai/mastery.ts`, `lib/thai/queries.ts`, `lib/thai/actions.ts`, `lib/thai/drill.ts`, `lib/thai/types.ts`, `lib/thai/tone.ts`, `lib/thai/stats.ts`
- `seed/thai/items.ts`, `seed/thai/types.ts`, `seed/thai/research/reading-thai-script.html` (tone table + worked examples, cross-checked against `TONE_WORDS`/`TONE_CONTOUR_POINTS`)
- `scripts/generate-thai-audio.ts`
- `components/thai/audio-play-button.tsx`, `components/thai/drill/drill-session.tsx`, `components/thai/lessons/tone-ear-lesson.tsx`, `components/thai/lessons/tone-sparkline.tsx`, `components/thai/stats/tone-confusion-matrix.tsx`
- `app/thai/[unit]/lesson/page.tsx`, `app/thai/[unit]/drill/page.tsx`, `app/thai/stats/page.tsx`
- `package.json`, `eslint.config.mjs`
- `.claude/plans/active-plan.md`, `.claude/plans/implementation-summary.md`, `.claude/plans/m11-archive--active-plan.md`, `.claude/plans/m11-archive--review-summary.md`
- Live dev DB (Neon), queried directly (see Commands Run)

## Findings by Severity

### CRITICAL

**1. `lib/thai/reachability.ts:141-151` + `lib/thai/queries.ts:61-67` — STRICT cross-unit mastery creates a permanent unlock deadlock for units 2-5, blocking the entire course past unit 2, independent of audio.**

`allReachableDrillTypesForItem` unions a drill type across **every** unit in
`DRILLED_UNITS` (`[2,3,4,5,6,7,8,9]`) unconditionally, and `isItemFullyMastered`
(used by `getUnitSummaries` to compute a unit's own `percentMastered`, which
directly gates the next unit's unlock) requires that full cross-unit set.
Every consonant taught in units 2-5 that can end a syllable (`finalIpa !==
null`) is therefore required to have its `letter-final` streak mastered
before it counts toward its **home** unit's percentage — but `letter-final`
is only ever offered as a question inside a **unit-6** drill round
(`buildSubjectPool`'s `unit === 6` branch), and unit 6 is itself locked until
unit 5 reaches 90%. Since unit 3/4/5/6 all chain off unit 2's percentage
(`getUnitSummaries`'s `previousUnitUnlocksNext`), and unit 2 cannot reach
anywhere near 90% without unit-6-only drilling, **no unit past unit 2 can
ever unlock through the shipped UI, permanently** (not "until the batch
runs" — this has nothing to do with audio).

I verified this independently by importing the actual shipped
`lib/thai/reachability.ts` and `seed/thai/items.ts` and computing, for each
drilled unit, how many of its own items require a drill type NOT offered in
that unit's own session:

```
unit 2:  9 items, 8 need an out-of-unit drill type -> max achievable pct = 11%
unit 3: 10 items, 6 need an out-of-unit drill type -> max achievable pct = 40%
unit 4: 12 items, 12 need an out-of-unit drill type -> max achievable pct = 0%
unit 5: 11 items, 10 need an out-of-unit drill type -> max achievable pct = 9%
unit 6: 21 items, 0 need an out-of-unit drill type -> max achievable pct = 100%
unit 7-9: 0 need an out-of-unit drill type -> 100%
```

All of units 2, 4, 5 (and effectively 3) are far below the 90% unlock
threshold **even in the best case where every locally-drillable skill is
perfectly mastered**. Since unit 3's unlock requires unit 2 ≥90% (max 11%
achievable), the entire chain 3→4→5→6→7→8→9 is permanently locked. This
means unit 9 (tone-ear, the headline feature of this milestone) can never be
reached by a real learner — QA's own protocol will hit this wall the moment
it tries to progress past unit 2.

This is the exact "denominator counts an item whose drill type has no
reachable path" bug class that M11 review caught twice (round 1: `FinalItem`
rows; round 2: null-`finalSound` word-bank rows) — recurring here in a new,
worse form: the drill type IS reachable (reachability.ts correctly reports
it), but only from a **later, currently-locked unit**, which the mechanical
seed-time invariant (`findUnreachableDrillableIds`) cannot detect because it
only checks "is this item reachable via *some* drill type," not "is the
percentage this unit needs to unlock the next one actually achievable given
the unlock ORDER."

Fix direction: decouple "is this item's absolute/lifetime mastery complete"
(fine to be the full cross-unit union, used for badges/stats) from "what
does THIS unit's own percentMastered require to satisfy the unlock
threshold" (should only require drill types reachable within that unit's
own session, or explicitly whichever unit the plan assigns the skill to —
per the Appendix, "letter→final sound" belongs to unit 6, not units 2-5).

**2. `lib/thai/drill.ts:192-204` + `scripts/generate-thai-audio.ts:58-62` — the two "hidden vowel" items in unit 8 can never get audio, so unit 8 can never exceed 83% (< 90% unlock threshold), blocking unit 9 independently of Finding 1.**

`vowel:hidden-o` and `vowel:hidden-a` (unit 8, `drillable: true`) have no
written form (`display: "(unwritten, closed syllable)"` / `"(unwritten,
short word)"`), so `deriveVowelAudioText` in the audio script correctly
returns `null` for them and skips them — **by design, permanently, not a
batch-timing gap**. Confirmed against the live DB: both rows still have
`audio_url IS NULL` after the batch ran. But `reachableDrillTypesForUnit`
marks `audio-form` as structurally reachable for **every** drillable vowel
in units 7/8, with no exception for the two hidden-vowel rows, so
`isItemFullyMastered` requires them to have an `audio-form` 3-streak that
can never exist (their `audioUrl` is permanently `null`; `buildSubjectPool`
only adds `"audio-form"` to a subject's `drillTypes` when `item.audioUrl` is
truthy, so the drill session never even offers the question). Max achievable
`percentMastered` for unit 8 = 10/12 = 83% — permanently below 90%, so unit
9 cannot unlock even if Finding 1 is fixed.

This is the identical bug class again (M11 round 1/round 2), now
re-introduced via the new `audio-form` drill type for content that can
never have audio.

Fix direction: either exclude the two hidden-vowel rows from `audio-form`
reachability (mirroring how `FinalItem`/no-final-sound `SyllableItem` rows
were excluded from their respective drill types in M11), or give them a
genuine written carrier form to synthesize audio for. Whichever is chosen,
extend the seed-time invariant to assert "every structurally-required drill
type for a drillable item has a code path that can eventually produce a
scoreable question," not just "is reachable at all."

### HIGH

- **`lib/thai/actions.ts:111-125` — `submitThaiAttempt` never checks that
  the target unit is unlocked.** The drill *page* (`app/thai/[unit]/drill/page.tsx:31`)
  gates rendering on `current?.unlocked`, but the server action itself
  accepts any `(itemId, drillType, chosen)` triple from any authenticated
  learner regardless of that learner's actual unlock state — it is a
  directly-invocable Server Action (per its own comment on
  `setActiveMode`). The "expected" answer is correctly re-derived
  server-side (not spoofable — this is the M11 HIGH fix, still solid), so
  this isn't an integrity exploit in the traditional sense, but it means the
  **only** way a learner could route around Findings 1-2's deadlock is by
  bypassing the UI entirely and calling the action directly for
  `drillType: "letter-final"`/`"audio-form"` on items never offered by any
  round the UI would render for a locked unit — which is not a fix, just
  evidence the intended flow is broken. Pre-existing gap (not introduced by
  M12; M11's review didn't flag it either), but its consequence is much more
  severe now that the intended path is a dead end. Recommend adding an
  explicit unlock check to `submitThaiAttempt` regardless of the above
  fixes.

### MEDIUM

- **`lib/db/migrations/0003_thai_progress_drill_type.sql` backfill logic
  untested on real data** — 0 pre-existing `thai_progress` rows in the dev
  DB (confirmed: `thai_progress rows: 0`), so the dominant-drillType
  `DISTINCT ON` tie-break (most attempts, ties → most recent) has never run
  against actual data. The SQL is logically sound on inspection, but this is
  worth a synthetic-data dry run before this migration is ever applied to a
  DB with real progress history (e.g. a future environment promotion).

### LOW

- **`lib/thai/tone.ts:19-25` `TONE_CONTOUR_POINTS` is not an exact affine
  transform of the doc's own SVG polylines**, despite the comment claiming
  "transcribed from the research doc's own SVG polylines." Recomputing the
  doc's `viewBox 0 0 34 22` points onto the claimed shared 0-20 range via
  `(y-4)*1.25` gives `low: "0,15 34,20"` (shipped: `"0,14 34,18"`),
  `falling: "0,5 34,20"` (shipped: `"0,4 34,18"`), `rising: "…20…4"`
  (shipped: `"…18…3"`). The qualitative shape/direction of every contour is
  preserved (mid flat, low slightly down, falling starts-high-ends-low,
  high pushes up, rising dips-then-rises) so this is cosmetic only, not a
  data-correctness bug — but the comment overstates precision.
- `components/thai/lessons/tone-ear-lesson.tsx:19` family ordering depends
  on DB row order with no `ORDER BY` (already flagged by the implementer as
  a known, accepted cosmetic risk) — confirmed, not re-litigating.
- Word-bank (unit 6) audio is generated but no tracked drill type consumes
  it beyond the generic "▶ Hear it" reveal button — documented spec
  deviation, acceptable reading of an ambiguous bullet.

## Tone data correctness (spot-checked against `reading-thai-script.html`)
Verified every `TONE_WORDS` entry against the doc's own tone grid (§6, "The
tone grid for Standard Thai") and worked examples (§"tones" practice
block, §"tone-diacritics" carrier-อ demonstration, §"special" silent-ห
example): คา(mid)/ขา(rising)/ข่า(low) match the doc's own stated answers
exactly; ค่า(falling)/ค้า(high) match the grid's Low-class ◌่/◌้ rows;
อา/อ่า/อ้า/อ๊า/อ๋า (mid/low/falling/high/rising) match the doc's Mid-class
grid row and its own stated ordering ("mid, low, falling, high, rising");
นา(mid)/หนา(rising) match the doc's explicit silent-ห worked example. No
tone errors found.

## Assertions Checked
- **A1 (drillType migration + STRICT mastery + reachability):** FAIL —
  schema/migration/reachability-function mechanics are correct in isolation,
  but the STRICT aggregation as wired into `getUnitSummaries` creates the
  permanent deadlock in Finding 1, and the reachability guard's own
  invariant cannot detect it (see Finding 1 detail).
- **A2 (audio batch pipeline):** PASS — independently queried the dev DB:
  103/103 manifested items have a non-null `audioUrl` under `audio/thai/`
  (0 rows with a non-`audio/thai/` prefix), idempotent/resumable behavior
  confirmed via the single ledger entry (`made: 51, reused: 52` — consistent
  with a resumed run after the reported ECONNRESET), Mandarin `audio/`
  paths untouched.
- **A3 (tone-ear unit 9):** FAIL (blocked) — the unit's own code (lesson
  tiles, sparkline, audio-tone question builder, all 12 tone-word rows'
  audio present) is correct in isolation, but unit 9 is permanently
  unreachable per Findings 1 and 2, so it cannot be behaviorally validated
  end-to-end as written.
- **A4 (listening drill types):** PARTIAL — `audio-letter`/`audio-form`
  gating on `audioUrl`, ฃ/ฅ exclusion, and the reachability guard extension
  are all implemented correctly; but `audio-form`'s reachability rule is
  the direct cause of Finding 2, and the whole feature is unreachable in
  practice per Finding 1.
- **A5 (tone-confusion matrix):** PASS (structurally) — correct 5×5 grid
  construction, empty-state handling, consistent styling; not yet exercisable
  end-to-end because unit 9 can never be reached (downstream of A1).
- **A6 (quality gates + regression):** PARTIAL — the three quality gates
  pass (independently re-run, see below, matches implementer's claims
  exactly). The regression clause ("existing Thai units 1-8 behavior
  unchanged... thai learner's M11 drills still work") FAILS on its unlock-
  progression sub-clause: a fresh Thai learner can no longer progress past
  unit 2 at all, which is a core part of what "M11 drills still work" means
  (M11's A4 unlock contract).

## Commands Run
All re-run independently in this review session, not copy-pasted from the
implementation handoff.

- `npx tsc --noEmit` — exit 0, no output. Matches implementer's claim.
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  Matches implementer's claim (no errors).
- `npm run build` — exit 0
  ```
  ✓ Compiled successfully in 4.6s
  Running TypeScript ...
  Finished TypeScript in 6.3s ...
  ✓ Generating static pages using 10 workers (6/6) in 896ms
  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ```
  Matches implementer's claim.
- `npm run seed:thai` — exit 0
  ```
  [reachability] OK — every drillable item across units 2,3,4,5,6,7,8,9 (105 total) is reachable as a drill subject.
  [delete] 0 dropped item(s).
  Done. 0 inserted, 125 upserted-as-update, 0 deleted. Total items: 125.
  ```
  Idempotent re-run confirmed (0 inserted/deleted, all upserted). Matches
  implementer's item counts.
- `npm run audio:thai -- --dry` — exit 0
  ```
  [manifest] 103 clips, 408 total chars, est cost $0.0122 (Google Chirp3-HD $30/1M chars).
  [manifest] written to .artifacts/thai-audio/manifest.json
  [dry-run] no API calls made, no Blob uploads, no DB writes.
  ```
  Matches implementer's claim exactly; confirmed zero network calls (no
  hang, instant return, no ledger.json timestamp change).
- Independent DB verification (one-off Node/tsx script against the live dev
  DB, not a repo script):
  ```
  total thai_items: 125
  with audio_url: 103
  null audio_url breakdown: lesson-marker/unit1(1), consonant/unit3(1, =ฃ),
    consonant/unit5(1, =ฅ), final/unit6(8, expected — finals never get audio),
    syllable/unit6(9, expected — non-drillable word-bank rows), vowel/unit8(2,
    =hidden-o/hidden-a — Finding 2)
  bad-prefix urls (should be empty): []
  thai_progress rows: 0
  thai_attempts rows: 0
  tone words: all 12 rows have audio_url; tones verified against research doc (see above)
  ```
- Independent reachability/deadlock computation (one-off Node/tsx script
  importing the actual shipped `lib/thai/reachability.ts` +
  `seed/thai/items.ts`, no DB): produced the per-unit max-achievable-percent
  table quoted in Finding 1.

## Residual Risk
- Even after Findings 1-2 are fixed, `submitThaiAttempt`'s missing
  unlock check (HIGH) remains — a learner could still self-advance streaks
  for units ahead of their actual unlock state via direct action calls. Not
  blocking this review's verdict on its own, but should be fixed alongside.
- Migration backfill logic (MEDIUM) has never run against non-empty
  `thai_progress`; low risk given the current 0-row dev DB, but untested
  logic on a future non-empty environment.
- `thai_progress`/`thai_attempts` are both empty in the dev DB, so none of
  this review's findings have yet produced bad persisted data — but they
  will the moment any learner starts using Thai mode post-deploy.
- Tone-contour sparkline coordinates (LOW) are approximate, not exact —
  cosmetic only.

## Procedure Compliance
- Plan consulted before review: yes (`active-plan.md` + `m11-archive--active-plan.md`)
- Implementation summary read: yes (in full, including Issues Discovered / Spec Deviations)
- Commands independently re-run (not trusted from handoff): yes — tsc, lint,
  build, seed:thai, audio:thai --dry, plus two independent one-off
  verification scripts (DB state, reachability/deadlock computation)
- Review summary written: yes

---

## Round 2 re-review

**Verdict: APPROVE-WITH-FINDINGS**

Both CRITICAL findings are fixed and independently re-verified using a method
I wrote from scratch (not the implementer's `maxAchievablePercentForUnit`
export, and not their claimed numbers). The HIGH finding is substantially
fixed, with one narrow, low-severity residual gap. The MEDIUM finding's
synthetic test covers the CTE tie-break logic fully but only 1 of the SQL's 6
kind-fallback branches. No new CRITICAL/HIGH issues found. Safe to proceed to
QA.

### Files re-reviewed
- `lib/thai/reachability.ts` (new `canEverHaveAudio`, `canDrillTypeScore`,
  `unitOfferingDrillType`, `maxAchievablePercentForUnit`)
- `lib/thai/queries.ts` (new `unitMasteryStats`, per-unit-scoped)
- `lib/thai/actions.ts` (server-side unlock check in `submitThaiAttempt`)
- `lib/thai/tone.ts` (comment fix)
- `scripts/seed-thai-db.ts` (new `assertEveryUnitCanReach100Percent`)
- `.claude/plans/implementation-summary.md` "## Round 2" section (read in full)

### CRITICAL 1 (cross-unit mastery deadlock) — CONFIRMED FIXED
`unitMasteryStats` (`lib/thai/queries.ts:50-61`) now derives both a unit's
item set AND its per-item required drill types from
`reachableDrillTypesForUnit(unit, ALL_THAI_ITEMS)` — the unit's own session —
never from the cross-unit union. I independently recomputed max-achievable
percentMastered with my own from-scratch predicate (`canScoreIndependent`,
written without looking at the implementer's private `canDrillTypeScore`,
using only the exported `reachableDrillTypesForUnit`):

```
unit 2:  9 items -> 100%
unit 3: 10 items -> 100%
unit 4: 12 items -> 100%
unit 5: 11 items -> 100%
unit 6: 57 items -> 100%
unit 7: 18 items -> 100%
unit 8: 12 items -> 100%
unit 9: 12 items -> 100%
PASS: every drilled unit independently recomputed at 100%
```

Every unit now reaches 100% for a hypothetically perfect learner — the
deadlock is gone. I also independently re-derived unit 6's item-set
composition by hand from `seed/thai/items.ts` (counting every drillable
consonant with `finalIpa !== null` across units 2-5, and every drillable
unit-6 word-bank row with a non-null `metadata.finalSound`) and got
**36 + 21 = 57**, matching both the implementer's claim and my script's
independent count (`unit 6 composition: 36 letter-final subjects + 21
word-final subjects = 57 total`). I cross-checked this against
`lib/thai/drill.ts`'s (unmodified) `buildSubjectPool` unit-6 branch
(`fetchConsonantsWithFinal()` + unit-6 word-bank rows filtered by
`computeReachableIds`) and confirmed it offers exactly this same 57-item set
— the mastery denominator and the actual drill session are in sync.

### CRITICAL 2 (hidden vowels can never have audio) — CONFIRMED FIXED
`canEverHaveAudio()` gates `audio-form`/`audio-letter` additions in
`reachableDrillTypesForUnit`'s branches on a structural check (vowel `display`
contains `◌`), which correctly excludes `vowel:hidden-o`/`vowel:hidden-a` (no
written form). Verified via a black-box perturbation test (no source files
touched): I fed a synthetic vowel row with **no carrier circle at all** into
the real, unmodified `reachableDrillTypesForUnit`/`maxAchievablePercentForUnit`
exports for unit 8 — its reachable-map entry came back as `['form-sound']`
only (no `audio-form`), and unit 8 stayed at 100%, confirming the fix
generalizes structurally rather than being hardcoded to the two known IDs.
Also re-ran the live-DB cross-check myself (see Commands Run) — units 2-9 all
still show 100% achievable, and the two hidden-vowel rows remain (correctly,
permanently) audio-less without capping unit 8.

### HIGH (submitThaiAttempt missing unlock check) — SUBSTANTIALLY FIXED, one LOW residual
`unitOfferingDrillType` correctly re-derives the gating unit server-side
(never trusting the client), and a forged/impossible pair (e.g.
`vowel:hidden-o` + `audio-form`, which no longer appears in any unit's
reachable map) is rejected with `gatingUnit === null` before the DB is ever
touched. I tested this against the real, unmodified exported functions
(`unitOfferingDrillType` + `getUnitSummaries`) using a disposable synthetic
learner (inserted into `user`, fully deleted afterward — confirmed 0
leftover rows):

```
--- fresh learner (0 progress rows) summaries ---
unit 1: unlocked=true, unit 2: unlocked=false, unit 3: unlocked=false
unit-2 native pair, fresh learner: gatingUnit=2 -> ALLOWED (unit <=2, unconditionally allowed)
letter-final (gating unit 6), fresh learner, unit 6 NOT unlocked: gatingUnit=6 -> REJECTED (unit 6 not unlocked)
forged pair (hidden vowel + audio-form): gatingUnit=null -> REJECTED (no pairing)
unit-9 pair, fresh learner, unit 9 NOT unlocked: gatingUnit=9 -> REJECTED (unit 9 not unlocked)
```

Units 3-9 are now correctly enforced server-side. **LOW residual, not
blocking**: `submitThaiAttempt`'s `if (gatingUnit > 2)` hard-codes unit 2 as
*unconditionally* allowed rather than checking unit 2's own `unlocked` flag —
but per `getUnitSummaries`, unit 2's `unlocked` is actually
`unit1LessonComplete`, which is `false` for a genuinely fresh learner who
hasn't yet clicked "mark unit 1 read" (confirmed above: `unit 2:
unlocked=false` for a 0-row learner). So a learner who has never touched unit
1 at all could still submit valid unit-2 attempts via a direct action call,
bypassing that one specific (trivial, click-only) gate. This satisfies the
coordinator's explicit ask ("unit-2 attempts still work for a fresh
learner") and has essentially no real-world consequence (unit 1 has no
content beyond a read-marker), but is a minor inconsistency with the app's
own unlock model worth a follow-up (check `gatingUnit === 2` against its own
`unlocked` flag like every other unit, rather than skipping the check
entirely).

### MEDIUM (migration backfill synthetic test) — partially addresses the ask
The round-2 synthetic test (3 cases, all passed, confirmed cleaned up — see
Commands Run) fully exercises the `DISTINCT ON` dominant-by-count and
tie-by-recency logic (the two hardest-to-get-right parts of the migration).
However, of the SQL's step-3 kind-fallback `CASE` with 6 branches
(`consonant→letter-sound`, `vowel→form-sound`, `syllable→word-final`,
`lesson-marker→lesson-read`, `tone-word→audio-tone`, `ELSE→letter-sound`),
only the `vowel` branch (Case C) was exercised. The other 5 are a single flat
mapping each (very low complexity, low risk of a typo-class bug going
undetected), so this is **LOW**, not MEDIUM, residual risk now — downgraded
from round 1's MEDIUM given the CTE logic (the actually complex part) is now
proven correct.

### New invariant (`assertEveryUnitCanReach100Percent`) — reasoned + partially perturbation-tested
- **Content-shape regressions (the actual CRITICAL 2 pattern, and any future
  unit that reintroduces an unscoreable structural requirement)**: confirmed
  it fires correctly via my black-box synthetic-vowel perturbation test above
  — the moment `reachableDrillTypesForUnit` (or the future maintainer adding
  a new drill type) requires something `canDrillTypeScore` disagrees with,
  the percentage drops below 100 and the seed script throws. I did not
  literally edit `reachability.ts` to strip the `canEverHaveAudio` guard and
  re-run the seed script (that would require editing a source file, outside
  this reviewer's boundaries), but by reading the code I confirmed
  `canDrillTypeScore`'s `audio-form`/`audio-letter`/`audio-tone` cases each
  call `canEverHaveAudio` independently of the branch-building code's own
  `if (canEverHaveAudio(i))` guards — two separate call sites sharing the
  same underlying primitive, so a regression that deletes ONE guard (the
  most likely single-line mistake) would still be caught by the other. A
  regression to `canEverHaveAudio` itself (the shared primitive) would evade
  both sides equally — a narrow, low-likelihood blind spot, noted as
  residual risk.
- **Architecture-shape regression (CRITICAL 1's actual pattern — `queries.ts`
  reverting to `allReachableDrillTypesForItem` for unlock math)**: I confirm
  the implementer's own honest disclosure in "Issues Discovered" is
  accurate — `assertEveryUnitCanReach100Percent` runs in a DB-free seed
  script that never imports `lib/thai/queries.ts`, so it structurally cannot
  observe what function `getUnitSummaries` calls. **This means a future
  hand-edit reverting `queries.ts` alone (without touching
  `reachability.ts`) would reintroduce the exact CRITICAL 1 deadlock with no
  automated check catching it** — confirmed by code reading, not by an
  actual reverted-and-reran test (there is no test suite in this repo to run
  against `queries.ts`, and hand-editing it to verify would violate this
  reviewer's "do not edit source files" boundary). This is the same
  limitation the implementer already flagged; I'm independently confirming
  it's real and not overstated. Recommend, as a follow-up (not blocking this
  milestone): either a lightweight runtime assertion inside
  `getUnitSummaries` itself, or documenting this single-call-site contract
  prominently enough that future reviewers check it by hand every time
  `queries.ts` changes.

### Commands Run (round 2, all independently re-run)
- `npx tsc --noEmit` — exit 0, no output.
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
- `npm run build` — exit 0 (same route table as round 1, `✓ Compiled
  successfully in 5.4s`, `Finished TypeScript in 6.7s`).
- `npm run seed:thai` — exit 0
  ```
  [reachability] OK — every drillable item across units 2,3,4,5,6,7,8,9 (105 total) is reachable as a drill subject.
  [reachability] OK — every drilled unit (2,3,4,5,6,7,8,9) can reach 100% percentMastered given its own drill session.
  [delete] 0 dropped item(s).
  Done. 0 inserted, 125 upserted-as-update, 0 deleted. Total items: 125.
  ```
  Matches the implementer's round-2 claim exactly, including the new second
  invariant line.
- `npm run audio:thai -- --dry` — exit 0, unchanged from round 1 (103 clips,
  $0.0122 est cost, zero network calls) — confirms the audio pipeline itself
  was untouched this round, as instructed.
- DB re-verification (one-off Node/tsx script) — exit 0
  ```
  thai_progress rows: 0
  drill_type column: [{"column_name":"drill_type","is_nullable":"NO"}]
  leftover suspicious test users: 0
  ```
  Confirms no synthetic data survives from either my own tests or the
  implementer's round-2 migration/backfill test.
- Independent per-unit max-achievable-percent recompute (own predicate,
  `.mjs` scratch script, deleted after use, imports only the real exported
  `reachableDrillTypesForUnit`) — exit 0, full output quoted in "CRITICAL 1"
  above; all 8 units at 100%.
- Black-box `canEverHaveAudio` perturbation test (synthetic vowel with no
  carrier circle fed into the real, unmodified exported functions, no source
  files edited) — exit 0, full output quoted in "CRITICAL 2" above.
- `submitThaiAttempt` gating logic test (disposable synthetic learner,
  inserted then fully deleted; exercises the real `unitOfferingDrillType` +
  `getUnitSummaries` exports with the exact conditional structure copied from
  `lib/thai/actions.ts`) — exit 0, full output quoted in "HIGH" above;
  cleanup verified (0 leftover rows).

### Residual Risk (round 2)
- LOW: `submitThaiAttempt` hard-codes unit ≤2 as unconditionally allowed
  instead of checking unit 2's own `unlocked` flag — a learner who never
  read unit 1 could still bank unit-2 mastery via a direct action call.
  Trivial real-world impact.
- LOW: the seed-time invariant cannot detect a `queries.ts`-only regression
  back to the cross-unit union for unlock math (architecture-shape half of
  CRITICAL 1) — mitigated only by code comments/documentation, not a
  runtime check.
- LOW: migration backfill's kind-fallback `CASE` is synthetic-tested for only
  1 of 6 branches (the other 5 are trivial one-line mappings).
- LOW: a regression to the shared `canEverHaveAudio` primitive itself (rather
  than to one of its two call sites) would evade both the map-building code
  and the audit predicate equally.
- Unit 6's displayed `totalItems` visibly changes from 21 to 57 on the Thai
  home screen as a correct, intended consequence of the fix — QA should
  expect this new number, not treat it as a regression.
- `thai_progress`/`thai_attempts` remain at 0 real rows in the dev DB — none
  of this has been observed end-to-end with a real learner clicking through
  the UI yet; recommend QA's behavioral pass exercise the full unit 2→9
  unlock chain with a real session, not just the pure-function-level proof
  here.

### Assertions re-checked (A1-A6)
- **A1**: PASS — STRICT per-unit mastery now correctly scoped; migration
  mechanics unchanged and further validated (partial coverage, see MEDIUM
  above, downgraded to LOW).
- **A2**: PASS (unchanged from round 1 — audio pipeline untouched this round).
- **A3**: PASS — unit 9 is now actually reachable through the full unlock
  chain (2→3→4→5→6→7→8→9 all achieve 100% max, confirmed independently).
- **A4**: PASS — `audio-letter`/`audio-form` correctly gated both structurally
  (`canEverHaveAudio`, seed-content-level) and operationally (`item.audioUrl`
  truthy, request-time, in `buildSubjectPool`, unchanged).
- **A5**: PASS (unchanged) — now actually exercisable end-to-end since unit 9
  is reachable.
- **A6**: PASS — all three gates re-run clean; the regression clause now
  holds (a fresh Thai learner CAN progress through the full course
  structurally; the LOW residual above is the only remaining gap, and it's a
  narrow widening of access, not a narrowing/regression).

### Procedure Compliance (round 2)
- Plan consulted before review: yes — `.claude/plans/active-plan.md`,
  `.claude/plans/implementation-summary.md`'s "## Round 2" section (read in
  full), and this file's own round-1 findings (to verify each was actually
  addressed, not just claimed addressed).
- Implementation summary read: yes.
- Commands independently re-run (not trusted from handoff): yes — tsc, lint,
  build, seed:thai, audio:thai --dry, plus four independent scratch scripts
  (DB state, independent max-achievable-percent recompute using my own
  predicate, a black-box structural perturbation test, and a
  synthetic-learner unlock-gating test) — all temp files/synthetic DB rows
  created during this review were deleted/rolled back and independently
  re-verified as gone.
- Review summary updated: yes (this section appended; top-level Result field
  updated to point here).

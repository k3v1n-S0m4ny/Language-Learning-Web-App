---
status: COMPLETE
updated: 2026-07-03
---

# Handoff: M12 — Read Thai audio batch, drillType migration, tone-ear unit 9, listening drills, confusion matrix

Agent: implementer | Date: 2026-07-03 | Status: COMPLETE (all of A1–A6 except the
paid batch run itself, which is explicitly gated to the orchestrator per the
Validation Contract's PAID GATE rule)

## Completed

**A1 — thai_progress drillType migration**
- `lib/db/schema.ts`: `thaiProgress` gains `drillType: text NOT NULL`; unique
  index changed from `(learnerId, itemId)` to `(learnerId, itemId, drillType)`
  (`thai_progress_learner_item_drill_uq`).
- `lib/db/migrations/0003_thai_progress_drill_type.sql` (hand-written custom
  SQL migration, via `drizzle-kit generate --custom`): adds the column
  nullable, backfills each existing `(learner, item)` row's `drill_type` from
  its **dominant** `thai_attempts` history (most attempts, ties → most recent
  attempt timestamp; `DISTINCT ON` window query), falls back to the item
  kind's default drill type for rows with no attempt history
  (consonant→letter-sound, vowel→form-sound, syllable→word-final,
  lesson-marker→lesson-read, tone-word→audio-tone), then sets `NOT NULL` and
  swaps the unique index. Applied via `npm run db:migrate` against the dev DB
  — see Commands Run for before/after row counts (0/0: no pre-existing rows).
- `lib/db/migrations/meta/0003_snapshot.json` hand-patched (added the
  `drill_type` column + renamed index) after `--custom` generation, since
  `--custom` does not diff `schema.ts` — verified with a follow-up
  `drizzle-kit generate` reporting "No schema changes, nothing to migrate".
- `lib/thai/reachability.ts`: rewritten to compute **(item × drillType)**
  reachability, not just item reachability. New `reachableDrillTypesForUnit`
  (per-unit map) and `allReachableDrillTypesForItem` (unions across all
  `DRILLED_UNITS`, now `[2..9]`, for STRICT mastery). `computeReachableIds`
  kept as a thin wrapper (its keys) so `scripts/seed-thai-db.ts`'s existing
  fail-loud invariant check needed no changes — confirmed still fires
  correctly (see Commands Run: `[reachability] OK ... 105 total`).
- `lib/thai/mastery.ts`: added `LESSON_READ_DRILL_TYPE = "lesson-read"`
  sentinel for the unit-1 marker row (needs *some* drillType now that the
  column is NOT NULL).
- `lib/thai/queries.ts`: `getUnitSummaries` now computes "mastered" per item
  via **STRICT** aggregation — `isItemFullyMastered` requires every drill type
  in `allReachableDrillTypesForItem` (structural, not gated on audioUrl) to
  have a `masteredAt` row. `getProgressByItemIds` now returns
  `Map<itemId, ItemDrillProgress[]>` (one row per drillType) instead of one
  row per item.
- `lib/thai/actions.ts`: `submitThaiAttempt`'s upsert conflict target is now
  `(learner_id, item_id, drill_type)`; `newlyMastered` returned to the client
  reflects **item-level** full mastery (checked only on the turn a specific
  drillType's streak first crosses 3, since an already-mastered drillType's
  `mastered_at` is frozen — see in-code comment for why that's sufficient).
  `markUnit1LessonRead` now writes `drillType: LESSON_READ_DRILL_TYPE`.
- `lib/thai/drill.ts`: `expectedAnswerFor` now cross-checks drillType against
  item kind (`VALID_KINDS_FOR_DRILL_TYPE`) before returning an answer — folds
  in the M11 LOW residual explicitly.

**A2 — Thai audio batch pipeline (paid-gated)**
- `scripts/generate-thai-audio.ts` (new) + `npm run audio:thai`. Builds the
  clip manifest from `seed/thai/items.ts`: consonant acrophonic names (units
  2-5, drillable only), vowel sounds (carrier-อ demonstration text, derived
  from each vowel's `display` by replacing `◌` with `อ` — the same
  methodology the research doc itself uses; the 2 "hidden vowel" rows with no
  written form are skipped), unit-9 tone words, and drillable unit-6 word-bank
  syllables.
- Blob paths hashed from `(provider, model, voice, language, text)` under
  `audio/thai/` — NOT text alone — fixing the stale-clip bug pattern at
  `scripts/generate-audio.ts:33-36` for the new Thai path only. That existing
  Mandarin script/prefix (`audio/`) was not touched.
- `--dry` / `DRY_RUN=1`: builds + writes the manifest, prints clip count/total
  chars/est cost, makes **zero** network calls (verified — see Commands Run).
- Real-run path (idempotent list-then-reuse against Blob, uploads, writes
  `thai_items.audioUrl`, appends a JSON cost ledger to
  `.artifacts/thai-audio/ledger.json`) is implemented but was **never
  executed** — PAID GATE honored.

**A3 — Tone-ear unit 9**
- `seed/thai/types.ts` / `seed/thai/items.ts`: new `ToneWordItem` kind
  (`tone-word`) + `Tone` type; `TONE_WORDS` (12 items, 3 minimal-pair
  families — see provenance comment in items.ts): `carrier-อ` (doc's own
  5-tone อา/อ่า/อ้า/อ๊า/อ๋า demonstration, verbatim), `khaa` (doc's worked
  คา/ขา/ข่า example extended to all 5 tones with ค่า/ค้า — the exact real-word
  family the owner already approved and paid-tested,
  `.artifacts/tts-test-clips/ledger.json`), `naa-silent-leader` (doc's
  silent-ห leader example, นา/หนา — a genuine 2-tone pair, not padded to 5 to
  avoid fabricating vocabulary). `BUILT_UNITS` now includes 9.
- `lib/thai/tone.ts` (new): `TONE_ORDER`, `TONE_LABELS`,
  `TONE_CONTOUR_POINTS` (transcribed from the doc's own SVG polylines).
- `components/thai/lessons/tone-sparkline.tsx`, `tone-ear-lesson.tsx` (new):
  listen-and-repeat tiles grouped by family, tone-contour sparkline + label,
  gloss where the doc/word provides one, playback-only (no attempt logged).
  `lib/thai/queries.ts::getToneWords()` reads the DB (not the typed seed,
  which has no `audioUrl` field) so tiles light up once audio lands.
- `components/thai/audio-play-button.tsx` (new, client): shared "▶ Listen"
  control used by the lesson tiles and drill prompts.
- `app/thai/[unit]/lesson/page.tsx`, `app/thai/[unit]/drill/page.tsx`: unit 9
  wired into both (`BUILT_LESSON_UNITS`, `DRILLABLE_UNITS`).
- `lib/thai/drill.ts`: unit-9 subject pool + `audio-tone` question builder
  (MC over all 5 tones); `lib/thai/actions.ts` `KNOWN_DRILL_TYPES` extended.

**A4 — Listening drill types**
- `lib/thai/types.ts`: `DrillType` gains `audio-letter`, `audio-form`,
  `audio-tone`; `DrillQuestion` gains `audioUrl?` and `promptKind: "audio"`.
- `lib/thai/drill.ts`: `audio-letter` (units 2-5, hear the letter's name clip,
  pick the letter — `consonantDistractors` generalized to accept a
  `"display"` field alongside the existing `"initialIpa"`) and `audio-form`
  (units 7-8, hear the vowel sound, pick the written form — reuses
  `vowelDistractors(pool, item, true)` unchanged; this **is** the M11-residual
  "sound→form reverse vowel drill", shipped as audio rather than a second
  text direction, since the plan folds both bullets into one drill type).
  Both are appended to a subject's `drillTypes` **only when `item.audioUrl` is
  present** — before the paid batch runs, units 2-8's drill rounds are
  byte-for-byte the same MC set as M11 (only `letter-sound`/`letter-class`/
  `form-sound` are actually reachable), so M11 behavior for units 1-8 is
  unchanged pre-batch (A6 regression requirement).
- `components/thai/drill/drill-session.tsx`: renders a play button instead of
  Thai-script text when `promptKind === "audio"`; also renders an optional
  small "▶ Hear it" button under any other prompt when `audioUrl` is present
  (forward-compatible "wiring lights up when audioUrl lands" per A4).
- ฃ/ฅ remain `drillable:false` throughout (unchanged); the audio manifest
  builder explicitly skips non-drillable consonants.

**A5 — Tone-confusion matrix on /thai/stats**
- `lib/thai/stats.ts`: `attemptRows` query extended to select `drillType`,
  `expected`, `chosen`; new `ToneConfusionCell` + `toneConfusion` field on
  `ThaiStats`, built as a dense 5×5 grid (`TONE_ORDER × TONE_ORDER`) from
  `audio-tone` attempts only.
- `components/thai/stats/tone-confusion-matrix.tsx` (new): 5×5 grid, same
  earthy-intensity-scale pattern as `FailureHeatmap`; renders an
  explicit empty state ("No tone drills answered yet") when total count is 0.
- `app/thai/stats/page.tsx`: new "Tone confusion matrix" section.

**A6 — Quality gates**
- `npm run lint`, `npx tsc --noEmit`, `npm run build` all pass — verbatim
  output below.
- **Side fix (pre-existing, unrelated to M12):** `eslint.config.mjs`'s
  `.next/**` ignore only matched a top-level `.next` dir, so `npm run lint`
  was picking up `.claude/worktrees/french-course/.next/**` (a different
  branch's compiled Turbopack build output, ~158 lint errors, none of them
  ours) as if it were part of this source tree. Fixed by adding `**/.next/**`
  and `.artifacts/**` to the ignore list — see Issues Discovered.

## Left Undone

- **The paid audio batch itself** (`npm run audio:thai` without `--dry`) —
  per the Validation Contract's explicit PAID GATE, this agent prepared the
  manifest/script and stopped. Dry-run result: **103 clips, 408 total chars,
  est. cost $0.0122** (well within Google's free tier → expected $0.00
  billed). The orchestrator/owner needs to approve and run this before any
  audio-based drill (audio-letter, audio-form, audio-tone) or the unit-9
  lesson tiles can actually play anything.
- Word-bank items (unit 6) get audio clips in the manifest (per A2's literal
  "drill syllables/words" wording) but there is no tracked drill type that
  plays them — only the optional "▶ Hear it" button on any question's reveal
  uses `item.audioUrl` when present. This is a deliberate minimal read of an
  ambiguous bullet, not a missing feature; flagging for review.
- `ToneEarLesson`'s family ordering comes from DB row order (no `ORDER BY`),
  which Postgres doesn't guarantee for a table with no explicit ordering —
  cosmetic risk only (tile grouping is still correct; the sequence the three
  families appear in could theoretically vary). Not fixed given time budget.

## Commands Run

- `npx drizzle-kit generate --custom --name=thai_progress_drill_type` — exit 0
  ```
  Prepared empty file for your custom SQL migration!
  [✓] Your SQL migration file ➜ lib\db\migrations\0003_thai_progress_drill_type.sql 🚀
  ```
- (after hand-patching `meta/0003_snapshot.json`) `npx drizzle-kit generate --name=verify_no_diff` — exit 0
  ```
  thai_progress 7 columns 2 indexes 2 fks
  ...
  No schema changes, nothing to migrate 😴
  ```
- `npm run db:migrate` — exit 0
  ```
  [✓] migrations applied successfully!
  ```
- DB verification query (node one-off, not a repo script) — exit 0
  ```
  columns: [...,{ column_name: 'drill_type', is_nullable: 'NO' }]
  indexes: [...,{ indexname: 'thai_progress_learner_item_drill_uq', indexdef: 'CREATE UNIQUE INDEX thai_progress_learner_item_drill_uq ON public.thai_progress USING btree (learner_id, item_id, drill_type)' }]
  row count: 0
  []
  ```
  (Before/after row counts: 0 / 0 — no pre-existing thai_progress rows existed
  in the dev DB, so the dominant-drillType backfill logic could not be
  empirically exercised against real data; it was validated by SQL-logic
  review only. No rows were dropped.)
- `npm run seed:thai` — exit 0
  ```
  [reachability] OK — every drillable item across units 2,3,4,5,6,7,8,9 (105 total) is reachable as a drill subject.
  [delete] 0 dropped item(s).

  Done. 12 inserted, 113 upserted-as-update, 0 deleted. Total items: 125.
  ```
- `npm run audio:thai -- --dry` — exit 0
  ```
  [manifest] 103 clips, 408 total chars, est cost $0.0122 (Google Chirp3-HD $30/1M chars).
  [manifest] written to .artifacts/thai-audio/manifest.json
  [dry-run] no API calls made, no Blob uploads, no DB writes.
  ```
- `npx tsc --noEmit` — exit 0 (no output)
- `npm run lint` — exit 0
  ```
  > eslint
  (no problems)
  ```
  (Ran once before the `eslint.config.mjs` ignore fix: exit 1, 158 errors —
  all under `.claude/worktrees/french-course/.next/**`, none in any file this
  milestone touched — confirmed with a grep of the full output for
  `lib\thai`, `components\thai`, `app\thai`, `seed\thai`, `scripts\generate-
  thai-audio`, `scripts\seed-thai-db`: zero matches.)
- `npm run build` — exit 0
  ```
  ✓ Compiled successfully in 9.0s
  Finished TypeScript in 10.2s ...
  ✓ Generating static pages using 10 workers (6/6) in 1088ms
  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ```

## Issues Discovered

- **STRICT mastery has a much bigger blast radius than "units may re-lock":**
  the plan's own text frames STRICT aggregation as "units may legitimately
  re-lock" — but because `allReachableDrillTypesForItem` is the item's full
  **cross-unit** reachable set (e.g. a unit 2-5 consonant with a final sound
  is only "fully mastered" once its `audio-letter` streak **and** its unit-6
  `letter-final` streak are both done), and because `audio-letter`/
  `audio-form`/`audio-tone` can structurally never produce a scoreable
  attempt before real audio exists, **no unit past unit 2 can reach the 90%
  unlock threshold at all until the paid batch runs** — not just "some
  previously-mastered units re-lock," but the entire course beyond unit 2 is
  frozen for every learner (existing or new) in the gap between this deploy
  and the batch run. Implemented exactly as specified (STRICT, structural,
  not audioUrl-gated) since that was the owner-approved rule and the
  alternative (weakening it to "only currently-available drill types count")
  would silently let units look 100% mastered on text-only drills forever if
  the batch never ran — but this consequence is significant enough that the
  orchestrator should flag it to the owner: **run the audio batch promptly
  after this deploys**, or Thai learners are stuck at unit 2.
- `drizzle-kit generate --custom` does not diff `schema.ts` — it duplicates
  the previous snapshot verbatim as the new "current" baseline. Left as-is,
  the next `db:generate` for an unrelated schema change would have tried to
  re-add `drill_type` (since the tool wouldn't know it already exists). Fixed
  by hand-patching `meta/0003_snapshot.json`'s `thai_progress` entry and
  confirming with a no-op `drizzle-kit generate` run (see Commands Run).
- `eslint.config.mjs`'s `.next/**` ignore doesn't match nested `.next` dirs
  (glob semantics — `.next/**` only matches a top-level path). Pre-existing,
  unrelated to M12, but it made `npm run lint` fail on stale build output
  from `.claude/worktrees/french-course/`. Fixed (see Completed/A6) since it
  otherwise makes the gate meaningless; flagged here since it's a fix outside
  the feature's literal scope.

## Spec Deviations

- Word-bank (unit 6) audio: included in the manifest per A2's literal text,
  but the only UI use is the optional universal "▶ Hear it" reveal button —
  no NEW tracked drill type consumes it (none was specified for unit 6 in
  A3/A4). Simpler-interpretation call, documented per the ambiguity rule.
- Tone family 3 (`naa-silent-leader`) is a genuine 2-tone pair (mid, rising)
  rather than a fabricated 5-tone set, to honor the "no invented Thai
  vocabulary" house rule carried from M11 — the doc only attests two tones
  for this specific pair.
- `newlyMastered` returned by `submitThaiAttempt` was redefined from "this
  drillType just got its 3rd streak" (M11) to "this ITEM just became fully
  mastered across every reachable drillType" (M12/STRICT) — required by A1's
  aggregation rule change; the drill summary screen's "Newly mastered" count
  and unlock celebration now reflect the stricter, item-level signal.

## Procedure Compliance
- Plan consulted before coding: yes (`.claude/plans/active-plan.md` +
  `.claude/plans/m11-archive--active-plan.md` Appendix)
- Tests run before finishing: this repo has no automated test suite (no
  `test` script in `package.json`, no `*.test.ts` files found for the Thai
  course); quality gates run instead — `npx tsc --noEmit` (exit 0), `npm run
  lint` (exit 0), `npm run build` (exit 0) — all cited above with verbatim
  output.
- Handoff written: yes

---

## Round 2

Agent: implementer | Date: 2026-07-03 | Status: COMPLETE

Round 1 shipped with a REQUEST-CHANGES verdict (`.claude/plans/review-summary.md`,
written by code-reviewer). This round fixes CRITICAL 1, CRITICAL 2, HIGH, and
MEDIUM exactly as directed, plus the two LOW items called out as trivial. The
audio pipeline/clips, tone data, confusion matrix, and eslint config were left
untouched per the round-2 instructions.

### Completed

**CRITICAL 1 — cross-unit mastery deadlock (fixed)**
- `lib/thai/reachability.ts`: added `canEverHaveAudio()` and
  `canDrillTypeScore()` (independent structural predicates, deliberately not
  sharing code with the branch logic they audit — see file comments), plus two
  new exports: `unitOfferingDrillType()` (which unit's session actually offers
  a given (item, drillType) pair) and `maxAchievablePercentForUnit()` (the
  seed-time invariant's own check, and the same number quoted in the review's
  Finding 1 table — now recomputed at 100% for every unit, see Commands Run).
  `reachableDrillTypesForUnit` itself was already per-unit-scoped (unchanged
  in shape); the bug was entirely in how `queries.ts` consumed it.
- `lib/thai/queries.ts`: replaced the DB-driven `fetchDrillableItemsByUnit` +
  cross-unit `isItemFullyMastered` with `unitMasteryStats(unit, masteredByItem)`,
  which derives BOTH a unit's item set AND its per-item required drill types
  from `reachableDrillTypesForUnit(unit, ALL_THAI_ITEMS)` — i.e., a unit's own
  `percentMastered` now requires only the drill types that unit's own drill
  session actually offers. Concretely: a unit 2-5 consonant's `letter-final`
  streak no longer gates that consonant's home unit's percentage (it counts
  toward unit 6's percentage instead, since unit 6's own subject pool already
  includes those same consonants — this is the "letter-final counts toward
  unit 6's %, NOT toward units 2-5's %" instruction, implemented by making
  unit 6's item set the union of its word-bank syllables AND the
  consonants-with-final-sound it drills, exactly mirroring what
  `buildSubjectPool`'s unit-6 branch already treats as unit 6's session).
  `allReachableDrillTypesForItem` (the cross-unit union) is kept, unchanged,
  and still used for `newlyMastered` in `actions.ts` (lifetime/item-level
  display) — per the instruction to keep it for that purpose.
- Side effect (expected, not a bug): unit 6's displayed `totalItems` on the
  Thai home screen grows from 21 (word-bank syllables only) to 57 (21
  syllables + 36 consonants with a final sound) — this is the correct
  denominator now that letter-final mastery genuinely counts toward unit 6's
  own percentage, per the review's fix direction.

**CRITICAL 2 — hidden vowels can never have audio (fixed)**
- `lib/thai/reachability.ts::canEverHaveAudio()`: a vowel can only ever have
  audio if its `display` contains the carrier-circle glyph `◌` (mirrors
  `scripts/generate-thai-audio.ts::deriveVowelAudioText`'s own rule, NOT
  duplicated by importing that script — this file must stay DB/script-import
  free, see file header). `vowel:hidden-o` / `vowel:hidden-a` have no `◌` in
  their `display` ("(unwritten, closed syllable)" / "(unwritten, short
  word)") and so are excluded. Applied in the units 2-5 branch (`audio-letter`)
  and the units 7-8 branch (`audio-form`) — both now gate the drill type on
  `canEverHaveAudio(i)` instead of adding it unconditionally. `scripts/
  generate-thai-audio.ts` was NOT modified (per the round-2 "do not touch the
  audio pipeline" instruction) — it already independently derived the same
  null-for-hidden-vowels behavior; the bug was purely on the mastery-gating
  side, not the generation side.

**Strengthened seed-time invariant (point 3)**
- `lib/thai/reachability.ts::maxAchievablePercentForUnit()`: for a drilled
  unit, computes the max achievable `percentMastered` a hypothetically
  perfect learner could reach, using `canDrillTypeScore()` — a predicate
  written independently of the map-building branches it audits, so it can
  catch a future regression in either branch rather than trivially agreeing
  with it.
- `scripts/seed-thai-db.ts::assertEveryUnitCanReach100Percent()`: new seed-time
  gate, run alongside the existing `assertEveryDrillableItemIsReachable()`.
  Throws with a detailed message if any drilled unit's max achievable percent
  is below 100 — this is the reviewer's own verification method (recompute
  per-unit max-achievable percent from the shipped code), now permanent.
  Documented limitation (see Issues Discovered): this cannot catch a future
  regression where `queries.ts` is hand-edited back to use
  `allReachableDrillTypesForItem` for unlock math, since that's an
  architecture choice in a DB-backed file the seed script's pure content
  check can't reach — the primary defense against that specific regression
  shape is the code comment on `allReachableDrillTypesForItem` plus this
  handoff's explicit statement of the contract.

**HIGH — `submitThaiAttempt` missing server-side unlock check (fixed)**
- `lib/thai/reachability.ts::unitOfferingDrillType()`: re-derives which
  drilled unit's session actually offers a given (item, drillType) pair
  (needed because some pairs, e.g. `letter-final`, are offered by a unit
  other than the item's own home unit — see CRITICAL 1 above).
- `lib/thai/actions.ts::submitThaiAttempt`: after re-deriving `expected`
  (unchanged, still never trusts the client), now also re-derives the gating
  unit via `unitOfferingDrillType` and — if that unit is greater than 2 —
  fetches `getUnitSummaries(learnerId)` and throws `"Unit not unlocked"` if
  that unit isn't unlocked. Unit 2 is always allowed (per the instruction);
  unit 1's lesson marker never reaches this action (it uses
  `markUnit1LessonRead`, a separate, always-available action, unchanged). If
  `unitOfferingDrillType` returns `null` (the pair is offered by no drilled
  unit — e.g. a client forging `audio-form` for a hidden vowel), the action
  now throws before even reaching the DB.

**MEDIUM — migration backfill validated against synthetic data**
- Ran a one-off script (`.artifacts/_tmp-migration-backfill-test.ts`, deleted
  after use — never committed, no synthetic data left behind) against the dev
  DB: temporarily relaxed `thai_progress.drill_type` to nullable, inserted a
  synthetic learner + 3 synthetic `thai_progress` rows (drill_type NULL) with
  matching `thai_attempts` histories covering all three named cases —
  dominant-by-count, tie-broken-by-recency, no-attempts-fallback — then ran
  the migration's own step-2/step-3 UPDATE statements verbatim (copy-pasted
  from `lib/db/migrations/0003_thai_progress_drill_type.sql`, not
  re-executing the whole migration file) against them. All 3 assertions
  passed (see Commands Run for verbatim output). Deleted all synthetic rows
  (progress, attempts, user) and restored the NOT NULL constraint afterward —
  confirmed via a follow-up query that `thai_progress` still has 0 total rows
  and `drill_type` is `is_nullable: 'NO'` again (see Commands Run).

**LOW fixes**
- `lib/thai/queries.ts::getToneWords`: added `.orderBy(thaiItems.id)` — a
  deterministic (if not narratively-ordered) sort, closing the "no ORDER BY
  guarantee" gap the reviewer flagged. `ToneEarLesson`'s family-grouping logic
  is unchanged; it now receives a stable row order every request.
- `lib/thai/tone.ts`: softened/corrected the `TONE_CONTOUR_POINTS` comment —
  it no longer claims the coordinates are an exact transform of the doc's own
  SVG polylines (they're hand-approximated to match the same qualitative
  shape), matching the reviewer's own recomputation.

### Left Undone
- None of the round-2 assigned items were left undone.
- Did not touch the audio pipeline/clips, tone data, confusion matrix, or
  eslint config, per the explicit round-2 instruction.
- Did not attempt to make the seed-time invariant catch a hypothetical future
  regression where `queries.ts` reverts to using the cross-unit
  `allReachableDrillTypesForItem` for unlock math — see the "Issues
  Discovered" note on why a content-only seed script can't reach that
  DB-backed file's logic; the durable defense there is architectural (single
  call site, documented in code comments), not mechanical.

### Commands Run

- `npx tsc --noEmit` — exit 0, no output.
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
- `npm run build` — exit 0
  ```
  ✓ Compiled successfully in 5.9s
  Running TypeScript ...
  Finished TypeScript in 6.9s ...
  ✓ Generating static pages using 10 workers (6/6) in 881ms
  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ```
- `npm run seed:thai` — exit 0
  ```
  [reachability] OK — every drillable item across units 2,3,4,5,6,7,8,9 (105 total) is reachable as a drill subject.
  [reachability] OK — every drilled unit (2,3,4,5,6,7,8,9) can reach 100% percentMastered given its own drill session.
  [delete] 0 dropped item(s).

  Done. 0 inserted, 125 upserted-as-update, 0 deleted. Total items: 125.
  ```
- Deadlock-recomputation evidence (`.artifacts/_tmp-recompute-deadlock.ts`,
  deleted after use — imports `lib/thai/reachability.ts` and
  `seed/thai/items.ts` directly, the same method the review used) — exit 0
  ```
  unit | items in unit's own drill session | max achievable percentMastered
  unit 2: 9 items -> max achievable pct = 100%
  unit 3: 10 items -> max achievable pct = 100%
  unit 4: 12 items -> max achievable pct = 100%
  unit 5: 11 items -> max achievable pct = 100%
  unit 6: 57 items -> max achievable pct = 100%
  unit 7: 18 items -> max achievable pct = 100%
  unit 8: 12 items -> max achievable pct = 100%
  unit 9: 12 items -> max achievable pct = 100%
  ```
- Real-audio cross-check against the live dev DB
  (`.artifacts/_tmp-audio-check.ts`, deleted after use) — confirms every item
  whose in-unit-required drill types include an `audio-*` type actually has a
  non-null `audioUrl` right now (not just "structurally possible eventually")
  — exit 0
  ```
  unit | items | items whose in-unit required audio-* type has NO audioUrl (would cap this unit below 100% RIGHT NOW)
  unit 2: 9 items -> 0 missing audio: (none)
  unit 3: 10 items -> 0 missing audio: (none)
  unit 4: 12 items -> 0 missing audio: (none)
  unit 5: 11 items -> 0 missing audio: (none)
  unit 6: 57 items -> 0 missing audio: (none)
  unit 7: 18 items -> 0 missing audio: (none)
  unit 8: 12 items -> 0 missing audio: (none)
  unit 9: 12 items -> 0 missing audio: (none)
  ```
- Migration backfill synthetic-data test
  (`.artifacts/_tmp-migration-backfill-test.ts`, deleted after use, no data
  left behind) — exit 0
  ```
  --- setup ---
  relaxed thai_progress.drill_type to nullable (temporary, for this test only)
  inserted 3 synthetic thai_progress rows + 8 synthetic thai_attempts rows

  --- running the migration's own backfill UPDATE statements (steps 2 & 3) ---

  --- assertions ---
  PASS — Case A dominant-by-count (3 letter-sound vs 1 letter-class): expected drill_type='letter-sound', got 'letter-sound'
  PASS — Case B tie-broken-by-recency (2 vs 2, letter-class more recent): expected drill_type='letter-class', got 'letter-class'
  PASS — Case C no-attempts-fallback (vowel kind default): expected drill_type='form-sound', got 'form-sound'

  --- cleanup ---
  synthetic rows remaining — progress: 0, attempts: 0, user: 0
  restored thai_progress.drill_type NOT NULL

  total thai_progress rows in DB now (should be 0, matching pre-test state): 0

  BACKFILL TEST PASSED — all 3 cases produced the expected drill_type.
  ```
- Follow-up NOT NULL restoration check (`.artifacts/_tmp-verify-notnull.ts`,
  deleted after use) — exit 0
  ```
  [ { column_name: 'drill_type', is_nullable: 'NO' } ]
  ```
- `unitOfferingDrillType` gating sanity check
  (`.artifacts/_tmp-unlock-check.ts`, deleted after use) — exit 0
  ```
  consonant:ก / letter-sound -> gating unit = 2
  consonant:ก / letter-final -> gating unit = 6
  consonant:ข / letter-final -> gating unit = 6
  syllable:ปาก / word-final -> gating unit = 6
  vowel:a-short / form-sound -> gating unit = 7
  vowel:hidden-o / audio-form -> gating unit = null
  tone-word:คา / audio-tone -> gating unit = 9
  ```

### Issues Discovered
- The seed-time invariant (`assertEveryUnitCanReach100Percent`) is a strong
  content-level guard but cannot, by itself, catch a regression where a
  future edit reverts `lib/thai/queries.ts::getUnitSummaries` to use
  `allReachableDrillTypesForItem` (the cross-unit union) instead of
  `reachableDrillTypesForUnit(unit, ...)` for unlock math — that specific
  regression shape lives entirely in a DB-backed file the pure seed script
  doesn't import or execute. Flagging this explicitly per the task's ask to
  "fail loudly on exactly the two CRITICAL bug classes... if they ever
  recur": the content-shape half of both bug classes (a drill type required
  that can't score, or is only offered by a different unit than the one
  computing reachability for) is now mechanically guarded; the
  architecture-shape half (which function `queries.ts` calls) is guarded by
  code comment and this handoff, not by a runtime check. A stronger guard
  would require either (a) a lightweight runtime assertion inside
  `getUnitSummaries` itself comparing its own result against
  `reachableDrillTypesForUnit`-derived expectations, or (b) an integration
  test exercising `getUnitSummaries` end-to-end — out of scope for this
  round's instructions, which asked for the SEED-time invariant specifically.
- Unit 6's `totalItems` (displayed on the Thai home screen) jumps from 21 to
  57 items as a direct, correct consequence of the CRITICAL 1 fix (see
  Completed). This is a visible behavior change from round 1's shipped state,
  not a regression — QA should expect this new number.

### Spec Deviations
- None beyond what round 1 already documented. The round-2 instructions were
  followed literally: per-unit-scoped mastery (interpreted as "unit 6's item
  set is the union of what its own drill session offers," matching
  `buildSubjectPool`'s existing unit-6 subject pool exactly, since the
  instruction's own example ("letter-final counts toward unit 6's %") only
  makes sense under that reading).

### Procedure Compliance
- Plan consulted before coding: yes — read `.claude/plans/review-summary.md`
  (in full, authoritative findings), `.claude/plans/active-plan.md`, and this
  file's own round-1 section, before making any edit.
- Tests run before finishing: yes — see Commands Run above:
  `npx tsc --noEmit` (exit 0), `npm run lint` (exit 0), `npm run build` (exit
  0), `npm run seed:thai` (exit 0, both reachability invariants OK), plus the
  deadlock-recomputation, real-audio cross-check, migration backfill, and
  unlock-gating evidence scripts (all exit 0, verbatim output captured, all
  temporary files deleted afterward — none committed).
- Handoff written: yes (this section).

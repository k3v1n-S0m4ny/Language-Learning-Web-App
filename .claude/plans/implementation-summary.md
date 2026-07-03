---
status: COMPLETE
updated: 2026-07-03
---

# Handoff: M13 — Read Thai tone-rules engine, syllable decode, word-bank expansion
Agent: implementer | Date: 2026-07-03 | Status: COMPLETE

## Completed

**A1 — Word-bank expansion + tone metadata**
- `seed/thai/types.ts` — added `ToneMark` type and extended `SyllableItem.metadata` with `initialClass`, `toneMark`, `live`, `vowelLength`, `tone`, `asmEligible` (all nullable except `asmEligible`, matching the artifact's own "—" cells). `drillable` doc comment updated to reflect the M13 reachability rules.
- `seed/thai/items.ts` — `WORD_BANK` grown from 30 to 100 words. All 30 existing rows backfilled with the new tone-derivation fields (computed from the doc's own tone grid); all 70 new rows added **verbatim** from `.claude/plans/m13-word-bank.md` (Thai/IPA/gloss/class/mark/live/len/final/tone/asm — every metadata column). Every row set `drillable: true` (previously false for 9 rows whose `finalSound` was null — now reachable via `word-ipa`/`audio-word`). `BUILT_UNITS` gained 10, 11.
- One irregular-content decision: โต๊ะ's artifact "final" column is `ʔ` (phonetic glottal stop of a short open vowel, not a written final consonant) — stored `finalSound: null` with a `sourceNote` explaining why, consistent with the existing `SyllableItem.metadata.finalSound` convention (written final CONSONANT only). This does not affect the word's `tone-assembly`/`mark-tone` eligibility (it's marked, so the mark wins and live/dead/length are skipped per the doc's own rule).
- `lib/thai/tone.ts` — added `TONE_MARK_INFO`, `TONE_MARK_ORDER`, `TONE_GRID_ROWS` (verbatim from the research doc §6).
- `npm run seed:thai` run twice (fresh + idempotency re-check) — see Commands Run. Before: 125 thai_items; after: 195 (70 inserted, 125 upserted-as-update, 0 deleted). Second run: 0 inserted, 195 upserted-as-update, 0 deleted (idempotent). Mandarin tables (`cards`, `words`) untouched (204 / 478, matching pre-existing baseline).
- Mechanical self-consistency check (ad-hoc script, not committed): for every word-bank row with a resolvable situation (class + mark-or-live/dead(+length)), recomputed the tone independently from a from-scratch transcription of the doc's tone grid and compared against the stored `metadata.tone` — **99/99 checked rows match, 0 mismatches** (1 row, สบาย, correctly skipped — no single governing tone).

**A2 — Unit 10: tone-rules assembly engine**
- `lib/thai/reachability.ts` — `DrillTypeId` gained `tone-assembly`, `mark-tone`, `word-ipa`, `audio-word`; `DRILLED_UNITS` gained 10, 11; `canDrillTypeScore` gained matching branches; `reachableDrillTypesForUnit` gained a `unit === 10` branch (sources subjects from the unit-6 word bank — same cross-unit-sourcing shape unit 6 already uses for units 2-5 consonants' `letter-final`) and a `unit === 11` branch.
- `lib/thai/drill.ts` — `expectedAnswerFor` gained `tone-assembly`/`mark-tone` (both resolve to `metadata.tone`, the FINAL tone) and `word-ipa`/`audio-word` cases; `buildSubjectPool` gained unit 10/11 branches (new `fetchWordBankItems` helper); `buildQuestion` gained `tone-assembly` (builds the branching `steps` array via new `buildToneAssemblySteps`), `mark-tone` (5-tone MC), `audio-word`, `word-ipa` cases.
- `lib/thai/types.ts` — added `DrillStep` interface; `DrillQuestion` gained optional `steps?: DrillStep[]`.
- `components/thai/drill/tone-assembly-question.tsx` (new) — client component walking the branching steps (class → mark-present? → [marked: mark+class tone] / [unmarked: live/dead → (dead:) vowel length → tone]), immediate per-step local feedback + "Continue", final step calls back to `DrillSession` to submit ONE `thai_attempts` row.
- `components/thai/drill/drill-session.tsx` — refactored `answer()` into a shared `submitAnswer(value)`; renders `ToneAssemblyQuestion` in place of the options grid when `drillType === "tone-assembly"`.
- `components/thai/lessons/tone-rules-lesson.tsx` (new) — unit 10 lesson: four-ingredients recap, tone-marks table, tone grid (verbatim from doc), one worked example per mark (real word-bank rows).
- `app/thai/[unit]/lesson/page.tsx` / `app/thai/[unit]/drill/page.tsx` — unit sets extended to include 10, 11; "Next unit" link bound changed from `unit < 9` to `unit < 11`.

**A3 — Unit 11: syllable decode**
- `word-ipa` drill: 4-option MC (full IPA), each distractor mutating exactly one dimension (tone / vowel length / final) via mechanical Unicode-combining-mark substitution on the already-verified IPA strings (`retoneIpa`/`mutateLengthIpa`/`mutateFinalIpa`/`ipaDistractors` in `lib/thai/drill.ts`) — falls back to other words' full IPA from the pool when a dimension isn't available for a given word (e.g. an open syllable has no final to mutate). Gloss + audio hidden until the question is answered (`hideAudioUntilRevealed` in `drill-session.tsx`), per the contract.
- `components/thai/lessons/syllable-decode-lesson.tsx` (new) — unit 11 lesson: live/dead + vowel-length recap (paraphrased from doc §2/§5), four worked examples (one per branch shape: unmarked live, unmarked dead-short, unmarked dead-long, marked), explanation of the drill's one-dimension-mutation mechanic.

**A4 — Unit 6 listening drill (M12 residual)**
- `audio-word` drill type added to unit 6's own session for every word-bank row (structurally, via `canEverHaveAudio` — always true for kind `syllable`), gated at the subject-pool level on `audioUrl` actually being populated (same degrade-gracefully pattern as `audio-letter`/`audio-form`/`audio-tone`). Distractors prefer words sharing the correct word's final sound (`wordDistractors`), falling back to the general pool.
- This is a NEW requirement for unit 6's own percentage (all 100 word-bank rows now need `audio-word` mastered in addition to `word-final` where applicable) — will legitimately re-lock the existing learner's unit-6 progress until re-drilled, per the M12 precedent the contract calls out as intended.

**A5 — Audio manifest (paid-gated, NOT run)**
- `scripts/generate-thai-audio.ts` required **no code changes** — its manifest builder already iterates `ALL_THAI_ITEMS` generically (`kind === "syllable" && item.drillable`), and every word-bank row is now `drillable: true`, so all 100 words are automatically included.
- Dry-run manifest (`--dry`, no API calls/uploads/DB writes): **182 total clips needed, 652 total chars**. Cross-referenced against the live Blob store (102 existing `audio/thai/` blobs) by re-deriving each clip's hash path: **74 NEW clips needed (232 chars), ~$0.0070 estimated cost** (108 of the 182 manifest entries resolve to blob paths that already exist — some words share identical Thai text with existing unit-9 tone-words, e.g. คา/ขา/ข่า, so their clips are already reused under the hash-by-text keying scheme). **The paid batch was NOT run** — this is the required stop-and-report gate; the orchestrator runs it after owner sign-off.

**A6 — M12 residual fixes**
- **Unit-2 unlock bypass**: `lib/thai/actions.ts::submitThaiAttempt` changed `if (gatingUnit > 2)` to `if (gatingUnit >= 2)` — unit 2 attempts are now gated on `getUnitSummaries`' own unit-2 `unlocked` flag (which already correctly derives from `unit1LessonComplete`), closing the bypass.
- **Unlock-math regression guard**: `unitMasteryStats` moved from `lib/thai/queries.ts` to `lib/thai/reachability.ts` (DB-import-free, per this file's own documented constraint that scripts/seed-thai-db.ts must never transitively import `@/lib/db`) and now takes `allItems` as an explicit parameter. New `assertUnitMasteryScopingGuard` — a synthetic, DB-free fixture proving `unitMasteryStats(2, ...)` requires unit 2's OWN reachable drill types (not a cross-unit-only one like `letter-final`) — runs on every `npm run seed:thai` (see seed output in Commands Run: "unitMasteryStats correctly scopes...").
- **Backfill CASE coverage**: one-off synthetic test (`.artifacts/_tmp-migration-backfill-test-m13.ts`, deleted after use — see Commands Run) extended the M12 round-2 test (which covered only 1/6 kind-fallback branches) to all 6: consonant→letter-sound, vowel→form-sound, syllable→word-final, lesson-marker→lesson-read, tone-word→audio-tone, and the `ELSE` branch (exercised via kind `final`, which has no explicit `WHEN` clause) →letter-sound. **All 6/6 PASSED.**

**A7 — Quality gates**
- `npx tsc --noEmit` — exit 0, no output.
- `npm run lint` — 1 pre-existing-style error found and fixed (unescaped apostrophe in `syllable-decode-lesson.tsx`); final run exit 0, no errors.
- `npm run build` — exit 0, compiled successfully, all routes generated (`/thai/[unit]/drill`, `/thai/[unit]/lesson` included).
- Regression: Mandarin tables/routes untouched (verified via DB counts). Units 1-9 drill/lesson code paths not modified except the shared `DrillSession`/`buildSubjectPool`/`reachability.ts` functions, which were extended (new branches added, no existing branches altered) and are covered by the same seed-time invariants that already gate units 2-9.

## Left Undone
- **A5's paid audio batch** — intentionally not run (contract requires an explicit owner gate). Manifest is prepared at `.artifacts/thai-audio/manifest.json`.
- No automated test suite exists in this repo (confirmed via a project-wide search for `*.test.ts`/`*.spec.ts` — zero results, not specific to Thai code); "tests" for this milestone are the seed-time invariants (mechanical, run on every `seed:thai`) plus the one-off synthetic DB scripts, matching this repo's established M11/M12 pattern for the Thai course.
- Did not add any new `/thai/stats` visualizations — explicitly out of scope per the contract.

## Commands Run

- `npx tsc --noEmit` — exit 0
  ```
  (no output)
  ```

- `npm run lint` (after fixing the one unescaped-apostrophe error) — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint

  ```

- `npm run seed:thai` (fresh run) — exit 0
  ```
  [reachability] OK — every drillable item across units 2,3,4,5,6,7,8,9,10,11 (184 total) is reachable as a drill subject.
  [reachability] OK — every drilled unit (2,3,4,5,6,7,8,9,10,11) can reach 100% percentMastered given its own drill session.
  [reachability] OK — unitMasteryStats correctly scopes unit 2's own percentage to its own reachable drill types (M13/A6 unlock-math regression guard).
  [delete] 0 dropped item(s).

  Done. 70 inserted, 125 upserted-as-update, 0 deleted. Total items: 195.
  ```

- `npm run seed:thai` (idempotency re-check, second run) — exit 0
  ```
  [reachability] OK — every drillable item across units 2,3,4,5,6,7,8,9,10,11 (184 total) is reachable as a drill subject.
  [reachability] OK — every drilled unit (2,3,4,5,6,7,8,9,10,11) can reach 100% percentMastered given its own drill session.
  [reachability] OK — unitMasteryStats correctly scopes unit 2's own percentage to its own reachable drill types (M13/A6 unlock-math regression guard).
  [delete] 0 dropped item(s).

  Done. 0 inserted, 195 upserted-as-update, 0 deleted. Total items: 195.
  ```

- Before/after item-count query (raw SQL via neon) — exit 0
  ```
  before: 125
  total thai_items after: 195
  by kind: [
    { kind: 'consonant', count: '44' },
    { kind: 'final', count: '8' },
    { kind: 'lesson-marker', count: '1' },
    { kind: 'syllable', count: '100' },
    { kind: 'tone-word', count: '12' },
    { kind: 'vowel', count: '30' }
  ]
  syllable drillable breakdown: [ { drillable: true, count: '100' } ]
  mandarin cards count (should be unchanged): 204
  mandarin words count (should be unchanged): 478
  ```

- `npx tsx scripts/generate-thai-audio.ts --dry` — exit 0 (PAID GATE — dry-run only, no spend)
  ```
  [manifest] 182 clips, 652 total chars, est cost $0.0196 (Google Chirp3-HD $30/1M chars).
  [manifest] written to .artifacts/thai-audio/manifest.json
  [dry-run] no API calls made, no Blob uploads, no DB writes.
  ```

- New-vs-reused clip count (cross-referenced against live Blob store, ad-hoc script) — exit 0
  ```
  manifest total: 182
  would reuse: 108
  would generate (new): 74 chars: 232 est cost $0.0070
  ```

- `npx tsx .artifacts/_tmp-migration-backfill-test-m13.ts` (one-off, deleted after use) — exit 0
  ```
  --- verifying all 6 kind-fallback CASE branches ---
    kind=consonant     item=consonant:ก            expected=letter-sound actual=letter-sound -> PASS
    kind=vowel         item=vowel:a-short          expected=form-sound   actual=form-sound -> PASS
    kind=syllable      item=syllable:ปลา           expected=word-final   actual=word-final -> PASS
    kind=lesson-marker item=lesson-marker:unit-1   expected=lesson-read  actual=lesson-read -> PASS
    kind=tone-word     item=tone-word:อา           expected=audio-tone   actual=audio-tone -> PASS
    kind=final         item=final:k                expected=letter-sound actual=letter-sound -> PASS
  --- cleanup ---
  restored thai_progress.drill_type NOT NULL

  synthetic rows remaining — progress: 0, attempts: 0, user: 0
  [ { column_name: 'drill_type', is_nullable: 'NO' } ]

  BACKFILL TEST PASSED — all 6 kind-fallback CASE branches produced the expected drill_type.
  ```

- Tone-grid self-consistency check (ad-hoc script, deleted after use) — exit 0
  ```
  checked=99 skipped=1 fails=0 total=100
  ```

- `npm run build` — exit 0
  ```
  ▲ Next.js 16.2.6 (Turbopack)
  - Environments: .env.local

    Creating an optimized production build ...
  ✓ Compiled successfully in 3.1s
    Running TypeScript ...
    Finished TypeScript in 3.4s ...
    Collecting page data using 10 workers ...
  ✓ Generating static pages using 10 workers (6/6) in 411ms
    Finalizing page optimization ...

  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats

  ƒ Proxy (Middleware)
  ○  (Static)   prerendered as static content
  ƒ  (Dynamic)  server-rendered on demand
  ```

## Issues Discovered
- The M13 word-bank artifact's "final" column for โต๊ะ is `ʔ` (a phonetic glottal stop marking a dead short-open-vowel syllable), which is not a value the existing `FinalSound` type / word-final drill vocabulary (k,t,p,m,n,ŋ,j,w — the 8 written finals unit 6 teaches) covers. Resolved by treating it as `finalSound: null` (matching the existing convention that this field means "written final consonant," not "any phonetic closure") with a `sourceNote` documenting the reasoning — the word stays fully eligible for `tone-assembly`/`mark-tone`/`word-ipa` (it's marked, so live/dead/length are skipped anyway per the doc's "mark wins" rule).
- `unitMasteryStats` had to move from `lib/thai/queries.ts` (which imports `@/lib/db`) to `lib/thai/reachability.ts` (deliberately DB-import-free) so `scripts/seed-thai-db.ts` could call the new A6 regression guard without violating this file's own documented dotenv-before-neon-client-construction ordering constraint. `queries.ts` now imports and calls `unitMasteryStats` from `reachability.ts` — behavior unchanged, purely a file-location refactor with a signature change (added `allItems` parameter, previously closed over the module-level `ALL_THAI_ITEMS` import).
- First cut of the A6 regression guard's positive-control fixture failed (hardcoded `["letter-sound", "letter-class"]` as the "own unit" requirement, missing `audio-letter` — which `reachableDrillTypesForUnit` also structurally requires for every consonant, unconditionally, since `canEverHaveAudio` is always true for consonants). Fixed by deriving the required-types fixture from `reachableDrillTypesForUnit(2, allItems).get(sample.id)` directly instead of hardcoding, making the guard robust to that structural fact rather than fighting it.

## Spec Deviations
- **`vowelForm` and `sourceNote` for the 70 new words**: the artifact table has no `vowelForm` column, so it was left `undefined` for all 70 new rows (only populated for rows where the artifact's own "notes" column called out something a maintainer would need — irregular spellings/corrections) rather than inventing a value. This is a narrower interpretation of "integrate the artifact verbatim" (the artifact's core metadata columns — class/mark/live/len/final/tone/asm — are fully captured; the free-text "notes" column, which the artifact's own "Column meanings" section does not list as a core metadata column, was not exhaustively transcribed into `sourceNote` for every row).
- **`tone-assembly` step-by-step feedback is client-side only, not persisted**: the contract explicitly asks for "One `thai_attempts` row per completed question ... a wrong step surfaces immediately but the question still resolves to one logged attempt" — implemented exactly as specified (per-step feedback is local React state in `ToneAssemblyQuestion`, never sent to the server; only the FINAL tone answer reaches `submitThaiAttempt`).
- **Backfill CASE-coverage test script location**: written to `.artifacts/_tmp-migration-backfill-test-m13.ts` (matching the M12 precedent's naming/location) and deleted immediately after a passing run, per the established "no synthetic data or scratch scripts left behind" convention — not committed.

## Procedure Compliance
- Plan consulted before coding: yes (`active-plan.md` A1-A7 read first, `m13-word-bank.md` read and integrated verbatim, `lib/thai/reachability.ts` header comments read and treated as binding, `AGENTS.md` noted — no Next.js API surprises encountered since only existing route/action patterns were extended, not new App Router primitives).
- Tests run before finishing: yes — see Commands Run above for `npx tsc --noEmit` (exit 0), `npm run lint` (exit 0), `npm run build` (exit 0), `npm run seed:thai` run twice with seed-time invariants passing (exit 0 both times), and the one-off backfill-CASE-coverage script (all 6/6 PASS).
- Handoff written: yes (this file).

---

# Round 2 — review round-1 fix (HIGH + 2 of 3 LOW)

## Context
Review round 1 (`.claude/plans/review-summary.md`) returned REQUEST-CHANGES
with one HIGH content-correctness finding and three LOW findings. The owner
approved the audio paid gate between rounds and the batch has already run
(confirmed below) — per the coordinator's instruction, the audio script was
**not** re-run, and `npm run seed:thai` was **not** re-run either (this
round's fix touches no seed content — `seed/thai/items.ts` is unmodified —
so there was nothing for a seed refresh to accomplish; re-running it would
have been a no-op at best and an unnecessary risk at worst).

## Completed

**HIGH fix — `lib/thai/drill.ts::buildToneAssemblySteps` class-gates the vowel-length step**
- Per the research doc (§6: "④ Dead: how long is the vowel? (length only
  matters for the Low class)"; worked example "Mid + dead → low (for Mid
  class, length makes no difference)") and `lib/thai/tone.ts`'s own
  `TONE_GRID_ROWS` (Mid/High both resolve to `low` for BOTH "dead, short" and
  "dead, long" — only Low class differs: `high` vs `falling`), the
  vowel-length step is now only added when `cls === "low"`. For unmarked dead
  syllables with mid/high initial class, the branch goes straight from
  `liveDead` to the final `tone` step (4 steps total: class → markPresent →
  liveDead → tone). Low-class unmarked dead syllables are unaffected (still
  5 steps: class → markPresent → liveDead → vowelLength → tone).
- Verified mechanically (ad-hoc script reimplementing just the step-KEY
  sequence, not committed — see Commands Run): all 20 of the reviewer's
  named mid/high dead words (ปาก, บาป, เด็ก, ดอก, เจ็ด, จับ, ตัด, ติด, ผัก,
  หก, สุข, ขับ, ตอบ, ปีก, บาท, ออก, ขาด, สอบ, ฝาก, ถูก) now produce a
  4-step sequence with no `vowelLength` step; a low-class dead positive
  control (รถ) still produces the 5-step sequence with `vowelLength` present.
- `components/thai/drill/tone-assembly-question.tsx` required **no changes**
  — verified by reading it: it derives everything from `steps.length`/
  `stepIndex` at render time (no hardcoded step count anywhere), and
  `components/thai/drill/drill-session.tsx` unmounts/remounts
  `ToneAssemblyQuestion` on every phase transition (it swaps between
  `<ToneAssemblyQuestion>` and a plain `<div>` at the same JSX position
  depending on `phase`), so a fresh component instance with reset internal
  state (`stepIndex`, `chosen`) is guaranteed on every new question
  regardless of how many steps the previous or next question has.

**LOW fix 1 — `lib/thai/actions.ts` tautological `gatingUnit >= 2` check**
- Simplified to an unconditional block with a comment explaining the
  invariant (`gatingUnit` can never be `< 2`: every element of
  `DRILLED_UNITS` is `>= 2`, and the `=== null` check two lines above already
  rejects the only other case). No behavior change — purely a readability fix
  per the reviewer's own suggestion ("simplify to an unconditional block or a
  comment noting the invariant").

**LOW fix 2 — `lib/thai/reachability.ts` unit-10 `mark-tone` branch defense-in-depth**
- `reachableDrillTypesForUnit`'s `unit === 10` branch now checks
  `meta.toneMark != null && meta.tone != null` before adding `mark-tone`,
  matching `canDrillTypeScore`'s `"mark-tone"` predicate exactly (previously
  only checked `toneMark`). Currently a no-op against real data (confirmed
  again in this round: 0/100 rows have `toneMark` set without `tone` set),
  but keeps the two independently-written cross-checks in agreement per the
  reviewer's "defense in depth" ask.

**LOW finding left unfixed (as recommended by the reviewer)**
- `lib/thai/reachability.ts` `assertUnitMasteryScopingGuard`'s documented
  architectural limitation (it proves `unitMasteryStats` itself is correctly
  scoped, but not that `getUnitSummaries` actually calls it rather than
  reintroducing cross-unit logic inline) — the reviewer explicitly flagged
  this as "not a new gap introduced by this PR; flagging for awareness only"
  and did not ask for a fix. Left as-is; already honestly documented in the
  file's own header comment.

## Audio batch / seed-refresh safety check (per coordinator instruction)
- **Did not re-run `scripts/generate-thai-audio.ts`** (batch already ran per
  the coordinator's context update).
- **Did not re-run `npm run seed:thai`** this round — no content in
  `seed/thai/items.ts` changed, so there was nothing for a refresh to do.
- Verified BEFORE deciding not to run it that the seed script's upsert would
  in fact be safe regardless: `scripts/seed-thai-db.ts`'s
  `onConflictDoUpdate` SET clause (lines ~181-190) only lists `kind`, `unit`,
  `display`, `initialIpa`, `finalIpa`, `consonantClass`, `metadata`,
  `drillable` — `audioUrl`/`audio_url` is never in that SET list, so Postgres
  leaves the existing `audio_url` column value untouched on conflict. This
  matches the coordinator's own note ("M12's seed preserved them").
- Read-only DB confirmation that the paid batch's writes are intact (no
  destructive SQL, SELECT only — see Commands Run): 195 total `thai_items`,
  **182 with `audio_url` set** (matches the manifest's 182-clip count from
  Round 1), **100/100 `syllable` rows with `audio_url` set**.

## Commands Run (Round 2)

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
  - Environments: .env.local

    Creating an optimized production build ...
  ✓ Compiled successfully in 3.7s
    Running TypeScript ...
    Finished TypeScript in 3.5s ...
    Collecting page data using 10 workers ...
  ✓ Generating static pages using 10 workers (6/6) in 499ms
    Finalizing page optimization ...

  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats

  ƒ Proxy (Middleware)
  ○  (Static)   prerendered as static content
  ƒ  (Dynamic)  server-rendered on demand
  ```

- Class-gating fix verification (ad-hoc `.mts` script reimplementing
  `buildToneAssemblySteps`' step-KEY sequence only, deleted after use) — exit 0
  ```
  ปาก (mid, dead) -> [class, markPresent, liveDead, tone] OK
  บาป (mid, dead) -> [class, markPresent, liveDead, tone] OK
  เด็ก (mid, dead) -> [class, markPresent, liveDead, tone] OK
  ดอก (mid, dead) -> [class, markPresent, liveDead, tone] OK
  เจ็ด (mid, dead) -> [class, markPresent, liveDead, tone] OK
  จับ (mid, dead) -> [class, markPresent, liveDead, tone] OK
  ตัด (mid, dead) -> [class, markPresent, liveDead, tone] OK
  ติด (mid, dead) -> [class, markPresent, liveDead, tone] OK
  ผัก (high, dead) -> [class, markPresent, liveDead, tone] OK
  หก (high, dead) -> [class, markPresent, liveDead, tone] OK
  สุข (high, dead) -> [class, markPresent, liveDead, tone] OK
  ขับ (high, dead) -> [class, markPresent, liveDead, tone] OK
  ตอบ (mid, dead) -> [class, markPresent, liveDead, tone] OK
  ปีก (mid, dead) -> [class, markPresent, liveDead, tone] OK
  บาท (mid, dead) -> [class, markPresent, liveDead, tone] OK
  ออก (mid, dead) -> [class, markPresent, liveDead, tone] OK
  ขาด (high, dead) -> [class, markPresent, liveDead, tone] OK
  สอบ (high, dead) -> [class, markPresent, liveDead, tone] OK
  ฝาก (high, dead) -> [class, markPresent, liveDead, tone] OK
  ถูก (high, dead) -> [class, markPresent, liveDead, tone] OK

  positive control: รถ (low, dead) -> [class, markPresent, liveDead, vowelLength, tone] OK (length step present)

  ALL PASS
  ```

- Read-only audio/seed-safety confirmation (raw SQL via neon, SELECT only) — exit 0
  ```
  total thai_items: 195
  thai_items with audio_url set: 182
  syllable rows with audio_url set: 100
  ```

## Spec Deviations (Round 2)
- None beyond what Round 1 already documented.

## Procedure Compliance (Round 2)
- Review summary read before fixing: yes (`.claude/plans/review-summary.md`
  read in full, including all Commands Run and the exact line numbers cited).
- Fix scoped to the HIGH finding + the two trivial (<10 line) LOW findings,
  per the coordinator's instruction; the third LOW finding (documented
  architectural limitation, reviewer said "flagging for awareness only") was
  correctly left unfixed rather than over-engineered.
- Tests run before finishing: yes — see Commands Run (Round 2) above:
  `npx tsc --noEmit` (exit 0), `npm run lint` (exit 0), `npm run build`
  (exit 0), plus the class-gating verification script (ALL PASS) and the
  audio/seed-safety read-only query.
- Did not run the paid audio batch and did not re-run `npm run seed:thai`,
  per the coordinator's explicit instruction and the "no content changed
  this round" analysis above.
- Handoff updated: yes (this section).

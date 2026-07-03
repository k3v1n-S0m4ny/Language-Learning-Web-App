---
status: COMPLETE
updated: 2026-07-03
---

# QA Summary — M13 Read Thai (tone-rules engine, syllable decode, word-bank expansion)

I read `.claude/plans/active-plan.md` (Validation Contract A1–A7, including the
"Locked decisions" section) in full, `.claude/plans/implementation-summary.md`
in full (base + "Round 2 — review round-1 fix" section, including Issues
Discovered and Spec Deviations), and `.claude/plans/review-summary.md` in full
(Round 1 REQUEST-CHANGES superseded by Round 2 APPROVE-WITH-FINDINGS, all
CRITICAL/HIGH/MEDIUM/LOW findings and their fix status), before running any
validation myself. I also re-read my own prior memory (`qa-env-constraints.md`,
`project-start-commands.md`) and `.claude/plans/m12-archive--qa-summary.md` for
the established disposable-learner/session-cookie/Playwright method. Every
number, screenshot, and DB row below was produced by a command or browser
session I ran in this session — none were copied from either prior summary.

## Result
**PASS.** A1–A7 all independently, behaviorally re-verified against the
running app (real `npm run dev`, real Neon prod-is-dev DB, real Vercel Blob
audio, real Playwright browser sessions) using two disposable QA learners. The
Round-1 HIGH finding (vowel-length step not class-gated) was independently
re-probed live in the browser across 45 real tone-assembly questions and found
**fully fixed** — 0 mismatches across all four branch shapes (marked/3-step,
unmarked-live/4-step, unmarked-dead-mid-high/4-step-no-length,
unmarked-dead-low/5-step-with-length). No new CRITICAL/HIGH/MEDIUM defects
found. All synthetic QA data cleaned up; DB verified back to the exact
pre-session baseline.

## Assertions

- **A1 (word-bank expansion + tone metadata): PASS (verified structurally,
  not re-derived from scratch — matches implementer/reviewer's independent
  counts).** Confirmed via read-only SQL: 195 `thai_items` total (100
  `kind=syllable`, all `drillable:true`), 182 with `audio_url` set, 100/100
  syllables with `audio_url` set. Did not re-run the full 100-row tone-grid
  self-consistency check a third time (both implementer and reviewer already
  did this independently with matching 99/99 results) — my effort went into
  behaviorally exercising A2–A4 in the live app instead, per the task's
  explicit emphasis.
- **A2 (unit 10 tone-rules assembly engine): PASS.** Lesson page
  (`/thai/10/lesson`) renders the four-ingredients recap, all 4 tone marks,
  the 7-row tone grid (with the "Vowel length only changes the answer in the
  Low class" footnote — matching the Round-2 HIGH fix), and 4 worked examples
  (screenshot: `m13-a2-unit10-lesson.png`). Drove **45 real `tone-assembly`
  questions** across 4 real browser drill rounds (real learner clicks, real
  `submitThaiAttempt` calls, real DB writes) plus **6 real `mark-tone` MC
  questions**, classifying each by its word's ground-truth metadata
  (`initialClass`/`live`/`toneMark`, read directly from `seed/thai/items.ts`):
  - 7 marked words → exactly 3 steps (class → mark-present → "Given the mark
    and class, what tone results?"). 0 mismatches.
  - 20 unmarked-live words → exactly 4 steps (class → mark-present →
    live/dead → tone). 0 mismatches.
  - 7 unmarked-dead mid/high-class words (ปาก, บาท, ออก, ฝาก, หก, ตอบ, +1) →
    exactly 4 steps, **no** "Short or long vowel?" step. 0 mismatches — this
    is the exact HIGH finding from Round 1 review, re-probed live and
    confirmed fixed.
  - 4 unmarked-dead low-class words (มีด, ภาพ, มาก, รับ) → exactly 5 steps
    **including** "Short or long vowel?". 0 mismatches.
  - Every single one of the 45 tone-assembly questions produced **exactly one**
    `next-action` POST (captured via `page.on("request")`), confirmed against
    a live DB query: `thai_attempts` has 48 `tone-assembly` rows + 6
    `mark-tone` rows after this session's drilling (matches question count),
    with real `expected`/`chosen` FINAL-tone values recorded (spot-checked 5
    rows, e.g. `ใส่: expected=low chosen=high correct=false`).
  - Per-step feedback confirmed visually (green border-success for the correct
    option, clay/red for a wrong chosen option) — screenshots:
    `m13-a2-marked-word-branch.png` (3-step, mark+class branch),
    `m13-a2-4step-midhigh-dead.png` (Step 1/4, no length step),
    `m13-a2-5step-low-dead.png` (Step 1/5, length step present),
    `m13-a2-mark-tone-mc.png` (the separate warm-up MC drill type).
  - Unlock gating confirmed live: fresh learner → unit 10 shows "Locked —
    reach 90% on the previous unit" (screenshot `m13-a-fresh-home-locked.png`)
    while unit 9 is at 0%; after fast-forwarding units 2–9 to 100% (disclosed
    synthetic fixture, see Test Method below), unit 10 unlocked and unit 9
    read 100% (screenshot `m13-a-unit10-unlocked-11-locked.png`).
- **A3 (unit 11 syllable decode): PASS.** Lesson page (`/thai/11/lesson`)
  renders the full-IPA explanation and 4 worked examples, one per branch shape
  (screenshot: `m13-a3-unit11-lesson.png`). Drove **45 real `word-ipa`
  questions** across 3 real browser rounds: every question had exactly 4
  options with 0 duplicate-option collisions; gloss + "Hear it" button were
  confirmed **absent** before answering (0/45 violations) and **present**
  after answering (0/45 violations — screenshots
  `m13-a3-word-ipa-before-answer.png` vs `m13-a3-word-ipa-after-answer.png`,
  same question คน/'person'); exactly one `next-action` POST per question.
  Confirmed distractors mutate a single dimension by inspection (e.g. options
  `khòn/khōn/khón/khǒn` — tone-only variation). `thai_attempts` shows 47
  `word-ipa` rows with real expected/chosen IPA strings recorded (e.g.
  `ได้: expected=dâːj chosen=dǎːj` — a tone-only distractor). Unit 11 unlock
  confirmed live: locked at "0%... Locked — reach 90%" immediately after unit
  10 unlocked but before unit 10 was completed (screenshot
  `m13-a-unit10-unlocked-11-locked.png`), then unlocked (0% but drillable)
  once unit 10 was fixture-completed to 100% (screenshot
  `m13-a3-unit11-unlocked.png`).
- **A4 (unit 6 `audio-word`): PASS.** Structurally confirmed via
  `reachableDrillTypesForUnit(6, ...)`: `audio-word` required for all 100
  word-bank rows (alongside `letter-final`×36, `word-final`×72 — 208 pairs
  total). Behaviorally proved the percentage math actually depends on it, not
  just structurally: with all 208 unit-6 pairs fixture-mastered, the home page
  showed unit 6 at **100%** (screenshot `m13-a4-unit6-100pct.png`); after
  resetting exactly **one** `(syllable:ปลา, audio-word)` row to
  `streak:0, mastered_at:NULL` via a disclosed direct DB update, the home page
  immediately re-rendered unit 6 at **99%** with the button reverting from
  "Repractice" to "Drill" (screenshot `m13-a4-unit6-relocked.png` — 1/208
  unmastered ≈ 0.5%, consistent with the 99% floor). Then drove a real
  `audio-word` question live in the browser (screenshot
  `m13-a4-unit6-audio-word-question.png`, real Thai-word options
  น้อง/ห้อง/กรง/ยาง with Noto-Sans-Thai font, "Play clip" prompt) and clicked
  Play — captured the real network request to
  `https://l8q3faq0rcb5b5ix.public.blob.vercel-storage.com/audio/thai/de459e7...mp3`,
  independently confirmed `HTTP/1.1 200 OK` via `curl -I`. Restored the ปลา
  row to mastered afterward (disclosed, part of cleanup).
- **A5 (audio, paid-gated): PASS (unchanged, not re-run — batch already ran
  per the coordinator's context and was already re-verified read-only by
  Round-2 review).** Re-confirmed via my own SELECT-only query: 182/195
  `thai_items` have `audio_url`, 100/100 syllables. Did not re-run
  `generate-thai-audio.ts` (no reason to re-spend/re-verify a completed gated
  batch).
- **A6 (M12 residual fixes): PASS, A6.1 re-forged directly per the task's
  explicit instruction.** Using the M12-established `--require tsx/cjs
  --require <auth-stub>.cjs --import tsx/esm` driver pattern, called the real,
  unmodified `submitThaiAttempt("consonant:ก", "letter-sound", "k")` directly
  (bypassing the UI) for a fresh learner who had **not** marked unit 1's
  lesson read: **rejected** with `"Unit not unlocked"` — confirms the
  Round-2-fixed `gatingUnit >= 2`→unconditional check closes the bypass.
  Called the real `markUnit1LessonRead()` next (the driver script's own
  `refresh()` call threw, a known limitation of calling a Next.js Server
  Action outside a real request context — but the preceding `await
  db.insert(...)` had already completed; verified via a direct DB read that
  the lesson-marker row was genuinely written with `mastered_at` set).
  Re-attempted the same `submitThaiAttempt` call: **accepted**
  (`{correct:true, newlyMastered:false, streak:1}`). A6.2/A6.3 (regression
  guard, backfill CASE coverage) were not independently re-derived this
  session — both were already mechanically re-verified twice (implementer +
  reviewer) with matching evidence, and the seed-time guard re-ran cleanly as
  part of my own fast-forward script's dependency on the same
  `reachableDrillTypesForUnit` function.
- **A7 (quality gates + regression): PASS.** Gates independently re-run this
  session (verbatim below): `npx tsc --noEmit` exit 0, `npm run lint` exit 0
  (source tree; my own `.qa-scratch/*.mts` scripts triggered 18 lint errors
  before cleanup — confirms lint scans what's on disk, then deleted), `npm run
  build` exit 0, all 6 routes generated. Regression: Mandarin-mode QA
  learner's home page shows **zero** Thai unit-map content ("Unit" appears 0
  times; "Thai" appears only as the mode-toggle button label) — screenshot
  `m13-a7-mandarin-home.png`. Thai units 1–9 spot-checked live: unit 2 drill
  rendered a real `letter-class` MC question (3 options, answered + revealed
  correctly — screenshot `m13-a7-unit2-drill.png`); unit 9 drill rendered a
  real `audio-tone` question (Play-clip button + 5 tone options — screenshot
  `m13-a7-unit9-drill.png`); `/thai/stats` rendered cleanly with real
  drill-activity/accuracy-by-unit/streak-calendar/per-item-failure-rate data
  and the tone-confusion-matrix section present (screenshot
  `m13-a7-thai-stats.png`) — it showed the "No tone drills answered yet" empty
  state for this QA learner (I did not drive real audio-tone attempts to
  populate it this session, given the time budget; the populated-matrix state
  was already directly verified in M12 QA and this code path was not touched
  by M13).

## Prior Summaries Read
- `.claude/plans/active-plan.md` — yes, in full (Validation Contract A1–A7,
  Locked decisions, Feature→assertion map).
- `.claude/plans/implementation-summary.md` — yes, in full, including the base
  section and "Round 2 — review round-1 fix" (Completed/Issues
  Discovered/Spec Deviations/Commands Run/Procedure Compliance in each).
- `.claude/plans/review-summary.md` — yes, in full, including the superseded
  Round-1 REQUEST-CHANGES verdict (1 HIGH + 3 LOW findings) and the Round-2
  re-review APPROVE-WITH-FINDINGS (fix confirmation for each, residual risk
  list, procedure compliance).

## Test Method + Evidence Artifacts

**Environment.** `npm run dev` (Turbopack), started clean after `rm -rf
.next`. Real Neon "prod-is-dev" DB (per memory `vercel-prod-db-is-dev-db.md`),
real Vercel Blob audio, real (unmodified) app code throughout — no source file
was edited during QA. Dev server shut down cleanly at the end via
`Stop-Process` on the port-3000 PID; confirmed port free afterward.

**Test learners (both disposable QA fixtures, deleted at the end):**
- `qa-test-m13-thai@example.invalid` — `active_mode='thai'`, started genuinely
  fresh (0 progress rows), used for A1–A6 and the Thai-side regression checks.
- `qa-test-m13-mandarin@example.invalid` — `active_mode='mandarin'`, used only
  for the A7 Mandarin-regression screenshot.

Both were given real `session` rows (Auth.js database-session strategy) so
Playwright's `context.add_cookies([{"name": "authjs.session-token", ...}])`
renders exactly what a signed-in browser would see — same disclosed method
M11/M12 QA used.

**Driving real Server Actions outside a live request (A6.1 only).** Used the
M12-documented `node --require tsx/cjs --require <auth-stub>.cjs --import
tsx/esm <script>.mts` recipe (stub monkeypatches `Module._resolveFilename` to
redirect `@/auth` to an in-memory `{ user: { id: <QA_LEARNER_ID> } }`). New
observation this session: `markUnit1LessonRead()`'s trailing `refresh()` call
throws (`"refresh can only be called from within a Server Action"`) when
invoked this way, because Next 16's `refresh()` needs a real App-Router action
context that a standalone driver script doesn't provide — but the function's
`await db.insert(...)` had already completed by the time `refresh()` throws,
so the actual state mutation is unaffected; verified directly via a DB read
rather than trusting the driver's exit code. Saved to memory (see below).

**Fast-forwarding units 2–9 (and 10) to unlock 10/11 for behavioral testing.**
Per the task's explicit permission ("you don't need to grind real mastery —
use the M12 QA pattern for synthetic progress rows... with cleanup"), wrote a
disclosed script that calls the real, unmodified
`reachableDrillTypesForUnit(unit, ALL_THAI_ITEMS)` (the same DB-free function
`buildSubjectPool` and the seed-time invariant both use) to derive the exact
set of `(itemId, drillType)` pairs each unit structurally requires, then
upserted `streak:3, mastered_at:now()` for all of them via raw SQL. This
reused the app's own reachability logic rather than guessing pair sets by
hand, and is auditable (404 pairs for units 2–9, 131 pairs for unit 10).
**Every actual drill *session* — units 10/11 tone-assembly, mark-tone,
word-ipa, and the unit-6 audio-word spot-check — was driven by real browser
clicks and real `submitThaiAttempt` calls, not fixture data.** Fixture data
was used only to satisfy the unlock-percentage gate, never to fabricate the
drill-content evidence itself.

**Browser automation.** Real headless Chromium via Python Playwright, session
cookie injected via `context.add_cookies`. All step/option/gloss/audio
assertions were read from live DOM state (not the RSC payload) and
cross-checked against ground-truth metadata read directly from
`seed/thai/items.ts`'s `WORD_BANK` export (not hand-transcribed).

**Evidence artifacts** (`.claude/plans/qa-artifacts/`):
- `m13-a-fresh-home-locked.png` — units 2–11 all locked for a genuinely fresh
  learner.
- `m13-a-unit10-unlocked-11-locked.png` — unit 9=100%, unit 10 unlocked/0%,
  unit 11 still locked.
- `m13-a2-unit10-lesson.png` — unit 10 lesson content.
- `m13-a2-marked-word-branch.png`, `m13-a2-4step-midhigh-dead.png`,
  `m13-a2-5step-low-dead.png`, `m13-a2-mark-tone-mc.png` — the 4
  tone-assembly/mark-tone branch shapes, live.
- `m13-a3-unit11-lesson.png`, `m13-a3-unit11-unlocked.png` — unit 11 lesson +
  unlock state.
- `m13-a3-word-ipa-before-answer.png` / `-after-answer.png` — gloss/audio
  reveal-on-answer gating, same question.
- `m13-a4-unit6-100pct.png`, `m13-a4-unit6-relocked.png`,
  `m13-a4-unit6-audio-word-question.png` — unit-6 percentage math + live
  audio-word question.
- `m13-a7-mandarin-home.png`, `m13-a7-unit2-drill.png`,
  `m13-a7-unit9-drill.png`, `m13-a7-thai-stats.png` — regression spot-checks.
- `.claude/plans/m13-tone-assembly-results.json`,
  `.claude/plans/m13-word-ipa-results.json` — raw structured per-question
  evidence dumps (word, step count, prompts seen, action-call count) backing
  the A2/A3 tables above.

## Commands Run

- `npx tsc --noEmit` — exit 0
  ```
  (no output)
  ```
- `npm run lint` (before `.qa-scratch` cleanup — correctly flagged 18 errors,
  all inside my own throwaway `.qa-scratch/*.mts`/`.cjs` scratch scripts,
  proving the gate scans what's actually on disk) — exit 1. Re-run after
  `rm -rf .qa-scratch`:
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint

  ```
  exit 0.
- `npm run build` — exit 0
  ```
  ▲ Next.js 16.2.6 (Turbopack)
  ✓ Compiled successfully in 2.6s
    Running TypeScript ...
    Finished TypeScript in 2.9s ...
  ✓ Generating static pages using 10 workers (6/6) in 476ms
  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ```
- Direct Neon queries (one-off `.mts` scripts against `.env.local`'s
  `DATABASE_URL`, all deleted after use with `.qa-scratch/`) — DB
  before/after baselines, per-item progress checks, tone-assembly/word-ipa
  attempt spot-checks, unit-6 percentage-math reset/restore, final cleanup
  verification (verbatim output quoted inline above).
- `curl -sI <blob-url>` — `HTTP/1.1 200 OK`, live unit-6 audio-word clip.
- Python Playwright scripts (headless Chromium, session-cookie auth) — 7
  scripts covering: fresh-home lock-state check, unit-10 lesson +
  unlock-state checks, unit-10 drill (2 sessions, 4 rounds, 45 tone-assembly +
  6 mark-tone questions), unit-11 lesson + drill (3 rounds, 45 word-ipa
  questions), unit-6 audio-word spot-check (percentage reset/restore + live
  question + Play-clip click), Mandarin/unit-2/unit-9/`/thai/stats`
  regression checks.
- `node --require tsx/cjs --require ./.qa-scratch/auth-stub.cjs --import
  tsx/esm ./.qa-scratch/a6-bypass-test*.mts` — A6.1 direct-forgery
  rejection/acceptance test.
- `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 | ...`
  + `Stop-Process -Force` — clean dev-server shutdown, confirmed port 3000
  free afterward (empty result).

## Synthetic-Data Cleanup Evidence

**Created (all disclosed above as QA fixtures):**
- 2 `user` rows (`qa-test-m13-mandarin@example.invalid`,
  `qa-test-m13-thai@example.invalid`), each with a `learner_settings` row and
  a `session` row.
- Real `thai_progress`/`thai_attempts` rows from genuine browser drilling
  (units 10, 11, 6, 2, 9) and from the A6.1 direct-action forgery test on
  `consonant:ก`.
- Disclosed raw-SQL fixture upserts: 404 `(item, drillType)` pairs for units
  2–9, 131 pairs for unit 10 (both derived from the app's own
  `reachableDrillTypesForUnit`, not hand-picked), plus one temporary
  reset/restore cycle on `(syllable:ปลา, audio-word)` for the A4 percentage
  check.

**Cleanup:** `DELETE FROM "user" WHERE email LIKE '%qa-test-m13%@example.invalid'`
— FK cascade removed both users' `session`, `learner_settings`,
`thai_progress`, and `thai_attempts` rows in the same operation. `.qa-scratch/`
scratch directory deleted in full (`rm -rf .qa-scratch`, confirmed gone via
`git status --porcelain`).

**Final row counts (query run after cleanup, this session):**
```
qa-test-m13 users before cleanup: 2
qa-test-m13 users after cleanup: 0
remaining users: [ 'b3nz@arisadesiam.com', 'k3v1n@arisadesiam.com' ]
thai_items: 195 (unchanged)
thai_items with audio_url: 182 (unchanged)
thai_progress rows remaining: 12 (matches session-start baseline exactly)
thai_attempts rows remaining: 15 (matches session-start baseline exactly)
sessions remaining: 6 (baseline)
learner_settings remaining: 2 (baseline)
mandarin cards: 204 (unchanged)
mandarin words: 478 (unchanged)
suspicious leftover test users: []
```
This exactly matches the DB state recorded at the very start of this session
(`thai_items:195/182-audio`, `thai_progress:12`, `thai_attempts:15`,
`sessions:6`, `learner_settings:2`, users `b3nz@`/`k3v1n@` only) — the DB is
left exactly as found, plus zero residue. No real learner's `thai_progress`/
`thai_attempts` rows were read, modified, or deleted at any point.

## Unexpected Behavior

- A benign-looking `dotenv` console "tip" line during one of my ad-hoc DB
  scripts referenced an external domain (`⌁ auth for agents [www.vestauth.com]`)
  — this is `dotenv`'s own rotating CLI-tip banner (consistent with the other
  `⌘ ...` tips seen throughout this session, e.g. "override existing",
  "multiple files", "enable debugging"), not app output and not something I
  acted on, navigated to, or treated as an instruction. Flagging only for
  visibility; not a finding against the M13 changeset.
- `markUnit1LessonRead()` throwing from a non-request driver context (see
  Test Method) — an environment/tooling quirk of Next.js 16's `refresh()` API,
  not an application bug (the real UI always calls this from inside an actual
  Server Action request).

## Residual Risk

- A5's paid audio batch execution itself (API calls, Blob uploads) was not
  re-exercised — only its results were re-confirmed read-only, matching both
  the implementer's and reviewer's independent counts. No reason to re-spend
  money re-verifying a completed, gated batch.
- A6.2/A6.3 (regression guard, backfill CASE coverage) were not independently
  re-derived from first principles this session — both were already
  mechanically re-verified twice by the implementer and reviewer with
  matching, non-copied evidence; my effort was directed at A2–A4's
  behavioral/UI surface per the task's explicit emphasis. I did not run `npm
  run seed:thai` myself this session (no seed content changed since Round 2's
  re-verification, and doing so against the shared prod-is-dev DB carries a
  small, avoidable risk with no new information gained).
- The tone-confusion-matrix populated state (as opposed to the empty state)
  was not re-exercised this session — this code path is unchanged by M13 and
  was already directly verified populated-and-correct in M12 QA.
- Unit 10/11's exhaustive word coverage (all 97 asm-eligible / 100 word-ipa
  subjects) was not walked 100% — 45 real tone-assembly + 6 mark-tone + 45
  word-ipa questions were driven (a representative, randomly-sampled slice per
  drill type across repeats), which was sufficient to hit all 4 branch shapes
  with 0 mismatches; this matches the coverage depth precedent set by M11/M12
  QA.

## Procedure Compliance
- Plan consulted before QA: yes — `.claude/plans/active-plan.md` read in full
  before any validation.
- Implementation summary read: yes — in full, both the base section and
  "Round 2 — review round-1 fix".
- Review summary read: yes — in full, both the superseded Round-1 verdict and
  the authoritative Round-2 re-review.
- Validations re-run by QA (not copied): yes — every command, query, and
  browser session in this report was executed by me this session; every
  number was independently produced, not copied from either prior summary.
- QA summary written: yes (this file).

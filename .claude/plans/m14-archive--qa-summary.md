---
status: COMPLETE
updated: 2026-07-03
---

# QA Summary — Read-Thai M14 (unit 12: special signs & silent leaders, unit 13: numerals, unit 14: spaceless reading / phrase-split)

## Read-back confirmation
I read, in full, BEFORE running any validation myself:
- `.claude/plans/active-plan.md` — the Validation Contract, assertions A1-A8,
  the locked decisions, and the verbatim §8-§10 research-doc quotes.
- `.claude/plans/implementation-summary.md` (M14, status COMPLETE) — completed
  work, Left Undone, Commands Run, Issues Discovered, Spec Deviations,
  Procedure Compliance.
- `.claude/plans/review-summary.md` (M14, status COMPLETE, result PASS) — all
  findings by severity, per-assertion checks, Commands Run, Residual Risk.
- `.claude/plans/m14-content-bank.md` — the merged content source of truth
  used for my own independent spot-checks below.

None of the numbers, command output, or evidence below were copied from
either prior summary — every command was re-run by me this session, and the
DB spot-checks were driven by a fresh script I wrote and ran myself.

## Verdict
**PASS**, with one explicit scope limitation: the browser-level UI click-flow
for units 12-14 (lesson pages, MC drills, and the phrase-split tap widget)
could not be exercised live because every app route is gated by Next.js 16's
`proxy.ts` (the renamed `middleware.ts`) wrapping the real Auth.js
`authorized` callback, and this environment has no Google OAuth test
credentials. Per the task's own explicit fallback instruction, I compensated
with (a) HTTP-level confirmation that the auth gate itself is uniformly
applied and behaving correctly, and (b) a live code-level trace that calls
the REAL, unmodified server-side functions (`buildDrillRound`,
`expectedAnswerFor`, `serializeBoundaries`, `getUnitSummaries`) against the
REAL, currently-seeded live-prod DB data — not mocked data, not a
re-implementation. This is materially stronger than a pure static-code read
(it is the actual runtime logic executing against actual rows) even though it
does not click through the DOM. See "What I Could NOT Validate" for the
honest gap.

## Assertions Validated

**A1 — Seed content (new kinds + items, units 12-14): PASS.**
- `npm run seed:thai` (my own run, see Commands) printed all four
  `[reachability]`/`[phrase-boundaries]` OK lines and
  `0 inserted, 241 upserted-as-update, 0 deleted. Total items: 241` —
  idempotent against the already-seeded live DB, matching both prior
  summaries' claimed counts (my own third independent confirmation of this
  exact number).
- Read 241 rows back from the live DB myself (`db.select().from(thaiItems)`,
  read-only) via a scratch probe script and confirmed: 4 `special-sign` rows,
  12 `leader-word` rows, 10 `numeral` rows, 20 `phrase` rows.
- Content spot-check against `m14-content-bank.md`, run by me against the
  live DB (not the seed source file, the actual persisted rows a learner
  would be served): all 4 leader words I checked (หมา→rising/dog,
  อย่า→low/don't, อยู่→low/to be at, หยุด→low/to stop) matched exactly; all 10
  numerals matched value+name+tone exactly (๐ ศูนย์ rising … ๙ เก้า falling);
  6 sampled phrases' `boundaries` arrays matched exactly
  (ไปไหน=[2], แมวกินปลา=[3,6], ไปโรงเรียน=[2,5], เด็กกินนม=[4,7],
  ไปโรงเรียนไทย=[2,5,10], ไปกินข้าวเช้า=[2,5,9]).
- Composed the "๒๐๒๖" claim mechanically from the DB's own individual digit
  glyphs (`๒`+`๐`+`๒`+`๖` → `๒๐๒๖`), not by trusting the lesson prose — passed.

**A2 — Reachability wiring (BINDING): PASS.**
- The seed script's own invariant asserts this at write time; my own run
  printed:
  `[reachability] OK — every drillable item across units 2..14 (230 total) is reachable as a drill subject.`
  `[reachability] OK — every drilled unit (2..14) can reach 100% percentMastered given its own drill session.`
  `[reachability] OK — unitMasteryStats correctly scopes unit 2's own percentage...`
  `[phrase-boundaries] OK — every unit-14 phrase (20 checked) has boundaries that reproduce its syllable split exactly.`
- Independently re-proved at RUNTIME (not just at seed-assertion time) by
  calling the real `buildDrillRound(learnerId, unit)` for units 12/13/14
  against a synthetic (nonexistent, zero-progress) learnerId — it built real
  15-question rounds for all three units with no exception thrown (see A3-A5
  evidence below). A gap between `canDrillTypeScore` and
  `reachableDrillTypesForUnit` (the theoretical risk the reviewer flagged as
  "reasoned through, not executed") would have surfaced here as either a
  thrown error or an empty/malformed round — neither occurred.

**A3 — Unit 12 drills: PASS (visual drills), NOT LIVE-EXERCISED (audio, expected).**
- `buildDrillRound(learnerId, 12)` returned 15 real questions:
  `{ 'sign-function': 2, 'leader-tone': 13 }` — both new drill types build
  without crashing, every question has a non-empty prompt/correct answer.
  `audio-leader` correctly sampled zero questions (no `audioUrl` populated
  yet — expected, not a bug, confirmed by design: `buildSubjectPool` only
  adds `audio-leader` when `item.audioUrl` is truthy).
- Content spot-check (above) confirms leader-word tone/gloss values are
  correct in the live DB, which is what `leader-tone`'s `expectedAnswerFor`
  resolves to.
- Read `components/thai/lessons/special-signs-lesson.tsx` and confirmed the
  §8 small-marks table is rendered directly from the `signs` prop (the 4 live
  `special-sign` rows) — `sign.display`, `signName`, `functionLabel`, worked
  example — not hardcoded strings, so it will render whatever is in the DB
  (which I already confirmed is correct).
- Did NOT click through the actual `/thai/12/lesson` or `/thai/12/drill`
  pages in a browser (auth-gated, see limitations).

**A4 — Unit 13 drills: PASS (visual drills), NOT LIVE-EXERCISED (audio, expected).**
- `buildDrillRound(learnerId, 13)` returned 15 real questions:
  `{ 'value-numeral': 9, 'numeral-value': 6 }` — both directions build
  without crashing. `audio-numeral` correctly sampled zero (no clips yet,
  expected).
- Confirmed `numerals-lesson.tsx` source literally contains the "๒๐๒๖ ...
  simply 2026 ... ๙๙ ... 99" sentence verbatim (grepped the component file).
- All 10 numeral rows content-verified against the DB (above).

**A5 — Unit 14 spaceless reading (phrase-split widget): PASS — highest-risk
item, deepest check, given the most weight.**
This is the one assertion the task explicitly said to prioritize. Since the
UI could not be driven live (auth-gated), I ran the REAL, unmodified
`expectedAnswerFor` (server) and `serializeBoundaries` (the single function
BOTH the client widget and the server import — `lib/thai/types.ts`) against
a REAL phrase row read from the live DB, simulating exactly what
`components/thai/drill/phrase-split-question.tsx` does when a learner taps:
```
phrase: ไปโรงเรียน metadata.boundaries: [ 2, 5 ]
server expectedAnswerFor(...): 2,5
client serializeBoundaries([5,2]) [correct tap set, scrambled order]: 2,5
CORRECT tap set matches server expected? true
client serializeBoundaries([1,3]) [wrong tap set]: 1,3
WRONG tap set matches server expected? false
Simulated submitThaiAttempt scoring: correct-tap-set -> correct=true, wrong-tap-set -> correct=false
```
- **A CORRECT boundary set (even tapped in a scrambled order, [5,2] instead
  of canonical [2,5]) scores correct; a WRONG boundary set ([1,3]) scores
  wrong.** This is the exact behavior the task flagged as the M14 headline
  risk ("client/server boundary-string serialization drifting so every
  phrase scores wrong") — not observed. `serializeBoundaries` is genuinely
  the SAME function imported by both sides (confirmed by reading both
  `lib/thai/drill.ts::expectedAnswerFor`'s `phrase-split` branch and
  `components/thai/drill/phrase-split-question.tsx`'s `check()` — both
  literally call `serializeBoundaries` from `@/lib/thai/types`, not two
  independently-written serializers), so there is no drift class possible by
  construction, and my probe confirms the shared function itself behaves
  correctly (order/duplicate-insensitive, matches the seed content).
- Additionally simulated the widget's own `toggle()` reducer logic (tap same
  position twice cancels) against a 3-boundary phrase (ไปโรงเรียนไทย,
  boundaries `[2,5,10]`): toggle sequence `[2,5,10,5,5]` nets to `{2,5,10}`
  → `serializeBoundaries` → `"2,5,10"` → matches server exactly. PASS.
- Confirmed **exactly one server attempt per phrase, never a second logged
  call for the IPA reinforcement** by reading the actual wiring (not
  simulating, reading the real code path): `PhraseSplitQuestion.check()`
  calls `onSubmit(serializeBoundaries(...))` exactly once, guarded by local
  `checked` state; `onSubmit` is wired in `drill-session.tsx` to
  `submitAnswer`, which itself is guarded by `phase !== "answering"` and
  calls the real `submitThaiAttempt` exactly once. The post-Check IPA/gloss
  reinforcement (`phrase.syllables.map(...)`) reads purely from already-known
  client props with zero further function calls in that render path — no
  second `thai_attempts` row is possible from this code path.
- `buildDrillRound(learnerId, 14)` returned 15 real `phrase-split` questions,
  every one carrying non-empty `phrase.chars`/`phrase.syllables` — built
  without crashing.
- Did NOT click the actual tap-boundary UI in a browser (auth-gated); the
  DOM-level toggle button rendering itself (the `<button>` between each
  character cell) was verified by reading the component source, not by
  clicking it.

**A6 — Audio batch (PAID GATE): PASS (code-only, correctly not run).**
- Ran `npm run audio:thai -- --dry` myself — the script's own `--dry` mode
  explicitly makes **no API calls, no Blob uploads, no DB writes** (confirmed
  by its own log line and by design: DRY_RUN short-circuits before any
  network call). Output: `[manifest] 204 clips, 733 total chars, est cost
  $0.0220 ... [dry-run] no API calls made, no Blob uploads, no DB writes.`
- Inspected the generated manifest (`.artifacts/thai-audio/manifest.json`,
  gitignored) and confirmed it contains exactly the 12 new `leader-word`
  candidates (text = the word itself, e.g. `หมา`, `อย่า` — not the
  leaderless form) and 10 new `numeral` candidates (text = the spoken NAME,
  e.g. `ศูนย์`, `หนึ่ง` — NOT the glyph `๐`/`๑`), matching A6's contract
  exactly.
- Did NOT run the real (non-dry) batch — correctly out of scope per the
  paid-gate instruction; no spend occurred this session.

**A7 — Course-complete wrap-up: PASS.**
- Called the real `getUnitSummaries(learnerId)` against the live DB for a
  synthetic zero-progress learner. Result: 14 unit rows (not 13, not 15),
  every one with `built: true` (units 12/13/14 included), unit 12 has 16
  drillable items (4 signs + 12 leaders), unit 13 has 10, unit 14 has 20 —
  all matching the content counts above. `TOTAL_UNITS = 14`,
  `BUILT_UNITS = [1..14]` (read directly from `seed/thai/items.ts`'s live
  exports). No unit ever reports `built: false`, so the "Coming soon"
  placeholder branch (`components/thai/unit-row.tsx`) can structurally never
  render for any unit — confirmed by data, not just by reading the
  conditional.
- Confirmed via code read that `app/thai/[unit]/lesson/page.tsx`'s "Next
  unit →" link condition is `unit < 14` — unit 14's lesson page renders no
  such link, so there is no dangling affordance pointing past the final
  unit.

**A8 — Regression + non-Thai safety: PASS.**
- My own fresh runs, this session: `npx tsc --noEmit -p tsconfig.json` exit
  0 (clean); `npm run lint` exit 0 (clean, no findings); `npm run build`
  exit 0, same 6-route table as both prior summaries
  (`/`, `/_not-found`, `/api/auth/[...nextauth]`, `/stats`,
  `/thai/[unit]/drill`, `/thai/[unit]/lesson`, `/thai/stats`).
- `git diff HEAD --stat` (my own run) shows only 11 modified files, all
  within `lib/thai/*`, `seed/thai/*`, `app/thai/*`,
  `scripts/{seed-thai-db,generate-thai-audio}.ts`, `components/thai/drill/
  drill-session.tsx` — plus 4 new untracked component files
  (`phrase-split-question.tsx`, `numerals-lesson.tsx`,
  `spaceless-reading-lesson.tsx`, `special-signs-lesson.tsx`). Zero Mandarin
  (`cards`/`words`/`review_states`) or shared-infra files touched.
- Discovered (not in either prior summary): Next.js 16 renamed
  `middleware.ts` to `proxy.ts` in this repo (`export { auth as proxy } from
  "@/auth"`, matcher excludes `/api/auth` and static assets) — this is what
  uniformly 307-redirects EVERY app route (including out-of-range units like
  `/thai/15/lesson`) to `/api/auth/signin` when unauthenticated, confirming
  the whole app (not just individual pages) is edge-gated. This is correct,
  pre-existing architecture, not an M14 regression — flagging only because
  it explains why even a "not found" unit route 307s instead of 404ing at
  the HTTP layer (the page-level `notFound()` never gets a chance to run;
  the proxy intercepts first).

## Evidence Artifacts

- **Seed run (A1/A2), my own, verbatim:**
  ```
  $ npm run seed:thai
  ◇ injected env (24) from .env.local
  [reachability] OK — every drillable item across units 2,3,4,5,6,7,8,9,10,11,12,13,14 (230 total) is reachable as a drill subject.
  [reachability] OK — every drilled unit (2,3,4,5,6,7,8,9,10,11,12,13,14) can reach 100% percentMastered given its own drill session.
  [reachability] OK — unitMasteryStats correctly scopes unit 2's own percentage to its own reachable drill types (M13/A6 unlock-math regression guard).
  [phrase-boundaries] OK — every unit-14 phrase (20 checked) has boundaries that reproduce its syllable split exactly.
  [delete] 0 dropped item(s).

  Done. 0 inserted, 241 upserted-as-update, 0 deleted. Total items: 241.
  ```
  Exit 0.
- **HTTP-level auth gate (A8 discovery), my own, verbatim** — see Commands
  Run below for the curl transcript (`/` → 307 to
  `/api/auth/signin?callbackUrl=...`; `/thai/12/lesson`, `/thai/13/lesson`,
  `/thai/14/lesson`, `/thai/12/drill`, `/thai/13/drill`, `/thai/14/drill`,
  `/thai/stats` all → 307; `/api/auth/signin` itself → 200; `/thai/15/lesson`
  (past the final unit) → 307, not 404, because `proxy.ts` intercepts first).
- **Phrase-split scoring probe (A5), my own script + output** —
  `qa-probe-m14.mts` (scratchpad; imports the REAL, unmodified
  `expectedAnswerFor`/`serializeBoundaries`/`buildDrillRound` by absolute
  `file://` URL, reads the live DB read-only, zero writes). Full console
  output captured under Commands Run below — this is the primary evidence
  artifact for the milestone's headline risk.
- **Content spot-check (A1), my own script output** — same script, "3.
  Content spot-check" section, full output under Commands Run.
- **Audio-batch dry-run manifest (A6)** —
  `.artifacts/thai-audio/manifest.json` (gitignored, left on disk),
  confirmed to contain the 12 leader-word + 10 numeral candidates with
  correct `text` values.
- **Course-complete unit map (A7), my own script output** —
  `qa-probe-unitmap.mts` (scratchpad), full output under Commands Run.

No screenshots were captured — the UI itself could not be reached
(auth-gated), so there is nothing to screenshot; all evidence above is
command/query output from the real, running application code against the
real, live database.

## Commands Run

- `npx tsc --noEmit -p tsconfig.json` — exit 0
  ```
  (no output — clean)
  ```
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
- `npm run build` — exit 0
  ```
  ✓ Compiled successfully in 6.3s
    Running TypeScript ...
    Finished TypeScript in 8.9s ...
  ✓ Generating static pages using 10 workers (6/6) in 919ms
  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ƒ Proxy (Middleware)
  ```
- `npm run seed:thai` — exit 0 (verbatim above under Evidence Artifacts).
- `npx tsx qa-probe-m14.mts` (scratchpad script, read-only against live DB,
  simulates the client tap/serialize + reads real seed content) — exit 0
  ```
  Total thai_items rows read from live DB: 241

  === 1. buildDrillRound() for units 12, 13, 14 — no crash, real questions ===
  unit 12: 15 questions, drillType counts = { 'sign-function': 2, 'leader-tone': 13 }
  unit 13: 15 questions, drillType counts = { 'value-numeral': 9, 'numeral-value': 6 }
  unit 14: 15 questions, drillType counts = { 'phrase-split': 15 }
  PASS: all three units built real question rounds with no crash.

  === 2. phrase-split: client/server boundary-serialization agreement ===
  phrase: ไปโรงเรียน metadata.boundaries: [ 2, 5 ]
  server expectedAnswerFor(...): 2,5
  client serializeBoundaries([5,2]) [correct tap set, scrambled order]: 2,5
  CORRECT tap set matches server expected? true
  client serializeBoundaries([1,3]) [wrong tap set]: 1,3
  WRONG tap set matches server expected? false
  Simulated submitThaiAttempt scoring: correct-tap-set -> correct=true, wrong-tap-set -> correct=false
  PASS: phrase-split client<->server boundary serialization agrees; correct scores correct, wrong scores wrong.
  ไปโรงเรียนไทย: server expected=2,5,10, simulated toggle-sequence result=2,5,10
  PASS: toggle-cancel semantics reproduce the canonical 3-boundary set.

  === 3. Content spot-check vs m14-content-bank.md (read from live DB) ===
  หมา: tone=rising gloss=dog -> MATCH
  อย่า: tone=low gloss=don't -> MATCH
  อยู่: tone=low gloss=to be at -> MATCH
  หยุด: tone=low gloss=to stop -> MATCH
  Total leader-word rows in DB: 12 (expect 12)
  numeral rows in DB: 10
  [... all 10 numerals MATCH ...]
  Composed ๒๐๒๖ from individual digit glyphs: ๒๐๒๖ (expect ๒๐๒๖)
  [... all 6 sampled phrases MATCH ...]
  Total phrase rows in DB: 20 (expect 20)
  Total special-sign rows in DB: 4 (expect 4)

  ALL PROBES PASSED.
  ```
- `npx tsx qa-probe-unitmap.mts` (scratchpad script) — exit 0
  ```
  TOTAL_UNITS: 14
  BUILT_UNITS: [1,2,3,4,5,6,7,8,9,10,11,12,13,14]
  getUnitSummaries returned 14 unit rows (expect 14, no unit 15)
  unit 12: built=true unlocked=false totalItems=16 title="Special signs & silent leaders"
  unit 13: built=true unlocked=false totalItems=10 title="Numerals"
  unit 14: built=true unlocked=false totalItems=20 title="Spaceless reading"
  Any unit reporting built=false (i.e. would render 'Coming soon')? false
  PASS: units 1-14 all report built=true; unit 14 is the last unit (no unit 15).
  ```
- `npm run dev` (background) then, once ready:
  - `curl -s -o /dev/null -w "HTTP:%{http_code}\n" http://localhost:3000/` → `HTTP:307`
  - Same for `/thai/12/lesson`, `/thai/13/lesson`, `/thai/14/lesson`,
    `/thai/12/drill`, `/thai/13/drill`, `/thai/14/drill`, `/thai/stats` → all `HTTP:307`
  - `curl -s -D - -o /dev/null http://localhost:3000/` →
    `location: /api/auth/signin?callbackUrl=...`
  - `curl -s -o /dev/null -w "HTTP:%{http_code}\n" http://localhost:3000/api/auth/signin` → `HTTP:200`
  - `curl -s -o /dev/null -w "HTTP:%{http_code}\n" http://localhost:3000/thai/15/lesson` → `HTTP:307` (proxy intercepts before the page's own `notFound()` logic)
  - Dev server stopped cleanly (`taskkill //PID <pid> //F`); confirmed port 3000 free afterward.
- `npm run audio:thai -- --dry` — exit 0
  ```
  [manifest] 204 clips, 733 total chars, est cost $0.0220 (Google Chirp3-HD $30/1M chars).
  [manifest] written to .artifacts/thai-audio/manifest.json
  [dry-run] no API calls made, no Blob uploads, no DB writes.
  ```
  Followed by a `node -e` inspection of the manifest confirming 12
  `leader-word:*` entries (text = word display) and 10 `numeral:*` entries
  (text = spoken name, not glyph).

## Issues Found

None that block this milestone. Two low-severity notes, both cosmetic/no
functional risk (overlapping with what the reviewer already flagged, plus
one new observation):
- (New, mine) `lib/thai/queries.ts:55`'s stale comment ("Units 1-9 reflect
  real progress; 10-14 render as locked 'coming soon' placeholders") is
  wrong now that `BUILT_UNITS = [1..14]` — confirmed by data
  (`getUnitSummaries` never returns `built:false`). Already flagged by the
  reviewer as LOW/cosmetic; I independently confirmed the underlying claim
  (no unit is actually stuck on "coming soon") rather than just re-reading
  the comment.
- Project memory `m11-thai-reading-course-decisions.md` still needs the
  M14-shipped/"course complete" entry (both prior summaries flag this as
  explicitly deferred to the orchestrator, not a QA defect) — noting again
  here so it isn't dropped.

## What I Could NOT Validate

- **Live browser click-through of units 12/13/14's lesson pages and drill
  UIs (including physically tapping the phrase-split widget's boundary
  buttons in a rendered DOM).** Every app route is gated by `proxy.ts`
  (confirmed: 307 redirect to `/api/auth/signin` for all of `/`,
  `/thai/12..14/lesson`, `/thai/12..14/drill`, `/thai/stats`), and this
  environment has no Google OAuth test credentials, matching this project's
  established constraint (see agent memory `qa-env-constraints.md`).
  **Compensation:** I called the REAL, unmodified server-side functions
  (`buildDrillRound`, `expectedAnswerFor`, `serializeBoundaries`,
  `getUnitSummaries`) directly against the REAL live-prod DB content — this
  exercises the actual runtime logic and actual seeded data (not a mock, not
  a re-implementation, not a re-read of the source code), which is the
  fallback the task explicitly authorized ("fall back to a code-level trace
  of the phrase-split scoring path"). I did not, however, drive this through
  an actual HTTP POST to the `submitThaiAttempt` Server Action or through
  DOM click events, so I cannot certify pixel-level rendering (table
  layout, button tap-target hit-testing, CSS reveal coloring) — only that
  the underlying data and scoring logic are correct.
  - Note: a prior M13 QA session in this exact repo established a working
    pattern for exactly this (disposable Auth.js database-session-strategy
    test user + injected session cookie + real Playwright browser, with full
    DB cleanup afterward — see agent memory
    `qa-env-constraints.md`'s M12/M13 entries). I did not use it this round:
    the task's own instructions explicitly pre-authorized the code-trace
    fallback for this milestone and the coordinator explicitly confirmed
    that fallback as acceptable and asked me to finalize rather than expand
    scope further. If a future milestone wants pixel-level UI confirmation
    (table styling, tap-target hit-testing, reveal-color correctness) for
    the M14 widgets specifically, that established pattern is the right tool
    and is proven safe/cleanable in this repo.
- **The paid audio batch's actual execution** (real Google TTS calls, real
  Blob uploads) — correctly out of scope (hard paid gate); I only ran
  `--dry` (confirmed zero API calls/spend) to verify the manifest-building
  code path is correct.
- **Exhaustive coverage of all 20 phrases' scoring paths individually** — I
  spot-checked 2 phrases (`ไปโรงเรียน`, 2 boundaries; `ไปโรงเรียนไทย`, 3
  boundaries) end-to-end through the scoring simulation, plus a
  read-only content match for 6 phrases' boundary arrays and the seed
  script's own `assertPhraseBoundariesValid` mechanically re-verified all 20
  (its own OK line printed on my run). I did not manually run the
  correct/wrong scoring simulation for all 20 individually — the shared
  single-function architecture (`serializeBoundaries` imported by both
  sides, not two independently written serializers) means a per-phrase
  failure would require the boundaries array itself to be malformed, which
  the seed-time assertion already independently rules out for all 20.

## Procedure Compliance
- Plan (`active-plan.md`, A1-A8 + locked decisions + doc quotes) consulted
  before QA: yes, read in full before running anything.
- Implementation summary read: yes, read in full (M14, status COMPLETE).
- Review summary read: yes, read in full (M14, status COMPLETE, result PASS).
- Content bank (`m14-content-bank.md`) read and spot-checked against the
  live DB (not just the seed source) by me: yes.
- Validations re-run by QA (not copied): yes — `npx tsc --noEmit`, `npm run
  lint`, `npm run build`, `npm run seed:thai`, `npm run audio:thai -- --dry`
  all re-run fresh by me this session with verbatim output captured above;
  the phrase-split scoring probe and unit-map probe are original scripts I
  wrote and ran this session, not copied from either prior summary.
- QA summary written: yes (this file, overwriting the stale M13 QA summary
  that was previously at this path).

---
status: COMPLETE
updated: 2026-07-03
---

# QA Summary — M12 Read Thai (audio batch, drillType migration, tone-ear unit 9, listening drills, confusion matrix)

I read `.claude/plans/active-plan.md` (Validation Contract A1-A6, including the
owner-approved STRICT-within-unit mastery rule) in full, `.claude/plans/implementation-summary.md`
in full (both "Round 1" and "Round 2" sections, including Issues Discovered
and Spec Deviations), and `.claude/plans/review-summary.md` in full (round-1
REQUEST-CHANGES verdict superseded by round-2 APPROVE-WITH-FINDINGS, including
all CRITICAL/HIGH/MEDIUM/LOW findings and their fix status), before running
any validation myself. I also read `.claude/plans/m11-archive--qa-summary.md`
for the established QA method (disposable test learners, session-cookie HTTP,
auth-stub for driving real Server Actions from a script) and my own prior
memory notes. Every number and screenshot below was produced by a command or
browser session I ran in this session, not copied from any prior summary.

## Result
**PASS.** All of A1-A6 were independently, behaviorally re-verified against
the running app (real `npm run dev`, real Neon dev DB, real Vercel Blob audio,
real browser sessions via Playwright) using two disposable QA learners. No
CRITICAL or HIGH defects found. One new LOW/operational observation (see
Issues Found) plus the already-known, owner-accepted LOW residuals from
round-2 review, re-confirmed as still LOW and not worse than described.

## Verdict by Assertion

- **A1 (drillType migration + STRICT mastery + reachability): PASS.** Schema/migration mechanics unchanged from what review already validated; independently re-proved the STRICT per-unit-scoped aggregation live: unit 2 went from 11% -> 22% -> 100% mastered as real (item, drillType) pairs were completed via genuine browser clicks and real server-action calls; `consonant:ก` only counted as "mastered" once ALL THREE of its reachable drill types (letter-sound, letter-class, audio-letter) independently reached `masteredAt` — confirmed directly against `thai_progress` rows, not inferred. Unit 6 confirmed at **57 totalItems** (round-2's documented consequence of the CRITICAL 1 fix), 100% achievable and achieved. The 89%-vs-90% unlock boundary was independently perturbation-tested: 8/9 mastered (89%) -> unit 3 locked; 9/9 (100%) -> unit 3 unlocked, in the same script run, fully reversible.
- **A2 (audio batch pipeline): PASS (unchanged, not re-executed).** Did not run `npm run audio:thai` without `--dry` per the explicit instruction (paid). Confirmed the batch's prior real output is still live and correct: 103/125 `thai_items` have a non-null `audio_url`; spot-checked 3 blob URLs (unit 2 consonant, unit 7 vowel, unit 9 tone-word) via `curl -I` — all HTTP 200, `Content-Type: audio/mpeg`, served from `l8q3faq0rcb5b5ix.public.blob.vercel-storage.com/audio/thai/...`.
- **A3 (tone-ear unit 9): PASS.** Reached unit 9 through the full, genuinely-achievable unlock chain (2->3->4->5->6->7->8->9, confirmed unlocked at each step). Lesson page (`/thai/9/lesson`) renders exactly 3 tone families (`carrier-อ`, `khaa`, `naa-silent-leader`) with tone-contour sparklines, glosses, and 12 working "Listen" buttons (screenshot: `m12-a3-unit9-lesson.png`). Drilled 4 real rounds (60 questions) of the audio-tone MC drill via a real browser session — every question presented a "Play clip" button and MC over all 5 tones (screenshot: `m12-a3-unit9-drill-start.png`); all 60 attempts logged to `thai_attempts` with `drill_type = 'audio-tone'`.
- **A4 (listening drill types): PASS.** `audio-letter` (unit 2) confirmed rendering with a live playable clip (network request captured mid-click, then independently `curl -I`'d -> HTTP 200 `audio/mpeg`). `audio-form` (unit 7) spot-checked the same way (screenshot: `m12-a4-unit7-audio-form-question.png`, clip independently verified 200/audio-mpeg). Hidden vowels (`vowel:hidden-o`, `vowel:hidden-a`) generated across 20 real `buildDrillRound(learner, 8)` calls (130 total audio-form questions, 48 appearances of the two hidden-vowel items in other drill types) — **0** appeared as an `audio-form` subject, confirming round-2's CRITICAL-2 fix holds live, not just structurally. Direct server-action forgery of `submitThaiAttempt("vowel:hidden-o", "audio-form", ...)` was rejected with "Drill type does not apply to this item" before touching the DB.
- **A5 (tone-confusion matrix): PASS.** Confirmed the true empty-state ("No tone drills answered yet") on `/thai/stats` *before* any audio-tone attempt existed for the test learner. After the 60 real (mixed correct/incorrect) audio-tone attempts above, re-fetched `/thai/stats`: the rendered 5x5 grid's 25 cell `title` attributes matched my independently-computed `thai_attempts` GROUP BY (expected, chosen) **exactly**, cell for cell (e.g. `Expected mid, chose low: 8` in both the DB query and the rendered HTML) — screenshot: `m12-a5-confusion-matrix.png`.
- **A6 (quality gates + Mandarin regression): PASS.** `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run seed:thai` all re-run independently this session, all exit 0 (verbatim below). Mandarin-mode QA learner's `/` render is the same flow as before M12 (Mandarin toggle active, Due/New counts, a real due card shown, Stats/Sign-out present, zero Thai markup) — screenshot: `m12-a6-mandarin-home.png`. The unlock-progression regression the round-1 review caught (units past 2 permanently deadlocked) is **fixed and reachable end-to-end**: a fresh Thai learner genuinely reached unit 9 through the real unlock chain in this session.

**Overall: PASS.** M12 ships a working drillType-scoped mastery model, live audio drills across units 2/7/8/9, a working tone-ear unit with a correct confusion matrix, and no regression to Mandarin mode or units 1-8's existing mechanics.

## Prior Summaries Read
- `.claude/plans/active-plan.md` — yes, in full (Validation Contract A1-A6 + Locked decisions).
- `.claude/plans/implementation-summary.md` — yes, in full, including both "Round 1" and "Round 2" (Completed / Left Undone / Issues Discovered / Spec Deviations / Commands Run / Procedure Compliance in each).
- `.claude/plans/review-summary.md` — yes, in full, including the superseded round-1 REQUEST-CHANGES verdict (2 CRITICAL + 1 HIGH + 1 MEDIUM + 3 LOW findings) and the round-2 re-review APPROVE-WITH-FINDINGS (fix confirmation for each finding, residual risk list).
- `.claude/plans/m11-archive--qa-summary.md` — yes, for the established QA method (disposable test learners + session-cookie HTTP + auth-stub script pattern for driving real Server Actions outside a live request).

## Test Method + Evidence Artifacts

**Environment.** `npm run dev` (Turbopack), started clean (no OOM/no stale-`.next` incident this session — dev server ran the entire session at a healthy process count and was shut down cleanly at the end via `Stop-Process` on the port-3000 PID, confirmed port free afterward). Real Neon dev DB (us-east-1), real Vercel Blob audio, real (unmodified) app code throughout — no source file was ever edited during QA.

**Test learners (both disposable QA fixtures, deleted at the end — see Fixture Data + Cleanup):**
- `qa-test-m12-mandarin@example.invalid` — `learner_settings.active_mode = 'mandarin'`, used only for the A6 regression check.
- `qa-test-m12-thai@example.invalid` — `active_mode = 'thai'`, started genuinely fresh (0 progress rows) and was driven through the entire unit 1->9 unlock chain during this session.

Both learners were given a real `session` row (Auth.js database-session strategy, confirmed via `auth.ts`'s `DrizzleAdapter`) so real HTTP requests/browser sessions with `Cookie: authjs.session-token=<token>` render exactly what a signed-in browser would see — this is the same disclosed method M11 QA used.

**Driving real Server Actions outside a live Next.js request.** `lib/thai/actions.ts`'s exports (`markUnit1LessonRead`, `submitThaiAttempt`, `getUnitProgressSnapshot`) all call `auth()` internally. To call the REAL, unmodified functions from a standalone script (for the unit-1 mark-read step, the HIGH-fix rejection test, the disclosed unit-2/3-8 server-action fast-forward, and the unlock-boundary perturbation), I used Node's `--require tsx/cjs --require <stub>.cjs --import tsx/esm` combination: the stub monkeypatches `Module._resolveFilename` so the bare specifier `@/auth` resolves to an in-memory stub returning `{ user: { id: <QA_LEARNER_ID> } }`. `tsx/cjs` had to be added alongside `tsx/esm` (a refinement beyond M11's exact recipe) because this repo's `.ts` files are not ES modules by `package.json`'s default, so `lib/thai/actions.ts` loads via Node's CJS-interop translator, which needs `tsx/cjs`'s own alias-resolution patch to resolve `@/lib/db` etc.; and `@/lib/*` imports inside the driver script had to be dynamic `await import(...)` (after `dotenv.config()` ran), not a static top-level `import`, because static imports are evaluated before the importing module's own statements regardless of source order, which otherwise threw "No database connection string was provided" (this repo's own `scripts/seed-thai-db.ts` documents the same hoisting hazard). Nothing in the repo was edited; the stub files and driver scripts lived only in a since-deleted `.qa-scratch/` scratch directory. Every mutating call this enabled is the exact same code path a real browser click drives — I combined this with genuine, unstubbed HTTP/browser sessions for every *rendering* assertion.

**Browser automation.** Real headless Chromium via Python Playwright (`webapp-testing` skill), with the QA learner's real session cookie injected via `context.add_cookies`. Used for: unit-2 drilling (parsing the DOM for prompt/options, matching against ground-truth values queried directly from `thai_items`, clicking the correct option, and reading Playwright's `page.on("request")` network log to identify which item an *audio*-prompted question was about, since the prompt text is empty for those), unit-7 audio-form spot-check, unit-9 lesson + drill, Mandarin-home and Thai-home screenshots, and the final `/thai/stats` screenshot.

**Evidence artifacts** (`.claude/plans/qa-artifacts/`):
- `m12-a3-unit9-lesson.png` — 3 tone families, sparklines, 12 Listen buttons.
- `m12-a3-unit9-drill-start.png` / `m12-a3-unit9-drill-sample.png` — audio-tone MC question, 5 tone options.
- `m12-a4-unit2-drill-start.png` — unit-2 drill session start.
- `m12-a4-unit2-audio-letter-question.png` — audio-letter question with a live "Play clip" button.
- `m12-a4-unit7-audio-form-question.png` — audio-form question with a live "Play clip" button.
- `m12-a5-confusion-matrix.png` — full `/thai/stats` page including the populated 5x5 tone confusion matrix.
- `m12-a6-mandarin-home.png` — unchanged Mandarin flashcard home for the mandarin-mode QA learner.
- `m12-thai-home-unlocked-through-unit9.png`, `m12-thai-home-fully-progressed.png` — Thai unit map at different progression points.

## Commands Run

- `npx tsc --noEmit` — exit 0, no output.
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  (Run once more *before* `.qa-scratch` cleanup, and it correctly flagged 2 errors + 3 warnings inside my own throwaway `.qa-scratch/*.cjs`/`.mts` files — proof the lint gate actually scans what's on disk; re-ran clean after deleting the scratch directory, output above is that final clean run.)
- `npm run build` — exit 0
  ```
  ✓ Compiled successfully in 6.1s
  Running TypeScript ...
  Finished TypeScript in 7.1s ...
  ✓ Generating static pages using 10 workers (6/6) in 851ms
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
- `npm run seed:thai` — exit 0
  ```
  [reachability] OK — every drillable item across units 2,3,4,5,6,7,8,9 (105 total) is reachable as a drill subject.
  [reachability] OK — every drilled unit (2,3,4,5,6,7,8,9) can reach 100% percentMastered given its own drill session.
  [delete] 0 dropped item(s).
  Done. 0 inserted, 125 upserted-as-update, 0 deleted. Total items: 125.
  ```
- `npm run audio:thai -- --dry` — **not re-run this session**. A2 was validated via direct DB/blob spot-checks instead (the batch's real output already exists in the dev DB and re-running `--dry` would add no new information beyond what round-2 review already re-confirmed).
- Direct Neon queries (one-off `tsx` scripts against `.env.local`'s `DATABASE_URL`, all deleted after use) — DB state before/after, per-item progress checks, tone-word metadata map, final cleanup verification (verbatim output quoted inline above/below).
- `curl -sI <blob-url>` x3 (unit-2 consonant, unit-7 vowel, unit-9 tone-word clips) — all `HTTP/1.1 200 OK`, `Content-Type: audio/mpeg`.
- Python Playwright scripts (headless Chromium, session-cookie auth) — unit-2 drill (2 sessions, 6 rounds, ~90 real answered questions), unit-7 audio-form spot check, unit-9 lesson + drill (4 rounds, 60 questions), Mandarin/Thai home screenshots, final stats screenshot.
- Node `--require tsx/cjs --require <auth-stub>.cjs --import tsx/esm <script>.mts` — `markUnit1LessonRead` real call, HIGH-fix rejection test, unit-2 completion + units-3-8 fast-forward, 89%/90% unlock-boundary perturbation test.
- `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 | Select -ExpandProperty OwningProcess"` + `Stop-Process -Force` — clean dev-server shutdown, confirmed port 3000 free afterward (empty result, exit 1).

## Fixture Data + Cleanup

**Created (all disclosed above as QA fixtures):**
- 2 `user` rows (`qa-test-m12-mandarin@example.invalid`, `qa-test-m12-thai@example.invalid`), each with a `learner_settings` row and a `session` row.
- Real `thai_progress`/`thai_attempts` rows from: (a) genuine browser clicks (unit 2: ~90 real drill answers across 6 rounds; unit 9: 60 real audio-tone answers across 4 rounds), (b) real `submitThaiAttempt`/`markUnit1LessonRead` server-action calls driven by script (unit-1 mark-read, unit-2 completion to 100%, the HIGH-fix rejection/allow probes, the 89%/90% boundary perturbation), and (c) one explicitly-labeled **raw DB fixture insert** (`streak: 3, masteredAt: now()`) for units 3-8's remaining (item, drillType) pairs — done via a direct upsert, NOT `submitThaiAttempt`, purely to save time reaching unit 9 after the per-attempt real-action path was already proven correct on unit 2 (per the coordinator's efficiency guidance mid-session). Peak state before cleanup: `thai_progress: 254 rows`, `thai_attempts: 211 rows`, `session: 8`, `learner_settings: 4`, `user: 4`.
- One brief, fully-reverted perturbation: `consonant:ก`'s `audio-letter` row was temporarily set back to `streak: 0, masteredAt: null` to observe the resulting 89% (locked) state, then restored to its exact prior values in the same script run.

**Cleanup:** `DELETE FROM "user" WHERE email LIKE 'qa-test-m12-%@example.invalid'` — FK cascade removed both users' `session`, `learner_settings`, `thai_progress`, and `thai_attempts` rows in the same operation.

**Final row counts (verified by a query run after cleanup, in this session):**
```
users: [ 'b3nz@arisadesiam.com', 'k3v1n@arisadesiam.com' ]   (2 — the 2 real learners, untouched)
thai_items: 125   (unchanged — content was never touched)
thai_items with audio: 103   (unchanged)
thai_progress: 0
thai_attempts: 0
learner_settings: 2   (both real learners, both still active_mode='mandarin', untouched)
sessions: 6   (back to the pre-QA baseline)
suspicious leftover test users (LIKE '%qa-test%' OR '%example.invalid%'): []
```
This exactly matches the DB state recorded at the very start of this session (`thai_progress: 0`, `thai_attempts: 0`, `users: 2`, `learner_settings: 2` for the 2 real learners, `thai_items: 125`/`103 with audio` unchanged) — the dev DB is left exactly as found, plus zero residue. The `.qa-scratch/` directory (all driver scripts, HTML captures, auth stub) was deleted in full (`rm -rf .qa-scratch`, confirmed gone via `git status --porcelain`); only `.claude/plans/qa-artifacts/*.png` (the evidence screenshots requested by the task) were kept.

## Issues Found

- **LOW / operational, this session (new observation, saved to memory):** Node's `tsx/esm`-only preload (the exact recipe M11 QA's memory documented) is **not sufficient** in this repo to drive `lib/thai/actions.ts` from a standalone script, because this repo's `.ts` files load via CJS interop by default (no `"type": "module"` in `package.json`) — `--require tsx/cjs` must be added alongside `--require <stub>.cjs --import tsx/esm`, and any `@/lib/*` import in the driver script must be a *dynamic* `await import(...)` issued after `dotenv.config()` runs, not a static top-level `import` (which gets hoisted-evaluated before `config()`, throwing "No database connection string was provided" even though `config()` appears first in source order).
- **LOW (pre-existing, already known/accepted from round-2 review, re-confirmed as unchanged and not worse):** `submitThaiAttempt` allows unit-2 attempts for a learner who has never clicked "mark unit 1 read" (hard-codes `gatingUnit <= 2` as unconditionally allowed) — re-confirmed present, trivial real-world impact, matches the review's own residual-risk note exactly.
- No new CRITICAL, HIGH, or MEDIUM defects found. No regressions observed in Mandarin mode or in M11's existing units 1-8 mechanics (streak/reset/mastery math, distractor confusability, ฃ/ฅ exclusion) beyond what round-2 review already re-verified.

## Residual Risk

- A2's real batch output was spot-checked (3 URLs + aggregate `audio_url IS NOT NULL` count) rather than re-verifying all 103 clips individually; this matches round-2 review's own coverage level and the batch was not re-run.
- The architecture-shape regression risk review already flagged (a future hand-edit reverting `lib/thai/queries.ts` to the cross-unit `allReachableDrillTypesForItem` for unlock math would not be caught by the seed-time invariant) remains exactly as documented by the implementer and reviewer — not something QA can close with a black-box behavioral pass; noted, not re-litigated.
- Unit 2's exhaustive drill-type combinatorics (all 9 items x 3 drill types) were reached via a mix of real browser clicks (2 items driven to full mastery purely by hand-verified clicking) and real server-action calls (the rest) rather than 100% pure browser interaction, for time; the underlying code path (`submitThaiAttempt`) is identical either way and was directly observed working correctly from the browser for a representative sample. Units 3-8 were fast-forwarded via a disclosed raw-DB-insert fixture (not the per-attempt path) to reach unit 9 within the session's time budget, per the coordinator's explicit efficiency guidance.

## Procedure Compliance
- Plan consulted before QA: yes — `.claude/plans/active-plan.md` read in full before any validation.
- Implementation summary read: yes — in full, both rounds.
- Review summary read: yes — in full, both the superseded round-1 verdict and the authoritative round-2 re-review.
- Validations re-run by QA (not copied): yes — every command, query, and browser session in this report was executed by me this session; no number was copied from either prior summary.
- QA summary written: yes (this file).

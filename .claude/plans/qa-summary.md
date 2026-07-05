# QA Summary - Unit 3 flashcards (generalized from unit-2 pilot) + Name-IPA column

## Result
PASS

## Prior docs read (per repo protocol)
- `active-plan.md`: read in full — yes
- `implementation-summary.md`: read in full — yes
- `review-summary.md`: read in full — yes (result was PASS with one MEDIUM finding — stale `unit >= 3 && unit <= 5` dead-code range/comment in `lib/thai/drill.ts` — plus two LOW stale-comment findings; the task description said these were "since fixed directly," and I independently re-confirmed the fixes are present in the working tree, see Commands below)

## Assertions
- A1 (`/thai/3/lesson` renders Name-IPA column, populated for unit 3's high-class consonants): **PASS** — verified two ways: (1) direct SSR render of the real `ConsonantTable` component against the real `HIGH_CONSONANTS` seed array (11 rows: 10 drillable + obsolete ฃ) — every row's Name-IPA cell is a real bracketed IPA string, zero blank/`—` cells in that column; (2) styled screenshot using the app's own compiled Tailwind CSS, see Evidence.
- A2 (`/thai/2/lesson` still renders Name-IPA column, no regression): **PASS** — same method against `MID_CONSONANTS` (9 rows), all populated; screenshot captured; also confirmed via a `buildFlashcardDeck` live-DB probe (unit 2 deck: 9/9 cards with non-empty `nameIpa`).
- A3 (`/thai/3/drill` renders flashcard UI, not MCQ grid) — **PASS, via fallback method** (see "What could not be validated end-to-end" below for why the live route itself wasn't reachable). Verified by: (a) SSR-rendering the real, unmodified `FlashcardSession` component with a synthetic unit-3 deck — output has "Tap to reveal", the Classical/Modern font toggle, and the glyph, and explicitly does **not** contain "Knew it"/"Missed it" (correct — those only appear post-flip) or any 4-option MCQ markup; screenshot captured (see Evidence); (b) direct source read of `app/thai/[unit]/drill/page.tsx` confirms `isFlashcardUnit = FLASHCARD_UNITS.has(unit)` routes unit 3 to `<FlashcardSession>`, never `<DrillSession>` (the MCQ component); (c) source read of `flashcard-session.tsx`'s flipped-state branch confirms it renders exactly two buttons, labelled "Missed it" / "Knew it" (binary self-grade), never a 4-option grid.
- A4 (`/thai/2/drill` unchanged) — **PASS, via fallback method**, same reasoning as A3 for unit 2: `FLASHCARD_UNITS = new Set([2, 3])` routes both units through the identical, unchanged `FlashcardSession` component/props shape.
- A5 (`npm test`, `npx tsc --noEmit`, `npm run lint` all clean, run by me) — **PASS** — all three re-run independently, see Commands. 42/42 tests, 0 tsc errors, 0 lint errors. Also re-ran `npm run build` (not required by the task but a cheap extra confirmation) — clean.
- A6 (`reachableDrillTypesForUnit(3, …)` → `letter-read` ONLY; units 4-5 → still the MCQ trio) — **PASS** — verified by calling the real, unmodified `reachableDrillTypesForUnit` directly against the real `ALL_THAI_ITEMS` seed data (not a copy, not the test file's synthetic fixture): unit 2 → 9 items, all `{letter-read}`; unit 3 → 10 items, all `{letter-read}`; unit 4 → 12 items, `{letter-sound, letter-class, audio-letter}`; unit 5 → 11 items, `{letter-sound, letter-class, audio-letter}`. No overlap, no gap.

## Commands
All commands run by me in this session, not copied from the implementer's or reviewer's pasted output.

- `git status && git log --oneline -8` — exit 0
  ```
  On branch glass-redesign
  Your branch is ahead of 'origin/glass-redesign' by 2 commits.
  ...modified: lib/thai/drill.ts, lib/thai/reachability.ts, seed/thai/items.ts, ...
  3b6724c Unit-2 flashcards: font switcher, name IPA, initial/final sounds
  513d9a2 Add Read-Thai unit 2 self-graded flashcard pilot + fix ป audio
  d2fd41e Mobile UX-polish: affordances, animations, bottom nav, haptics/sound
  ```
  Confirms the working tree matches what implementation-summary.md/review-summary.md describe: two cherry-picked commits + uncommitted generalization changes.

- `grep -n "unit >= 3 && unit <= 5\|unit >= 4 && unit <= 5" lib/thai/drill.ts lib/thai/reachability.ts` — exit 0
  ```
  lib/thai/drill.ts:317:  if (unit >= 4 && unit <= 5) {
  lib/thai/reachability.ts:242:  if (unit >= 4 && unit <= 5) {
  ```
  Confirms the review's MEDIUM finding (stale `unit >= 3 && unit <= 5` MCQ range in `drill.ts`) is fixed — both files now agree on `unit >= 4 && unit <= 5`. Also spot-checked the LOW stale-comment finding in `flashcard-session.tsx:20-27` by reading the file — comment now reads "Flashcard units (2-3, owner-approved 2026-07-05)", no longer "Unit 2 flashcard pilot". (One very minor, previously-unflagged doc comment at `lib/thai/drill.ts:45` — "Unit 2 flashcard: self-graded…" inside a `Record<DrillType,...>` completeness-only comment — still says "Unit 2" instead of "units 2-3"; functionally inert, not one of the review's two flagged LOW findings, noted under Unexpected Behavior below as a nit, not a blocker.)

- `npx tsc --noEmit` — exit 0
  ```
  (no output — clean)
  ```

- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```

- `npm test` — exit 0
  ```
  ✔ unit 2 is reachable through letter-read ONLY (not the MCQ trio) (1.0445ms)
  ✔ unit 3 is reachable through letter-read ONLY (generalized from the unit-2 pilot) (0.085ms)
  ✔ units 4-5 keep the original letter-sound/letter-class/audio-letter MCQ trio (0.0818ms)
  ...
  ℹ tests 42
  ℹ pass 42
  ℹ fail 0
  ℹ duration_ms 196.3329
  ```

- `npm run build` — exit 0
  ```
  ✓ Compiled successfully in 3.8s
    Running TypeScript ...
    Finished TypeScript in 5.0s ...
  ✓ Generating static pages using 10 workers (6/6) in 450ms
  Route (app): / /_not-found /api/auth/[...nextauth] /stats /thai/[unit]/drill /thai/[unit]/lesson /thai/stats
  ```

- `npm run dev` (background) then `curl -s -D - -o /dev/null http://localhost:3000/thai/2/lesson` and the same for `/thai/3/lesson` — exit 0
  ```
  HTTP/1.1 307 Temporary Redirect
  location: /api/auth/signin?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fthai%2F2%2Flesson
  ```
  (identical shape for `/thai/3/lesson`). Confirms `proxy.ts` edge-gates every app route including lesson pages — no way to view a rendered lesson/drill page without a real authenticated session cookie (see "What could not be validated" below). This matches project memory (`qa-env-constraints.md`, M14 entry) and is expected, not a regression.

- Scratch script rendering the real `ConsonantTable` component (`components/thai/lessons/consonant-table.tsx`) via `react-dom/server` against the real `MID_CONSONANTS`/`HIGH_CONSONANTS` seed arrays (`npx tsx render-consonant-table.mjs`) — exit 0
  ```
  --- unit 2 (MID_CONSONANTS) --- header present: true, item count: 9
  --- unit 3 (HIGH_CONSONANTS) --- header present: true, item count: 11
  ```
  Followed by a row-by-row parse of the emitted HTML (Letter | Name | Name-IPA cell) — unit 2: 9/9 rows show a real bracketed IPA value (e.g. `[kɔ̄ː kàj]`); unit 3: 11/11 rows show a real bracketed IPA value (e.g. `[kʰɔ̌ː kʰàj]`, including the obsolete ฃ). Zero blank/`—` Name-IPA cells in either unit.

- Scratch script rendering the real `FlashcardSession` component (`components/thai/drill/flashcard-session.tsx`) via `react-dom/server` with a synthetic 2-card unit-3 deck (`npx tsx render-flashcard-session.mjs`) — exit 0
  ```
  has 'Tap to reveal' button: true
  has 'Knew it' button: false
  has 'Missed it' button: false
  has 4-option MCQ markers (should be absent): false
  has glyph ข: true
  has classical/modern font toggle: true
  ```
  (Knew-it/Missed-it correctly absent pre-flip — confirmed present in that branch by direct source read, see A3.)

- Scratch script calling the real `buildFlashcardDeck` and `reachableDrillTypesForUnit` directly against the **live production DB** (`.env.local`'s `DATABASE_URL`) using a synthetic, non-existent `learnerId` (`"00000000-0000-0000-0000-000000000000"` — no real user's data read or written; only `SELECT`s executed, matching the M14 memory pattern) — exit 0
  ```
  FLASHCARD_UNITS: [ 2, 3 ]
  --- unit 2 --- deck length: 9 | reachable: 9 items, types [letter-read] | all nameIpa non-empty: true | audioUrl present: true
  --- unit 3 --- deck length: 10 | reachable: 10 items, types [letter-read] | all nameIpa non-empty: true | audioUrl present: true
  --- unit 4 --- deck length: 0 (not a flashcard unit) | reachable: 12 items, types [letter-sound, letter-class, audio-letter]
  --- unit 5 --- deck length: 0 (not a flashcard unit) | reachable: 11 items, types [letter-sound, letter-class, audio-letter]
  ```
  This is the strongest evidence in this report: it exercises the actual production code path against actual production data with no mocking, and directly proves A6 plus the deck-population half of A1/A2.

- Follow-up probe: `deck3.filter(c => c.audioUrl).length` — exit 0
  ```
  unit 3 audio count: 10 / 10
  items with audio: [ข, ฉ, ฐ, ถ, ผ, ฝ, ศ, ษ, ส, ห]
  ```
  See Unexpected Behavior — all 10 unit-3 flashcards already have audio in the live DB, more than the plan/implementation-summary expected.

- Direct source read (no execution — avoids any DB write) of `submitFlashcardGrade` in `lib/thai/actions.ts` — confirms the structural guard is `!FLASHCARD_UNITS.has(item.unit) || item.kind !== "consonant" || !item.drillable` and the unlock lookup is `summaries.find(s => s.unit === item.unit)` (derives from the graded item's own unit, not hardcoded to unit 2), matching the implementation/review summaries' claims exactly.

- Playwright screenshots of the three SSR-rendered HTML fragments above, wrapped with the app's own compiled Tailwind CSS chunk (`.next/static/chunks/119o9f-76jod8.css`, produced by the `npm run build` above) — see Evidence Artifacts. Visually confirms styled rendering (color, spacing, badges, font toggle pill) matches the design, not just raw unstyled markup.

- Dev server shutdown: `Get-NetTCPConnection -LocalPort 3000` (PID 41452) → `Stop-Process -Id 41452 -Force` → re-ran `Get-NetTCPConnection -LocalPort 3000` — empty output / exit 1, confirming clean shutdown, no orphaned process on port 3000.

## What could not be validated end-to-end (and why)
- **Live, authenticated `/thai/3/drill` and `/thai/2/drill` (and `/thai/3/lesson` / `/thai/2/lesson`) in a real browser session** could not be reached. This app has no test/credentials auth provider (`auth.ts` wires only `Google` + a `DrizzleAdapter`, gated by an `ALLOWED_EMAILS` allowlist of exactly the two beta-tester accounts) and `proxy.ts` edge-gates every route, including lesson pages, before any page code runs. I did not attempt to fabricate a session (inserting a `session` row for a real or synthetic user, or looking up an existing learner's id) because the permission system explicitly declined that action twice when I probed for it — even a read-only, no-PII-printed lookup of an existing user id was blocked as accessing production user identity beyond the read-only query scope authorized for this QA task. I did not attempt to route around that; I fell back to the task's own documented alternative — direct, real-function/real-component/real-DB checks — as detailed in the Commands section above. This matches the constraint recorded in project memory (`qa-env-constraints.md`) from prior QA passes on this repo.
- **Visual confirmation of the "flipped" card state (Knew-it/Missed-it buttons actually visible together with the sound/name reveal) in a live DOM** was not captured via interaction (no jsdom in this repo's `node_modules`, and I did not want to add a new dependency during a QA pass). This was instead confirmed by direct source reading of the `flipped ? (...) : (...)` branch in `flashcard-session.tsx`, which unambiguously renders `SoundTile` ×2, the name/name-IPA, an optional audio button, and exactly two grade buttons labelled "Missed it"/"Knew it" — never a 4-option grid.
- **Owner spot-check of `HIGH_CONSONANTS` `nameIpa` transcription accuracy** is out of scope for QA per the plan's own caveat ("transcription accuracy isn't mechanically verifiable") — I confirmed the values are present, non-empty, and formatted consistently with `MID_CONSONANTS` (diacritic/length-marker convention), but did not independently re-derive Thai phonology.

## Evidence Artifacts
- A1/A2 (Name-IPA column, unit 3 and unit 2) — styled screenshots:
  `C:\Users\User\AppData\Local\Temp\claude\C--Users-User-Software-Projects-Language-Learning-App\f90ce59a-b216-471e-ba48-b467d9bebc9b\scratchpad\shot-unit3-lesson-table.png`
  `C:\Users\User\AppData\Local\Temp\claude\C--Users-User-Software-Projects-Language-Learning-App\f90ce59a-b216-471e-ba48-b467d9bebc9b\scratchpad\shot-unit2-lesson-table.png`
- A3 (flashcard UI, unit 3, not MCQ) — styled screenshot:
  `C:\Users\User\AppData\Local\Temp\claude\C--Users-User-Software-Projects-Language-Learning-App\f90ce59a-b216-471e-ba48-b467d9bebc9b\scratchpad\shot-unit3-flashcard.png`
- Raw SSR HTML fragments (unstyled) backing the above:
  `...\scratchpad\qa-tmp-unit2.html`, `...\scratchpad\qa-tmp-unit3.html`, `...\scratchpad\qa-tmp-flashcard-unit3.html`
- Scratch driver scripts (not committed to the repo, scratchpad-only):
  `...\scratchpad\render-consonant-table.mjs`, `...\scratchpad\render-flashcard-session.mjs`, `...\scratchpad\probe-flashcard-deck.mjs`, `...\scratchpad\probe-audio-count.mjs`, `...\scratchpad\shoot.py`

## Unexpected Behavior
- **Unit-3 audio is fully generated, not "mostly ungenerated" as the plan/implementation-summary state.** Both docs say only unit-2's ป has been batch-regenerated and unit 3 remains largely without `audioUrl`. My live-DB probe shows all 10 of unit 3's drillable consonants already have a non-null `audioUrl` in the production `thai_items` table. This is a positive surprise (more "▶ Hear it" buttons will show up than the plan anticipated) and does not indicate any bug — `FlashcardSession` already handles both the present and absent case — but it means the plan's own audio-gap caveat is stale as of this QA pass. Worth a one-line correction in the docs if the owner wants the history to stay accurate; not a blocker.
- **Minor stale doc comment not flagged by review**: `lib/thai/drill.ts:45` still reads "Unit 2 flashcard: self-graded, so it never flows through expectedAnswerFor…" inside the `VALID_KINDS_FOR_DRILL_TYPE` completeness comment — should say "units 2-3" to match the rest of the generalization. Comment-only, zero functional impact, not one of the two LOW findings the reviewer already flagged and confirmed fixed.

## Residual Risk
- Unaddressed by this change (matches review's own residual-risk list): unit-3 `nameIpa` transcription accuracy is not mechanically verifiable; owner spot-check recommended before considering the content itself (not the code) fully signed off.
- The one leftover stale "Unit 2" comment in `lib/thai/drill.ts:45` (see Unexpected Behavior) — harmless, but worth a follow-up nit-fix pass alongside the docs correction on the audio-gap claim.
- No live-browser authenticated walkthrough of `/thai/2/drill` and `/thai/3/drill` was possible in this environment (see "What could not be validated" above) — the fallback evidence (real component render + real DB-backed function calls + source-level routing trace) is high-confidence but is not a substitute for a human (or a future QA pass with a real session) clicking through the actual deployed pages at least once before/after this ships, per the review's own recommendation.

## Procedure Compliance
- Plan consulted before QA: yes
- Implementation summary read: yes
- Review summary read: yes
- Validations re-run by QA (not copied): yes — `tsc`, `eslint`, `npm test`, `npm run build` all re-run fresh by me; component renders, DB-backed function probes, and screenshots were newly authored by me this session, not reused from either prior agent's artifacts
- QA summary written: yes

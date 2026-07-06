---
feature: read-thai-unit4-flashcards
created: 2026-07-06T02:39:57.385173+00:00
source-session: f90ce59a-b216-471e-ba48-b467d9bebc9b
context-at-handoff: 179k (red)
---

# Handoff: Read-Thai unit 4 — flashcard drill + tester unlock

## Goal
Give Read-Thai **unit 4 (low-class consonants A, 12 letters)** the same
self-graded "clear-the-deck" flashcard drill units 2 and 3 already use, and
**open unit 4 to the 2 beta testers**. This is the exact same generalization
just shipped for unit 3 (last session) — one more unit onto the pattern, plus
a Name-IPA content pass and a tester-gate bump. Pure app logic + seed content;
no schema/migration.

## ⚠ Branch reality — READ FIRST, this bit us last session
- **Work on `main`. Production IS `main`** (Vercel is git-linked via
  `.vercel/repo.json` → pushing `main` auto-deploys to thepolyglot.vercel.app).
- The local **`glass-redesign` branch is STALE/DIVERGED** — it lacks
  `lib/access.ts` and the split lesson components that live on `main`. Do NOT
  branch unit-4 work off it or merge it. `main` already has the unit-2/3
  flashcard engine (unit-3 work was cherry-picked onto main as `23d0194` and
  deployed). Confirm with `git checkout main && git pull` before starting.
- Squash convention: feature branches never ff into main. Either commit
  straight on `main` (small change) or `git merge --squash`.

## The pattern to copy (all already on `main` from the unit-3 pass)
Everything below mirrors commit `23d0194` "Generalize unit-2 flashcard drill
to unit 3". `git show 23d0194` is your worked example — do the same for unit 4.

1. `lib/thai/flashcards.ts:19` — `FLASHCARD_UNITS = new Set([2, 3])` → add `4`.
2. `lib/thai/reachability.ts` — the flashcard branch `if (unit === 2 || unit === 3)`
   (~line 235, adds `"letter-read"`) → include unit 4. The MCQ branch
   `if (unit >= 4 && unit <= 5)` (~line 242) → **narrow to `unit === 5`**.
   Update the adjacent comments (they say "units 2-3 flashcard / 4-5 MCQ").
3. `lib/thai/drill.ts:317` — `buildSubjectPool`'s `if (unit >= 4 && unit <= 5)`
   MCQ range → **narrow to `unit === 5`** (+ its comment). This is the sibling
   range check that was left stale last time — do NOT forget it again (see
   `.claude/agent-memory/code-reviewer/feedback_stale-parallel-range-check.md`).
4. `lib/thai/actions.ts` (`submitFlashcardGrade`) and
   `app/thai/[unit]/drill/page.tsx` — already use `FLASHCARD_UNITS.has(...)`.
   **No change needed** (verify by grep, don't edit).
5. **Name-IPA content:** author `metadata.nameIpa` for all 12
   `LOW_CONSONANTS_A` entries in `seed/thai/items.ts` (currently none have it).
   Follow the MID_CONSONANTS convention — tone-marked IPA of the full
   acrophonic name, e.g. `ค ควาย` → `"kʰɔ̄ː kʰwāːj"`. The lesson table already
   renders the Name-IPA column for unit 4 (unit 4's lesson at
   `app/thai/[unit]/lesson/page.tsx:112` is `<ConsonantTable items={LOW_CONSONANTS_A} />`),
   so authoring the data is all that's needed for the column to populate.
   ⚠ `ฑ` has a **dual initial reading** `initialIpa: "tʰ, d"` — transcribe its
   nameIpa (`ฑ มณโฑ` → montho) carefully and sanity-check the flashcard
   "Initial" tile renders `/tʰ, d/` acceptably (cosmetic only; unit 4 no longer
   uses MCQ so no answer-matching breaks).
6. **Tester unlock:** `lib/access.ts:26` — `RESTRICTED_THAI_MAX_UNIT = 2` → `3`.
   Semantics (`restrictedUnitOpen`, lines 39-42): units 1..MAX always open,
   MAX+1 opens when its `unlocked` flag is true. Bumping to 3 makes units 1-3
   always open and unit 4 open on finishing unit 3 (90% gate) — same shape unit
   3 has today. Update the constant's comment + `lib/access.test.ts` (it
   asserts the boundary; adjust expected open/closed units).
7. **Tests:** extend `lib/thai/flashcard-mastery.test.ts` with unit-4 cases
   (mirror the unit-3 block, real unit-4 ids/glyphs, not copy-paste). Extend the
   module-load regression-guard in `lib/thai/reachability.ts`
   (`assertUnitMasteryScopingGuardForUnit`, runs for units 2 & 3) to also run
   for unit 4.

## Remaining tasks (in order)
1. Flashcard generalization (items 1-4 above).
2. Name-IPA authoring for LOW_CONSONANTS_A (item 5).
3. Tester unlock bump + test (item 6).
4. Test coverage (item 7).
5. Verify: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` —
   all must be clean (last session landed 51/51 tests).
6. Optional/ask owner: unit 4's lesson is the bare `ConsonantTable` with NO
   explanatory prose wrapper (units 2/3 have `MidConsonantLesson`/
   `HighConsonantLesson` with script logic + culture/history per
   [[read-thai-lessons-need-explanation]]). Owner may want a `LowConsonantLesson`
   prose wrapper too — confirm scope; the request was flashcards + unlock.
7. Commit on `main`, push → auto-deploys. (Owner commits/pushes on his say-so.)

## Next steps (start here)
1. `cd "C:\Users\User\Software Projects\Language-Learning-App"` →
   `git checkout main && git pull` (confirm HEAD is `23d0194` or later).
2. `git show 23d0194 -- lib/thai/flashcards.ts lib/thai/reachability.ts lib/thai/drill.ts seed/thai/items.ts`
   to see exactly what the unit-3 pass changed — replicate for unit 4.
3. Optionally run the `/dev-cycle` chain (implementer → code-reviewer →
   qa-engineer) as last session did; or build directly since this is a small,
   well-understood repeat ([[prefers-direct-build-for-content]] applies to the
   Name-IPA authoring specifically).

## Key decisions + rationale
- Reuse the `FLASHCARD_UNITS` set + `letter-read` drill type rather than a new
  mechanism — unit 4 is the same "recognize the glyph" task; the engine is
  already unit-generalized.
- Tester gate is a single constant bump (MAX 2→3), not per-unit logic — the
  `restrictedUnitOpen` MAX+1 pattern already encodes "next unit opens on
  completing the current max."

## Dead ends — do not retry
- Do NOT merge or build off local `glass-redesign` (stale/diverged; would
  delete `lib/access.ts` + split lesson components from prod). Work on `main`.
- When narrowing the flashcard/MCQ boundary, grep BOTH `reachability.ts` AND
  `drill.ts` for the old range — they have parallel checks that must stay in
  sync (the drill.ts one was missed last session and flagged in review).

## Verification evidence (last session, unit 3 — the template)
- `git show 23d0194 --stat` → 16 files, +768/-270; on `main`, pushed to origin.
- `npm test` → 51/51 pass. `npx tsc --noEmit`, `npm run lint`, `npm run build`
  → all exit 0 (only the harmless two-lockfile Turbopack workspace-root warning).

## Read before starting
1. This file.
2. `git show 23d0194` (the unit-3 worked example — your primary reference).
3. `C:\Users\User\Software Projects\Language-Learning-App\lib\thai\reachability.ts`
   (unit-range branches + the regression-guard helper).
4. `C:\Users\User\Software Projects\Language-Learning-App\lib\access.ts`
   (`restrictedUnitOpen` + `RESTRICTED_THAI_MAX_UNIT`).
5. `C:\Users\User\Software Projects\Language-Learning-App\seed\thai\items.ts`
   (`LOW_CONSONANTS_A` for unit 4; `MID_CONSONANTS` for the nameIpa convention).
6. `.claude/agent-memory/code-reviewer/feedback_stale-parallel-range-check.md`.

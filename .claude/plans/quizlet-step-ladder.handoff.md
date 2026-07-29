---
feature: quizlet-step-ladder
created: 2026-07-29T15:45:30.913385+00:00
source-session: 982783db-9561-4feb-b7ee-e8642083b901
context-at-handoff: 262505 (red)
---

# Handoff: Quizlet-style step ladder (replacing FSRS)

## Goal

Replace `ts-fsrs` in both FSRS courses with a deterministic step-interval ladder. **Phases 1–4 are
complete and verified — both courses run on the ladder, the repo typechecks and builds, `ts-fsrs` is
deleted.** Only Phase 5 remains: merge to `main` and migrate production.

Git: branch `fix/tier3-just-rated-repeat`. **Nothing has been committed across any of these
sessions** — the whole redesign is uncommitted (~40 modified, 7 `git rm`'d).

DB: Neon branch `quizlet-ladder` — project `blue-queen-01978548`, branch `br-solitary-queen-apsbjzle`,
endpoint `ep-lucky-fire-aph667gi`. **Production is `ep-calm-frost-ap4nd591` — check before every
command.** `.env.local`'s `DATABASE_URL` points at PRODUCTION.

## Completed (this session — Phase 4, Mandarin)

All VERIFIED (see Verification evidence). Full inventory in `.claude/plans/implementation-summary.md`.

- **`lib/review/{types,hsk-gate,queries,actions,stats,time}.ts` rewritten onto the ladder.** Three-
  tier queue gone; round = `due <= now` + unseen up to the cap, ordered by `lib/ladder/round.ts`.
  Two actions (`submitSelfGrade`, `submitChoice`) over a shared `loadForAnswer` + `record`.
- **HSK gate at 100% with persistent unlocks.** `isMastered(step)` replaces `isMasteryLog`;
  `computeGate(rows, storedUnlocks)` returns `bandsToPersist`, which `syncHskUnlocks` writes from
  the submit action. `hsk-gate.test.ts` rewritten (26 tests).
- **Components**: `review-session.tsx` dispatches on `card.format`; `card-front.tsx` gained
  `direction`; `session-header.tsx` → Left/Repeats; `empty-state.tsx` → NEW
  `components/mandarin-round-complete.tsx`; `stats/rating-chart.tsx` → NEW
  `components/stats/distribution-chart.tsx`; `card-back.tsx` leech reads `demotions`.
- **Deleted (`git rm`)**: `lib/review/{scheduler,config,queue}.ts`, `lib/review/queue.test.ts`,
  `components/rating-buttons.tsx`, `components/empty-state.tsx`, `components/stats/rating-chart.tsx`,
  and `ts-fsrs` from `package.json`.

## Remaining tasks

1. **Owner decision — the unmerged `pickFutureToday` work.** This branch still carries commit
   `3bf34d4` ("Review queue: stop re-serving the card just graded"), whose file
   `lib/review/queue.ts` this redesign DELETES. Does it land on `main` first, or is it abandoned?
   Nothing else blocks the merge.
2. **Phase 5 — merge + production migration.** THIS WIPES REAL LEARNER DATA: 75 `review_states`,
   346 `review_logs`, 65 `at_review_states`, 129 `at_review_logs`. Migrations `0009` (wipe + drop
   FSRS columns + create `hsk_unlocks`) and `0010` (add ladder columns) are written and were applied
   to the branch; replayable on prod as a pair.
3. **Deferred, optional**: `Left N` counting EXPOSURES rather than cards (see `active-plan.md`).

## Next steps (start here)

1. **Ask the owner about task 1 above before anything else** — it changes the merge shape.
2. **Commit the work.** Nothing is committed. Suggested split: one commit for the ladder engine +
   schema, one per course, one for the deletions. Memory says `main` uses squash commits
   (`git merge --squash`), never fast-forward.
3. **Before touching prod, re-verify on the branch** — the simulation script is at
   `.artifacts/sim-mandarin-round.mts` (gitignored, refuses to run unless `DATABASE_URL` contains
   `ep-lucky-fire`):
   ```powershell
   $env:DATABASE_URL = "<branch URL>"; npx tsx ".artifacts\sim-mandarin-round.mts"
   ```
   Get the branch URL from `mcp__Neon__get_connection_string` with
   `projectId: blue-queen-01978548`, `branchId: br-solitary-queen-apsbjzle`.
4. **Production migration** — only on explicit owner go-ahead. `npm run db:migrate` targets
   PRODUCTION by default (see Dead ends).

## Key decisions + rationale

- **`syncHskUnlocks` runs from the submit action, never a render, and only when a card is promoted
  INTO the top step** — the one event that can raise a band's mastered count. Keeps the 515-row deck
  scan off the other four answers of every climb, and keeps a write out of the read path.
- **An unlock earned from an EMPTY band below is deliberately NOT persisted.** `bandPasses` lets an
  empty band pass so it cannot be an infinite wall, but writing that down would mean seeding that
  band later could never gate anything. Unit-tested both ways.
- **Mastery flipped from sticky to LIVE** (`review_states.step`, so a demotion un-masters). Safe
  only because the door it opened is a separate stored fact in `hsk_unlocks`.
- **MC distractors use `IS NOT DISTINCT FROM`, not `=`** — `hsk_level = NULL` is UNKNOWN and would
  hand an unlevelled card an empty option pool. No such card exists today, which is exactly why it
  would have gone unnoticed.

Smaller Phase 4 decisions are recorded in `implementation-summary.md`.

## Dead ends — do not retry

- **`npm run db:generate` cannot run through the agent shell** when one table both adds and drops
  columns — it needs a TTY for rename disambiguation, and it offers `rating` → `step` as plausible,
  which would silently reinterpret FSRS ratings as ladder positions. (0009/0010 are already split
  drop-then-add — do not regenerate.)
- **`npm run db:migrate` targets PRODUCTION by default.** `drizzle.config.ts` loads `.env.local`
  without `override: true`, so setting `$env:DATABASE_URL` inline in the SAME PowerShell command
  wins. Shell state does not persist between tool calls.
- **A tsx script outside the repo cannot resolve `node_modules`** — put scratch scripts inside the
  repo (`.artifacts/` is gitignored) and use the `.mts` extension, or top-level `await` fails with
  "not supported with the cjs output format". `tsx` DOES resolve the `@/` tsconfig alias.
- **`lib/review/actions.ts` cannot be imported under tsx** (`"use server"` + `next/cache`). The
  simulation mirrors its `record()` instead. Also: the `user` table is singular and needs quoting in
  raw SQL — `FROM "user"`, not `users`.

## Verification evidence

- `npx tsc --noEmit` → exit **0** (clean; first time since Phase 2)
- `npx eslint app components lib scripts seed` → exit **0**
- `npx tsx --test lib/ladder/*.test.ts lib/review/*.test.ts` → **0**; `tests 73 / pass 73 / fail 0`
- `npx next build` → exit **0**; `✓ Compiled successfully in 7.3s`, 10 routes
- Branch simulation → exit **0**; `ALL CHECKS PASSED` (41 checks). Proved: a 3-card round runs
  exactly 15 answers; climb `recognise-mc ×2 → recognise-card ×2 → produce-card`; cards exit
  `step=3, rung=1, due=+1d`; failing at the top gives `step 2, rung 0, demotions 1, due=now`; MC
  ships 4 unmarked strings, flashcards ship none; and the gate trap end to end — 208/208 band-1
  cards at the top step unlocks AND records band 2, a newly seeded band-1 card then leaves band 2
  open, while the control (same rows, stored row removed) re-locks it. Branch restored to 0
  `review_states` / 0 `review_logs` / 0 `hsk_unlocks` / 515 cards.

## Read before starting

Relative to `C:\Users\User\Software Projects\Language-Learning-App`:

1. `.claude/plans/active-plan.md`
2. `.claude/plans/implementation-summary.md` (full Phase 4 inventory)
3. `C:\Users\User\.claude\plans\i-want-to-change-imperative-badger.md` (approved plan; "Phasing"
   step 5 is the migration shape)

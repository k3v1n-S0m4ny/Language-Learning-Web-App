---
feature: thai-consonant-exam
created: 2026-07-07T06:23:33.667252+00:00
source-session: 61ff9116-db3d-4c2a-afd7-7f219e4a71ad
context-at-handoff: 218311 (red)
---

# Handoff: Read-Thai Consonant Review Exam (Stage 2)

## Goal
Build a cumulative, saveable/resumable **Consonant Review Exam** that sits between Read-Thai
unit 5 and unit 6 and drills all 42 drillable consonants (units 2-5) in 4 modes, as a
clear-the-deck mastery loop. Clearing it unlocks unit 6. **Stage 1 (unit 5 flashcard
treatment) is code-complete and green in this repo**; only two manual prod steps remain
(below). Stage 2 is a fresh build. Full spec + all resolved decisions live in the plan file
(Read it first).

## Completed (this session) — Stage 1, all VERIFIED (60/60 tests, tsc clean, eslint clean)
- `seed/thai/items.ts` — authored `nameIpa`+`spokenName` for the 11 drillable `LOW_CONSONANTS_B` letters.
- `components/thai/lessons/low-consonant-lesson-b.tsx` — NEW `LowConsonantLessonB` (ฅ callout + 3 sections).
- `app/thai/[unit]/lesson/page.tsx` — unit===5 now renders `LowConsonantLessonB`; removed unused `ConsonantTable` import.
- `lib/thai/flashcards.ts` — `FLASHCARD_UNITS = {2,3,4,5}` (+comment).
- `lib/thai/reachability.ts` — unit 5 moved into the `unit>=2 && unit<=5` letter-read branch (deleted the old unit===5 MCQ branch); `assertUnitMasteryScopingGuard` now covers unit 5.
- `lib/thai/drill.ts` — updated stale unit-5 comment (MCQ branch retained; exam reuses its builders).
- `lib/access.ts` — `RESTRICTED_THAI_MAX_UNIT = 4` (opens unit 5 to testers); `lib/access.test.ts` updated.
- `lib/thai/flashcard-mastery.test.ts` — unit-5 tests converted to the flashcard model.

## Remaining — Stage 1 prod steps (MANUAL, owner-gated; blocks unit-5 audio only)
1. Owner must run `! vercel link` in the session — the ONLY blocker. `npm run audio:thai` fails with
   `BlobAccessError: Access denied` (stale OIDC token; the known fix per memory `read-thai-unit2-flashcard-pilot`).
2. Then re-run `npm run audio:thai` (manifest already built OK: 204 clips, 775 chars, est **$0.0124** Google TTS → Blob).
3. Then `npm run seed:thai` to sync `spokenName`/`audioUrl` into `thai_items` (touches PROD — `.env.local` DATABASE_URL is prod).
   Unit-5 flashcards already work without this; only the audio-play button + audio→letter exam mode need it.

## Next steps (start here — Stage 2 build order)
1. **Read the plan file** (below) — it has the full Stage-2 design; do not re-derive.
2. `lib/db/schema.ts` — add `thaiExamSessions` table (follow `thaiProgress` Drizzle style; jsonb used throughout):
   `id`, `learnerId` (FK user.id), `examKey` text, `status` `in_progress`|`completed`, `state` jsonb,
   `startedAt`/`updatedAt`/`completedAt`. Unique index `(learnerId, examKey, status)`.
   `state` jsonb = `{seed, queue:{itemId,mode}[], clearedCount, firstTry:{seen,correct} overall+perMode, slips}`.
3. `npm run db:generate` → apply migration on a **Neon branch** via Neon MCP
   (`create_branch`→`prepare_database_migration`→verify→`complete_database_migration`). DO NOT `db:push` at prod. Owner-gate the merge.
4. `lib/thai/exam.ts` — engine: `buildExamDeck()` (42 drillable consonants unit∈{2,3,4,5} × modes
   `flashcard`/`letter-sound`/`letter-class`/`audio-letter`; audio card only if `audioUrl` present, degrade;
   seeded mulberry32 interleave — reuse pattern in `components/thai/drill/flashcard-session.tsx` lines 32-50;
   no same-letter adjacency). Reuse `expectedAnswerFor` + adapt `consonantDistractors(pool,item,"initialIpa"|"display")`
   from `lib/thai/drill.ts`, passing the FULL 42-consonant pool. `requeue(queue,card)`: splice at head-relative +10, else push to end.
5. `lib/thai/exam-actions.ts` (`"use server"`) — copy `submitThaiAttempt` template (auth→session.user.id; never trust client;
   re-derive correctness; neon-http has NO interactive tx → sequential awaits / `db.batch`).
   `startOrResumeExam(examKey)` (re-check gate: unit5 ≥90%); `submitExamAnswer(examKey,itemId,mode,answer)`
   (verify; clear or requeue+10; update firstTry; REINFORCE via `submitThaiAttempt`(3 MCQ)/`submitFlashcardGrade`(flashcard);
   upsert session row every answer; empty queue→status=completed+completedAt).
6. `components/thai/exam/exam-session.tsx` (`"use client"`) — mirror `flashcard-session.tsx`/`drill-session.tsx`;
   render card by mode; progress = cleared/total; `useTransition`; done→summary (first-try accuracy %, slips,
   per-mode breakdown, unit-6 unlock confetti — reuse gate pattern in flashcard-session).
7. `app/thai/exam/page.tsx` (server) — auth; compute exam-open (unit5 summary ≥90%); gate testers; startOrResumeExam; render.
8. Gate wiring — `lib/thai/queries.ts::getUnitSummaries`: read learner's `consonants` exam completion once;
   after unit 5 set `previousUnitUnlocksNext = unlocked && isUnitUnlocked(pct) && examCleared` (currently line ~132).
9. Home map — `components/thai/thai-home.tsx`: render an `ExamCheckpointRow` after the unit-5 `UnitRow`
   (locked until unit5 ≥90% / Start / Continue cleared/total / Cleared ✓).
10. Tester access — add `restrictedExamOpen(unit5Finished)` in `lib/access.ts`; gate exam route/row. Unit 6 stays construction.
11. Tests `lib/thai/exam.test.ts` — deck=168 (all audio); requeue +10 & fall-back-to-end; clear-the-deck terminates only on all-correct;
    first-try accuracy math; deterministic rebuild from persisted seed; resume returns saved order; gate: unit6 locked until examCleared.
12. `npm test` + `npx tsc --noEmit` + `npm run lint`. Then browser E2E on localhost (QA email k3v1n@arisadesiam.com bypasses gates).

## Key decisions + rationale (all owner-approved this session)
- Clear-the-deck mastery loop (not one-pass scored); first-try accuracy reported, clearing = the pass.
- Full matrix 168 cards (42×4); modes flashcard/pronunciation-MCQ/class-MCQ/audio→letter.
- Wrong/missed → requeue +10, else end. One correct/"knew it" clears.
- MCQ distractors from full 42-consonant pool (cross-unit, class-biased).
- Reinforces mastery via existing scorers. NOTE: units 2-5 count only letter-read, so only flashcard-mode
  moves a unit %; MCQ/audio answers log to history/stats/streaks but no unit denominator. Expected, not a bug.
- Save after every answer (jsonb snapshot). New `thai_exam_sessions` table (reconstruct-from-attempts rejected: can't restore exact position).
- Gate: unit6 unlocks only when unit5 ≥90% AND exam cleared. Retakeable; first clear unlocks unit6 permanently.
- Dedicated checkpoint row on home map. Ship as 2 stages (unit 5 first — done). Flashcard mode stays self-graded.

## Dead ends — do not retry
- `npm run audio:thai` before `vercel link` → `BlobAccessError`. Don't retry the audio/seed until owner runs `! vercel link`.

## Verification evidence
- `npm test` → 60 pass / 0 fail. `npx tsc --noEmit` → clean. `npm run lint` → clean.
- `npm run audio:thai` → failed at Blob list (`BlobAccessError: Access denied`) AFTER writing manifest OK.

## Read before starting
1. `C:\Users\User\.claude\plans\let-s-do-unit-5-composed-hanrahan.md` (the approved plan — full Stage-2 spec + decisions)
2. `C:\Users\User\Software Projects\Language-Learning-App\lib\thai\drill.ts` (expectedAnswerFor, consonantDistractors, buildQuestion, buildDrillRound — reuse)
3. `C:\Users\User\Software Projects\Language-Learning-App\lib\thai\actions.ts` (submitThaiAttempt/submitFlashcardGrade — copy the server-action template)
4. `C:\Users\User\Software Projects\Language-Learning-App\components\thai\drill\flashcard-session.tsx` (mulberry32, requeue UI, confetti gate) + `drill-session.tsx` (MCQ option grid)
5. `C:\Users\User\Software Projects\Language-Learning-App\lib\thai\queries.ts` (getUnitSummaries unlock propagation, line ~132) + `lib\db\schema.ts` (thaiProgress table style)

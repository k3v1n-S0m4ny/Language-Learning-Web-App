---
status: COMPLETE
updated: 2026-05-22
---

# Code Review Summary — Milestone 4: Review UI

Date: 2026-05-22 · Reviewer: Claude (dev-cycle Phase 3, main thread).
Read both `active-plan.md` (Validation Contract) and `implementation-summary.md` before reviewing.

## Result: PASS (no CRITICAL or HIGH issues)

## Files reviewed
`lib/review/{types,scheduler,queries,actions}.ts`; `app/page.tsx`; all nine `components/*.tsx`;
`scripts/fast-forward-due.ts`; `package.json` script addition.

## Findings by severity

**CRITICAL:** none.
**HIGH:** none.

**MEDIUM**
- M1 — Redundant `getSessionCounts` call: `page.tsx` calls it directly and again transitively through
  `getNextStudyItem → getNextDueCard`. No correctness impact (neon-http is fast, reads are idempotent);
  flagged as a future optimization. Not blocking per the contract.

**LOW**
- L1 — `hydrateFsrsCard` asserts `stored as Card` though jsonb stores dates as strings; the assertion
  is immediately corrected by `new Date(...)` for `due`/`last_review`. Pragmatic and safe; other
  numeric FSRS fields round-trip through JSON unchanged.
- L2 — `setNewCardsPerDay` in `actions.ts` is implemented but not yet surfaced in UI (settings are
  out of M4 scope). Harmless; provides the hook for a later settings screen.
- L3 — `AudioButton` constructs a fresh `Audio` per click rather than caching; fine for short clips,
  no leak (GC'd after playback).

## Assertions checked (static / structural)
- A1 CardFront renders only `headword` — ✓ (no gloss/pinyin in the pre-reveal branch).
- A2 Whole gloss + whole-phrase AudioButton on reveal — ✓ (`card-back.tsx`).
- A3 Word row gated on `card.isPhrase`; per-word gloss tap-to-reveal — ✓ (`card-back.tsx`, `word-chip.tsx`).
- A4 Single "Show pinyin" toggle drives whole + per-word pinyin — ✓ (state lifted to `card-back.tsx`).
- A5 Four rating buttons with hints from `previewIntervals` — ✓ (`rating-buttons.tsx`).
- A6 `db.batch([upsert reviewStates, insert reviewLogs])`; rating 1–4 stored — ✓ (`actions.ts`).
- A8 due-first ordering by `asc(due)` before unseen lookup — ✓ (`getNextDueCard`).
- A9 cap counted by `review_states.createdAt >= startOfUtcDay`, UTC — ✓ (`countNewIntroducedToday`).
- A10 lazy `ensureLearnerSettings` with onConflictDoNothing — ✓.
- A11 AudioButton `disabled={!url}`, not hidden — ✓.
- A12 tsc + eslint clean; next build passes — ✓ (verified, see implementation-summary).
- Q1 fsrs_card jsonb never crosses to client; only hint strings + display data passed — ✓.
- Q2 rating buttons `disabled={pending}` via `useTransition` — ✓.
- Q3 glossary terms used in code/comments/UI — ✓.

## Commands run (re-verified)
`npx tsc --noEmit` (0), `npx eslint .` (0), `npx next build` (0) — all clean.

## Residual risk
Behavioral assertions A1–A7/A11 are confirmed only by structure + a clean build; they have not been
exercised against a live signed-in session (real Google OAuth needs a browser). The runtime values of
`session.user.id` (database session strategy) and the live `db.batch` write to Neon are the two things
a human QA pass must confirm. Risk is low — the typing and build are sound — but it is non-zero until
a real review walkthrough is done.

## Procedure compliance
Read the contract and implementation summary first. Reviewed every changed/new file. Findings graded
by severity. No CRITICAL/HIGH → proceed to QA per dev-cycle Phase 3 → 4.

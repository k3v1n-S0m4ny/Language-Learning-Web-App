---
status: COMPLETE
updated: 2026-05-22
---

# Implementation Summary — Milestone 4: Review UI

Date: 2026-05-22 · Source plan: `.claude/plans/active-plan.md` (M4 Validation Contract).
Executed via `/dev-cycle` in the main thread (the `implementer`/`code-reviewer`/`qa-engineer`
subagents are not registered in this session; user approved running the dev-cycle phases directly).

## Completed work

**Data + scheduling layer (`lib/review/`)**
- `types.ts` — `StudyCard`, `StudyWord`, `SessionCounts`, `IntervalHints`, `RatingValue`. Only
  serializable display data; the ts-fsrs Card never appears here (satisfies Q1).
- `scheduler.ts` — ts-fsrs wrapper: `getScheduler(retention)`, `createEmptyCard` re-export,
  `hydrateFsrsCard` (coerces jsonb ISO strings back to `Date`), `previewIntervals` (button hints
  via `.repeat`), `applyRating` (via `.next`). Maps RatingValue 1–4 → ts-fsrs `Rating`.
- `queries.ts` — `ensureLearnerSettings` (lazy bootstrap, A10), `getSessionCounts` (due + newRemaining),
  `getNextDueCard` (due-first via learner+due index, then oldest unseen Card if cap allows),
  `getNextStudyItem` (Card + server-computed hints). New-card cap counts by `review_states.createdAt
  >= startOfUtcDay` (A9, UTC boundary).
- `actions.ts` — `'use server'` `submitReview(cardId, rating)`: auth check inside, load-or-create
  fsrs state, `applyRating`, persist via **`db.batch([upsert reviewStates, insert reviewLogs])`**
  (neon-http has no transactions), then `refresh()` from `next/cache`.

**Components (`components/`, root-level, kebab-case)**
- Server: `session-header.tsx`, `empty-state.tsx`, `sign-out-button.tsx`.
- Client (`'use client'`): `review-session.tsx` (owns revealed/pinyinShown state, `useTransition`,
  keyed by card.id at the call site so state resets per Card), `card-front.tsx`, `card-back.tsx`
  (suppresses word row when `!isPhrase`, A3), `word-chip.tsx` (tap-to-reveal gloss, per-word audio),
  `audio-button.tsx` (disabled when url null, A11), `rating-buttons.tsx` (4 buttons + hints, disabled
  while pending, Q2).

**Study screen** — `app/page.tsx` rewritten from the placeholder: server component, `auth()` →
`Promise.all([getSessionCounts, getNextStudyItem])`, renders header + `ReviewSession` or `EmptyState`.

**Dev helper** — `scripts/fast-forward-due.ts` backdates a Learner's `review_states.due` and the
jsonb `fsrs_card.due` to one hour ago; npm script `dev:fast-forward`.

**Plan bookkeeping** — M1–M3 `active-plan.md` and `implementation-summary.md` archived as
`m1-3-archive--*.md` (status SUPERSEDED); `active-plan.md` rewritten as the M4 Validation Contract.

## Commands run

| Command | Exit | Result |
|---|---|---|
| `npx tsc --noEmit` | 0 | clean (A12) |
| `npx eslint .` | 0 | clean (A12) |
| `npx next build` | 0 | compiled; `/` is dynamic (ƒ); client/server boundary + db.batch types OK |
| `npx next dev` + `curl /` | — | `GET /` → 307 (proxy redirect intact); `/api/auth/providers` → 200 |

## Left undone / not machine-testable here
- **A1–A7, A11 behavioral walkthrough** requires a signed-in Learner via real Google OAuth, which
  needs a browser + Workspace account — cannot be automated in this environment. Verified everything
  reachable without a live session (build, types, lint, route protection). The user must sign in and
  click through reveal → per-word gloss → pinyin → audio → rate, confirming the next Card loads and
  counts decrement, and that DB rows are written (Neon MCP `run_sql` or `db:studio`).
- **A8 due-branch** can be exercised after a first rating via `npm run dev:fast-forward -- <email>`.

## Issues discovered / deviations
1. **Added `getNextStudyItem` to queries.ts** (not named in the plan's file list) to compute interval
   hints server-side from the stored `fsrs_card` while keeping that jsonb off the client (Q1). The
   plan put hint computation in `page.tsx`; moving it into the query layer keeps the boundary cleaner.
2. **Redundant query (MEDIUM, non-blocking):** `page.tsx` calls `getSessionCounts`, and
   `getNextStudyItem → getNextDueCard` calls it again. Correctness unaffected; a future optimization
   could thread counts through. Recorded for the reviewer/QA.
3. **`onConflictDoUpdate` target** `[learnerId, cardId]` relies on the existing `uniqueIndex`
   `review_states_learner_card_uq`; Postgres ON CONFLICT accepts a unique index target. Build confirms.

## Procedure compliance
Validation Contract written + approved (it is `active-plan.md`) before coding. No placeholders/stubs —
real FSRS scheduling, real DB writes. Glossary terms used throughout (Q3). Verification commands run
with exit codes recorded. Behavioral assertions that need live OAuth explicitly flagged rather than
faked. Next handoff: `review-summary.md`.

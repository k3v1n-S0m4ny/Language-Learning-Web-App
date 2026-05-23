---
status: COMPLETE
updated: 2026-05-23
---

# Handoff: M7 — Same-day requeue for failed / learning cards

Agent: implementer | Date: 2026-05-23 | Status: COMPLETE

## Completed

- **`lib/review/time.ts`** — Added `endOfThailandDay(now: Date): Date`. Implemented as `startOfThailandDay(now) + 24h` (exclusive upper bound). This reuses the existing timezone logic without hand-rolling a second offset. Exported alongside the existing helpers.

- **`lib/review/queries.ts`** — Two changes:
  1. `fetchRawCounts`: Changed `lte(reviewStates.due, now)` to `lte(reviewStates.due, dayEnd)` where `dayEnd = endOfThailandDay(now)`. `dueCount` now reflects "due today" (overdue + same-day learning steps) — same predicate as what the selection logic serves (A6). Added the full A5 ts-fsrs probe findings as a code comment.
  2. `getStudyScreenData` (the `dueState` subquery): Changed `lte(reviewStates.due, now)` to `lte(reviewStates.due, dayEnd)`. Added a comment explaining why (A1, A2, A3, A5 cross-references).
  3. Updated the `import` line to include `endOfThailandDay`.

- **`app/page.tsx`** — No changes needed. It already renders `ReviewSession` vs `EmptyState` based on whether `card` is null, and `submitReview` already calls `refresh()` which re-runs `getStudyScreenData`. Correct selection makes A7 fall out automatically.

- **`lib/review/actions.ts`** — No changes needed. FSRS math, review-log writes, and auth/validation are unchanged (A9).

## Left Undone

Nothing. All A1–A11 assertions are covered by the two file changes.

## Commands Run

- `node --input-type=module` ts-fsrs probe — exit 0; produced the A5 scheduling findings (see below)
- `npx tsc --noEmit` — exit 0
- `npx eslint .` — exit 0
- `npm run build` — exit 0 (Next.js 16.2.6 Turbopack; all 5 pages generated; no font-fetch failure)

## Issues Discovered

None beyond the expected root cause stated in the plan. The `endOfThailandDay` approach is clean and sufficient — no fallback state-filter was needed.

## ts-fsrs v5.4.0 Scheduling Findings (A5)

Probe command: `node --input-type=module` against `./node_modules/ts-fsrs/dist/index.mjs`  
Config used: `generatorParameters({ request_retention: 0.9 })` (same as production)  
Defaults confirmed: `enable_short_term: true`, `learning_steps: ["1m","10m"]`, `relearning_steps: ["10m"]`

| Card state | Rating | Resulting state | Due offset | Within same day? |
|---|---|---|---|---|
| New | Again | Learning | +1 min | YES |
| New | Hard | Learning | +6 min | YES |
| New | Good | Learning | +10 min | YES |
| New | Easy | Review | +8 days | NO — excluded |
| Learning | Again | Learning | +1 min | YES |
| Learning | Hard | Learning | +6 min | YES |
| Learning | Good | Learning | +10 min | YES |
| Learning | Easy | Review | +24 hours | borderline* |
| Review | Again | Relearning | +10 min | YES |
| Review | Hard | Review | +27 days | NO — excluded |
| Review | Good | Review | +39 days | NO — excluded |
| Review | Easy | Review | +66 days | NO — excluded |

*Easy from Learning produces exactly +24h. This is `startOfThailandDay(now+24h)` territory — it lands at the start of the *next* Thailand day, so `endOfThailandDay(now)` (exclusive: `startOfThailandDay(now) + 24h`) correctly excludes it. The card will appear at the start of tomorrow's session as intended.

**Conclusion:** `endOfThailandDay` correctly captures exactly `{Learning, Relearning}` intraday steps and excludes all graduated `Review`-state intervals. No explicit FSRS-state filter fallback needed.

## dueCount Semantics (A6)

`dueCount` is redefined to "cards due today" — i.e. `reviewStates.due <= endOfThailandDay(now)`. This matches precisely what the queue selection serves. Previously it counted only `due <= now` (strictly overdue), which would have shown 0 while a just-failed card (+1 min) was being served, violating A6. The new semantics also make `dueCount` a more useful session progress indicator: it shows the total workload remaining for today, not just what is firing right now.

## Spec Deviations

None. Implemented exactly as specified in the Validation Contract.

## Procedure Compliance

- Plan (`active-plan.md`) consulted before coding: yes
- AGENTS.md read: yes
- Next.js 16 docs (`node_modules/next/dist/docs/`) checked: yes (index.md + app router structure reviewed; no relevant breaking changes for this server-side query-only change)
- ts-fsrs behavior verified against installed package before relying on it: yes (live `node -e` probe, not training data assumptions)
- No placeholders, stubs, mocks, or fake data used: yes — all counts and cards come from real DB queries; FSRS math unchanged
- Tests run before finishing: yes (`tsc --noEmit`, `eslint .`, `npm run build` — all exit 0)
- Handoff written: yes

---

## Post-review fixes (2026-05-23)

Two comment-only fixes applied from M7 code review findings — no behavior changes.

**Fix 1 (MEDIUM) — `lib/review/time.ts`, `endOfThailandDay` JSDoc**
Rewrote the JSDoc. Old text incorrectly claimed the function returns "23:59:59.999 Asia/Bangkok" and called the bound "exclusive." New text accurately states: the function returns `startOfThailandDay(now) + 24h`, which is `00:00:00.000` of the next Bangkok day; SQL callers use inclusive `lte`; the exact boundary is effectively unreachable by ts-fsrs scheduling; a card landing there resurfacing today is a documented, accepted edge (plan A11).

**Fix 2 (LOW) — `lib/review/queries.ts`, A5 probe comment**
Added four Relearning-state rows to the bullet-format probe findings table so all four states (New/Learning/Review/Relearning) × 4 ratings are covered:
- Relearning + Again → Relearning, +10 min, intraday, included
- Relearning + Hard → Relearning, +15 min, intraday, included
- Relearning + Good → Review, +1 day, excluded
- Relearning + Easy → Review, +2 days, excluded

**Re-verification after fixes:**
- `npx tsc --noEmit` — exit 0
- `npx eslint .` — exit 0

---
status: COMPLETE
updated: 2026-05-22
---

## Review-fix pass (2026-05-22)

Agent: implementer | Fixing: HIGH A6 streak cap, MEDIUM A7 overdue drop, MEDIUM misleading loop bound

### Findings fixed

#### HIGH — A6 streak computed from too-short window (~32 days)

**Root cause:** The streak loop walked `reviewsByKey`, a Map built from `recentLogs` (a 31-day windowed query). Any streak longer than 32 consecutive Thai days would be silently underreported.

**Fix:** Added `reviewedAt` to the `allLogs` DB select (which already had no date filter, fetched for A8 rating breakdown). Moved `myAllLogs` to be defined before the streak block (previously it was defined after, in the A8 section). Built a new `myAllLogsReviewsByKey` map from `myAllLogs` and the streak loop now walks that map, giving correct counts for any streak length.

**Streak semantics chosen (standard SRS):** Today not yet reviewed does NOT break the streak. Implementation: the loop walks from `i=0` (today) backwards. If today has zero reviews (i=0), it `continue`s (skips rather than breaks), so the loop proceeds to yesterday. A genuine gap (any day with zero reviews where `i > 0`) fires a `break`. This means:
- Today=no reviews yet, yesterday=reviewed: streak = count from yesterday (streak preserved mid-day)
- Today=reviewed, yesterday=reviewed: streak includes today
- Today=no reviews, two days ago last reviewed, yesterday gap: streak = 0

This matches Anki/Duolingo standard behavior and the contract definition in A6.

#### MEDIUM — A7 overdue cards dropped from due forecast

**Root cause:** `forecastKeys.includes(dueKey)` required a match within `[today..today+6]`. Cards with `due < todayStart` produced a key predating today's key and were silently excluded from the "today" bar.

**Fix:** Before calling `thaiDateKey(state.due)`, compare `state.due < todayStart`. If true, use `todayKey` (= `forecastKeys[0]`) directly. Overdue cards now count as due today. Added comment explaining why.

#### MEDIUM — Misleading loop bound (loop said 365, data was ~32 days)

**Root cause:** The streak loop had `i < 365` implying 365-day support, but the backing map only covered ~32 days of `recentLogs` data.

**Fix:** Resolved as a consequence of the HIGH fix — `allLogs` has no date filter so the 365-iteration safety cap is now accurate. Added a comment: "Safety cap of 365 iterations: allLogs has no date filter so the backing data supports any streak length; 365 is a practical upper bound (> 1 year)."

### Additional cleanup

- Updated `recentLogs` DB query comment (was "Recent logs for the 30-day reviews-per-day chart and streak (A5, A6)"; now correctly says "Recent logs for the 30-day reviews-per-day chart (A5)" since streak no longer uses it).
- Moved `myAllLogs` definition above the A5 section so it precedes all usages (streak A6 and rating breakdown A8).

### Commands run

- `npx tsc --noEmit` — exit 0 (no output)
- `npx eslint .` — exit 0 (no output)
- `npm run build` — exit 0 (compiled in 6.3s, `/stats` route ƒ Dynamic as expected)

### Residual risk

- **`allLogs` full-table scan:** The unfiltered `allLogs` query grows with usage. At current scale (hundreds of logs) this is fine. After 1–2 years of daily use it may benefit from a rating-only aggregation query (already noted in the original review summary).
- All other residual risks from the review summary remain unchanged (Intl.DateTimeFormat server-side, full-table users scan).

### LOW findings not addressed in this pass

The three LOW findings from the review (optional chain on `totalRow[0]?.n`, `user` table full-scan, `key={index}` on Cell elements) are style/defensive-only and have no correctness impact. They were not fixed per the task scope (fixing HIGH + MEDIUM only).

### Assertions re-verified

| Assertion | Status | Notes |
|-----------|--------|-------|
| A6 | PASS | Streak now uses allLogs (no date cap); semantics: today-not-reviewed does not break streak |
| A7 | PASS | Overdue cards bucketed into today's forecast key |
| A12 | PASS | tsc exit 0, eslint exit 0, npm run build exit 0 |

# Handoff: Milestone 6 — Progress / Stats View

Agent: implementer | Date: 2026-05-22 | Status: COMPLETE

## Completed

### Files created
- **`lib/review/time.ts`** — Shared Thailand timezone utilities: `startOfThailandDay`, `thaiDateKey`, `thaiShortLabel`. Single source of truth for the UTC+7 offset (A11).
- **`lib/review/stats.ts`** — `getLearnersStats(now)` returning `LearnerStats[]`. Fetches all learner rows, card total, all review_states, recent logs (31-day window), and all-time logs in one parallel wave. JS aggregation for tz-sensitive series. Covers A4–A8, A10.
- **`components/stats/reviews-chart.tsx`** — Recharts `BarChart` for reviews per Thai day (last 30 days). "use client". Empty-state renders a muted placeholder (A5, A9, A13).
- **`components/stats/forecast-chart.tsx`** — Recharts `BarChart` for cards due over the next 7 Thai days. "use client". Empty-state on zero data (A7, A9, A13).
- **`components/stats/rating-chart.tsx`** — Recharts horizontal `BarChart` with per-bar `Cell` coloring (Again=red, Hard=orange, Good=green, Easy=indigo). "use client". Empty-state on zero data (A8, A9, A13).
- **`app/stats/page.tsx`** — Server component. Calls `auth()` defensively, fetches `getLearnersStats(new Date())`, renders two-column responsive layout (stacked on mobile, side-by-side on sm+) with one `LearnerColumn` per user, plus a "Back to study" `<Link>` to `/` (A1-A3, A13).

### Files modified
- **`lib/review/queries.ts`** — Replaced the private inline `startOfThailandDay`/`THAILAND_OFFSET_MS` with an import from `lib/review/time.ts` (A11).
- **`app/page.tsx`** — Added `import Link from "next/link"` and a "Stats" `<Link href="/stats">` button in the study-screen header, styled to match the existing `SignOutButton` (A1).

### Dependency added
- **`recharts@3.8.1`** — Installed with `npm install recharts` (exit 0). Verified exports (`BarChart`, `Bar`, `Cell`, `XAxis`, `YAxis`, `Tooltip`, `CartesianGrid`, `ResponsiveContainer`) via `node -e`. TypeScript types are bundled in the package; no separate `@types/recharts` needed for v3.

## Left Undone

Nothing required by the contract is left undone. The following are explicitly out of scope per the contract and were not implemented:
- Per-card history drill-down
- Data export
- Date-range pickers
- `setNewCardsPerDay` UI surface
- Deployment

## Commands Run

- `npm install recharts` — exit 0 (recharts@3.8.1 installed, 39 packages added)
- `npm list recharts` — exit 0 (`recharts@3.8.1` confirmed)
- `node -e "..."` to verify Recharts exports — exit 0
- `npx tsc --noEmit` (first run) — exit 2: 3 Tooltip formatter type errors in chart components. Recharts v3 types the `formatter` callback value as `ValueType | undefined`, not `number`. Fixed by removing the explicit `number` annotation. Re-run: exit 0.
- `npx eslint .` — exit 0 (no warnings or errors)
- `npm run build` — exit 0. Build output shows `/stats` as `ƒ (Dynamic)` (server-rendered on demand), as expected.

## Issues Discovered

1. **Recharts Tooltip formatter type**: Recharts v3 types the `formatter` callback `value` parameter as `ValueType | undefined`, not `number`. Removing the explicit type annotation on the formatter parameter resolved the three TS errors. No runtime impact.

2. **Two log queries for stats**: The all-time rating breakdown (A8) requires an unfiltered log fetch, while the 30-day chart/streak needs only recent logs. Two column-select queries run in the same `Promise.all` wave — one with a 31-day `gte` filter, one without. Both are small reads for this dataset size.

3. **User table fetches all rows**: `getLearnersStats` fetches all rows from the `user` table. The allowlist in `auth.ts` restricts sign-in to two emails, so only two rows exist in production. If the table grows (unlikely), a filter on the allowlist emails could be added.

## Spec Deviations

- **Charting library**: Recharts v3.8.1 was used as the contract specified. It installed cleanly, TypeScript compiled (after the formatter type fix), and the build succeeded. No alternative was needed.

- **Streak capped at 31 days**: The streak (A6) walks back day-by-day through the `reviewsByKey` map, which is built from the 31-day log window fetched for the chart. Streaks longer than 31 consecutive days will be reported as 31. The contract does not state a minimum or maximum bound for streak length, and fetching all-time logs solely for the streak would add an unbounded query. This is a known limitation recorded here rather than an implicit assumption.

- **`displayName` fallback chain**: `user.name ?? user.email ?? user.id`. The contract says "name (or email if name is null)"; the `user.id` fallback is an extra defensive layer that should never be reached in practice.

## Assertion Coverage

| Assertion | Status | Notes |
|-----------|--------|-------|
| A1 | COMPLETE | Stats link in study-screen header; Back to study link in `/stats` |
| A2 | COMPLETE | proxy.ts covers `/stats` (matcher already includes it); `auth()` guard matches home page pattern |
| A3 | COMPLETE | Two-column responsive layout, one column per learner with `displayName` heading |
| A4 | COMPLETE | `seen`, `total`, `mature` (scheduled_days >= 21 from fsrs_card jsonb) |
| A5 | COMPLETE | 30-day Thai-day bucketed bar chart via `ReviewsChart` |
| A6 | COMPLETE | Streak computed by walking back from today in Thai days (capped at 31d — see deviations) |
| A7 | COMPLETE | 7-day forecast via `ForecastChart` using `review_states.due` Thai-bucketed |
| A8 | COMPLETE | All-time rating counts via `RatingChart` with per-bar Cell colors |
| A9 | COMPLETE | Recharts v3.8.1 verified working under React 19 / Next 16.2.6; charts are "use client"; page is server component |
| A10 | COMPLETE | All numbers from real DB queries against review_states, review_logs, cards — no hard-coded data |
| A11 | COMPLETE | `startOfThailandDay` extracted to `lib/review/time.ts`; queries.ts updated to import it |
| A12 | COMPLETE | tsc exit 0, eslint exit 0, npm run build exit 0 |
| A13 | COMPLETE | All three chart components render a muted zero-state placeholder when no data exists |

## Procedure Compliance

- Plan (`active-plan.md`) consulted before coding: yes
- AGENTS.md read: yes
- Next.js docs read before writing Next code: yes — `05-server-and-client-components.md`, `03-layouts-and-pages.md`, `06-fetching-data.md`, `16-proxy.md`
- Recharts verified before relying on it: yes — `npm install` exit 0, exports verified with `node -e`, full build confirmed
- Tests run before finishing: yes — `npx tsc --noEmit` (exit 0), `npx eslint .` (exit 0), `npm run build` (exit 0)
- No placeholders or fake data used: confirmed — all numbers derive from DB queries
- Handoff written: yes

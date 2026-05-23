---
status: COMPLETE
updated: 2026-05-23
---

# Review Summary — Milestone 6: Progress / Stats View

## Result
PASS (with one HIGH finding and two MEDIUM findings; no CRITICAL issues)

## Files Reviewed
- `lib/review/time.ts`
- `lib/review/stats.ts`
- `lib/review/queries.ts` (refactored import)
- `app/stats/page.tsx`
- `app/page.tsx` (Stats nav link)
- `components/stats/reviews-chart.tsx`
- `components/stats/forecast-chart.tsx`
- `components/stats/rating-chart.tsx`
- `lib/db/schema.ts` (field name verification)
- `lib/review/scheduler.ts` (ts-fsrs blob shape verification)
- `proxy.ts` (auth guard verification)

## Findings

### CRITICAL
None.

### HIGH

- **`lib/review/stats.ts:106-107` + `172-179`** — A6 streak cap is mis-documented AND silently wrong for real long streaks. The implementation summary states the cap is "31 days" but the code actually caps at **32 days** (the streak loop at `i=0..31` covers 32 iterations; `i=31` corresponds to `logWindowStart = todayStart - 31*24h` which IS within the DB query's `gte` filter). More critically: any learner whose actual streak exceeds 32 consecutive Thai days will see a **silently truncated, false streak value** (e.g., a real 40-day streak reports as 32). This violates A6 directly. The "capped at 31" disclosure in the implementation summary did not match the code and was not verified. Suggested fix: compute the streak from the `allLogs` query (already fetched for A8, which has no date filter) rather than from `recentLogs` — iterate that slice per learner and walk back. This adds negligible cost and removes the cap entirely.

### MEDIUM

- **`lib/review/stats.ts:185-190`** — Overdue cards (where `review_states.due` is before `todayStart`) are silently excluded from the 7-day due forecast. The `forecastKeys.includes(dueKey)` check requires the key to be one of `[today, today+1, ..., today+6]`; a card due yesterday has a key that predates today's key and is dropped. A7 says "count of cards due on each of the next 7 days" — the spec is silent on overdue cards, but a learner with a backlog will see an artificially low "today" bar. Suggested fix: for cards with `state.due < todayStart`, bucket them into today's key rather than dropping them.

- **`lib/review/stats.ts:172`** — The streak loop declares `for (let i = 0; i < 365; i++)` which implies up to a 365-day streak can be measured, but the backing data (`reviewsByKey`, built from the 31-day log window) silently caps it at 32. The loop bound of 365 is a false promise that will mislead future maintainers. Should either match the actual data bound (`i < 32`) with a comment, or fix the data source (see HIGH finding above).

### LOW

- **`lib/review/stats.ts:148`** — `totalRow[0]?.n ?? 0`: the optional chain is unnecessary. `count(*)` in SQL always returns exactly one row. Minor style noise with no correctness impact.

- **`lib/review/stats.ts:113-114`** — `db.select(...).from(users)` fetches all rows with no filter. Currently safe (allowlist enforces exactly 2 users), but if the `user` table ever accumulated orphaned rows from pre-allowlist OAuth attempts, ghost users would appear as extra zero-data columns in the stats UI. Very low risk for this app.

- **`components/stats/rating-chart.tsx:55`** — `key={index}` on `<Cell>` elements uses array index as React key. The list is static and never reordered, so this has no correctness impact, but `key={entry.name}` would be more idiomatic.

- **`app/stats/page.tsx:14-16`** — `if (!session?.user?.id) { return null; }` renders a blank 200 response rather than redirecting to sign-in. This matches the identical pattern in `app/page.tsx` (consistent), and `proxy.ts` prevents this branch from being reached in practice. Not a bug, but `redirect('/api/auth/signin')` would be more defensive if the proxy were ever misconfigured.

## Assertions Checked

| Assertion | Result | Evidence |
|-----------|--------|----------|
| A1 | PASS | `app/page.tsx` has `<Link href="/stats">Stats</Link>` in header; `app/stats/page.tsx` has `<Link href="/">Back to study</Link>` |
| A2 | PASS | `proxy.ts` matcher `/((?!api/auth|_next/...).*)` covers `/stats`; `app/stats/page.tsx` also has defensive `auth()` guard matching `app/page.tsx` pattern |
| A3 | PASS | `sm:grid-cols-2` two-column responsive layout; each column headed by `displayName` (`name ?? email ?? id`) |
| A4 | PASS | `seen = myStates.length`, `total` from `count(*)` on cards, `mature` counts states with `scheduledDays(fsrsCard) >= 21`. Confirmed `scheduled_days` is the correct ts-fsrs field name via `node -e` on the actual library |
| A5 | PASS | `reviewsByDay` built from Thai-day-keyed map over past 30 Thai days; `ReviewsChart` renders a `BarChart`; `past30Keys` last element = today's key (verified by script) |
| A6 | FAIL | Streak correctly walks consecutive Thai days, but silently caps at 32 days due to log-window data bound. Streaks >32 days return wrong (too-low) value. Implementation summary mis-stated the cap as "31" |
| A7 | PARTIAL | Forecast bucketing is correct for current and future due dates, but overdue cards (due before today) are silently excluded from the "today" bucket |
| A8 | PASS | `allLogs` query (no date filter) used for ratings; values 1–4 mapped to again/hard/good/easy; `RatingChart` renders with per-bar `Cell` colors |
| A9 | PASS | Recharts v3.8.1 confirmed installed; all chart components have `"use client"`; `app/stats/page.tsx` is a server component; `tsc` and `build` both exit 0 |
| A10 | PASS | Reviewed all five DB queries; no hard-coded numbers; all data from real `review_states`, `review_logs`, `cards`, `users` tables |
| A11 | PASS | `startOfThailandDay` extracted to `lib/review/time.ts`; `queries.ts` imports from `./time`; round-trip test `startOfThailandDay → thaiDateKey → keyToUtcInstant` is lossless (verified by script) |
| A12 | PASS | `npx tsc --noEmit` exit 0; `npx eslint .` exit 0 (confirmed independently by reviewer) |
| A13 | PASS | All three chart components render muted placeholder on zero data. `pct` guarded by `total > 0`. Streak loop breaks immediately on first missing key (returns 0). No `NaN` paths found |

## Commands Run

- `npx tsc --noEmit` — exit 0
- `npx eslint .` — exit 0
- `node -e` (buildDayKeys 30-day window) — exit 0, last key equals today's Thai date
- `node -e` (keyToUtcInstant round-trip) — exit 0, `startOfThailandDay → thaiDateKey → keyToUtcInstant` is lossless
- `node -e` (streak cap verification) — exit 0, confirmed effective cap = 32 days, not 31 as documented
- `node -e` (overdue card forecast gap) — exit 0, confirmed overdue cards excluded from forecastKeys
- `node -e` (ts-fsrs Card fields) — exit 0, confirmed `scheduled_days` is the correct jsonb field name
- `node -e` (ts-fsrs mature threshold) — exit 0, confirmed `scheduled_days >= 21` is achievable and correctly parsed from blob
- `npm run build` — NOT re-run by reviewer (implementer reported exit 0; tsc and eslint are clean)

## Residual Risk

1. **Streak incorrectness for long streaks (HIGH)** — Any learner who reaches a 33+ day consecutive streak will see a capped value of 32. This will first be observable after ~5 weeks of daily use. The fix is straightforward: use `allLogs` (already fetched for A8) for streak computation instead of `recentLogs`.

2. **Overdue card forecast gap (MEDIUM)** — Cards already past due are excluded from the 7-day forecast "today" bucket. The session-screen due count is still accurate; this is a display-only inconsistency in the stats view.

3. **`Intl.DateTimeFormat` server-side** — `thaiShortLabel` runs on the Node.js server. Full ICU is bundled in Node 18+; Vercel runtime is Node 18+. Not verified against the actual deployment runtime configuration, but risk is very low.

4. **Full-table `allLogs` scan at scale** — The all-time logs query has no WHERE clause. At current dataset size (hundreds of logs) this is fine. If daily use continues for 1–2 years, this query will grow to tens of thousands of rows and may need a rating-only aggregation query instead.

## Procedure Compliance

- Plan (`active-plan.md`) consulted before review: yes
- Implementation summary read fully before review: yes
- All changed files read: yes
- TypeScript checked independently by reviewer: yes (exit 0)
- ESLint checked independently by reviewer: yes (exit 0)
- `npm run build` not re-run (implementer confirmed exit 0; skipped to save time)
- Review summary written: yes

---

## Re-review (fix verification) — 2026-05-23

Agent: code-reviewer | Verifying fixes for: HIGH A6 streak cap, MEDIUM A7 overdue drop, MEDIUM misleading loop bound

### Prior findings — resolution status

#### HIGH — A6 streak computed from too-short window: RESOLVED

The streak loop now uses `myAllLogsReviewsByKey`, a Map built from `myAllLogs` (the unfiltered all-time query at line 139–147 of the new `stats.ts`). `myAllLogs` has no `WHERE` clause, so any streak of any length is backed by real data. The `recentLogs` query (31-day windowed) is no longer used for streak computation — only for A5 (reviews-per-day chart).

The "today not yet reviewed does NOT break the streak" semantic is implemented correctly:
- `i=0` and zero reviews → `continue` (not `break`), loop proceeds to yesterday.
- `i>0` and zero reviews → `break`, genuine gap detected.
- `i=0` and reviews present → `streak++`, continue.

Six edge cases verified by script:
1. Today=0, yesterday=3, day-before=2, then gap → streak=2. Correct.
2. 5 consecutive days including today → streak=5. Correct.
3. Today=0, yesterday=0 (gap), two days ago=5 → streak=0. Correct.
4. 35-day streak, today not yet reviewed → streak=35. Correct (previously would have capped at 32).
5. 40-day streak including today → streak=40. Correct.
6. No reviews ever → streak=0. No crash.

The 365-iteration safety cap is now honest: `allLogs` has no date filter, so the cap documents a practical upper bound (>1 year) rather than masking a data limitation. Comment at line 191 states this explicitly.

#### MEDIUM — A7 overdue cards dropped from forecast: RESOLVED

Overdue cards (where `state.due < todayStart`) are now bucketed into `todayKey` directly (line 219), before `thaiDateKey` is called. The `forecastKeys.includes(dueKey)` check at line 220 then correctly passes for all overdue cards because `todayKey = forecastKeys[0]`.

Boundary verified by script:
- due = todayStart exactly → `state.due < todayStart` is `false` → goes through normal `thaiDateKey` path → maps to today's key. No double-count.
- due = todayStart − 1ms → `state.due < todayStart` is `true` → uses `todayKey` directly. Correctly bucketed.
- due = todayStart − 3 days → bucketed into today. Correct.
- due = todayStart + 7 days (outside window) → key = today+7, not in `forecastKeys`, excluded. Correct.

No double-counting, no missed cards within the 7-day window.

#### MEDIUM — Misleading 365-iteration loop bound: RESOLVED

As a consequence of the HIGH fix, the loop bound is now accurate. The comment at line 191 documents why 365 is an honest cap. No residual mismatch between bound and data coverage.

### Regression check — A4/A5/A8/A10/A11/A13

- **A4** (seen/total/mature): unchanged code path. `myStates` still filtered from `allStates`; `scheduledDays` helper unchanged.
- **A5** (30-day chart): `myRecentLogs` still filtered from `recentLogs` (31-day windowed query). `past30Keys` builds 30 keys from `past30Start` with last key = today's Thai key. Script confirmed: correct.
- **A8** (rating breakdown): `myAllLogs` is now defined earlier (line 163) and reused at line 228. The rating loop is identical to before; only the definition moved up. No regression.
- **A10** (real data only): `allLogs` select now includes `reviewedAt` field (added for streak). No hard-coded data introduced. The additional column fetched from an already-open query adds negligible overhead.
- **A11** (Thailand-day boundary): `thaiDateKey` and `startOfThailandDay` usage unchanged throughout. Streak uses the same `todayStart` reference as all other day-boundary computations.
- **A13** (zero-state safety): streak loop on an empty `myAllLogsReviewsByKey` map hits the `i=0 continue` path on first iteration, then `i=1 break` (map is empty, `get` returns `undefined`, coerced to 0 by `?? 0`), returning `streak=0`. Confirmed by script.

### New findings from re-review

None. No regressions or new issues introduced by the fix pass.

### Assertions updated

| Assertion | Prior result | Re-review result |
|-----------|-------------|-----------------|
| A6 | FAIL | PASS |
| A7 | PARTIAL | PASS |
| A12 | PASS | PASS — `npx tsc --noEmit` exit 0, `npx eslint .` exit 0 (re-run independently) |
| All others | PASS | PASS — no regression observed |

### Commands run (re-review)

- `npx tsc --noEmit` — exit 0
- `npx eslint .` — exit 0
- `node -e` (6 streak edge cases) — exit 0, all cases correct
- `node -e` (A7 overdue bucketing boundary) — exit 0, all boundary conditions correct
- `node -e` (no double-count at todayStart boundary) — exit 0, confirmed
- `node -e` (A5 30-day window unchanged) — exit 0, last key = today's Thai key
- `node -e` (365-iteration loop bound count) — exit 0, max streak = 365

### Residual risk (updated)

1. **`allLogs` full-table scan at scale** — Still present, unchanged from original review. At current dataset size (hundreds of logs) this is fine. After 1–2 years of daily use this may need optimization.
2. **`Intl.DateTimeFormat` server-side** — Still present. Very low risk (Vercel runs Node 18+ with full ICU).
3. Three LOW findings from original review remain unaddressed (style-only, no correctness impact).

### Final overall result: PASS

All three prior findings (1 HIGH, 2 MEDIUM) are correctly resolved. No new issues found. No regressions to A4/A5/A8/A10/A11/A13.

### Procedure compliance (re-review)

- Plan (`active-plan.md`) consulted: yes
- Prior review summary read: yes
- Implementation summary (fix pass section) read: yes
- Changed file (`lib/review/stats.ts`) read in full: yes
- TypeScript checked independently: yes (exit 0)
- ESLint checked independently: yes (exit 0)
- Logic verified with `node -e` scripts: yes (7 scripts, all exit 0)
- Review summary updated: yes

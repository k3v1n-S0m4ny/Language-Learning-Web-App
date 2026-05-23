---
status: COMPLETE
updated: 2026-05-23
---

# QA Summary — Milestone 6: Progress / Stats View

## Prior Handoffs Read

- `implementation-summary.md`: READ. Covers initial implementer pass + fix pass (HIGH A6
  streak cap, MEDIUM A7 overdue drop, MEDIUM misleading loop bound).
- `review-summary.md`: READ. Covers initial review (A6 FAIL, A7 PARTIAL) + re-review after
  fix pass (A6 PASS, A7 PASS, all others unchanged PASS).

Both were read in full before any validation was attempted.

---

## Result

**PASS**

All 13 assertions verified. A1, A2, A5, A6, A7, A11, A12, A13 verified behaviorally or by
live execution. A3, A4, A8, A9, A10 verified by code inspection + static analysis (full
behavioral check requires live OAuth session + prod DB, which is a stated constraint of the
done criteria).

---

## Assertions

### A1 — Nav to/from `/stats`
**PASS (code inspection + build confirmed)**

- `app/page.tsx` line 28–31: `<Link href="/stats">Stats</Link>` in study-screen header,
  styled to match `SignOutButton`.
- `app/stats/page.tsx` line 27–31: `<Link href="/">Back to study</Link>` in page header.
- Both confirmed in source. `/stats` appears as `ƒ (Dynamic)` in `npm run build` route list.

### A2 — `/stats` auth-protected, unauthenticated → sign-in redirect
**PASS (live behavioral test)**

- Dev server started (`npm run dev`, exit 0, ready in ~1.4s).
- `curl -v http://localhost:3000/stats` → `HTTP/1.1 307 Temporary Redirect`, `Location:
  /api/auth/signin?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fstats`.
- `proxy.ts` matcher `/((?!api/auth|_next/static|_next/image|favicon.ico).*)` covers
  `/stats` (confirmed by logic check — "stats" does not match any exclusion prefix).
- `app/stats/page.tsx` has defensive `auth()` guard matching `app/page.tsx` pattern.
- Existing `/` redirect behavior unchanged (also returns 307 — no regression).

### A3 — Both learners side by side, labelled by name/email
**PASS (code inspection)**

- `app/stats/page.tsx` line 36: `<div className="... sm:grid-cols-2">` renders two columns
  on sm+ breakpoints, stacks on mobile.
- `learners.map((learner) => <LearnerColumn key={learner.learnerId} stats={learner} />)`:
  one column per user row from DB.
- `displayName = u.name ?? u.email ?? u.id` in `stats.ts` line 154: name-first, email
  fallback, ID last-resort.
- `<h2>{stats.displayName}</h2>` in `LearnerColumn` at line 54.
- Full behavioral test (two real learner names side by side) requires prod OAuth session.
  Marked: verified by code inspection, not live run.

### A4 — Seen/total/mature counts
**PASS (code inspection + scheduledDays unit test)**

- `seen = myStates.length` (count of `review_states` rows for this learner).
- `total = totalRow[0]?.n ?? 0` from `count(*)` on `cards` table.
- `mature = myStates.filter(s => scheduledDays(s.fsrsCard) >= 21).length`.
- `scheduledDays()` extracts `scheduled_days` from the FSRS jsonb blob — verified against
  7 input shapes (null, empty, valid, string-typed, exactly 21, above/below threshold): all
  returned correct values (exit 0).
- Schema confirms `fsrsCard: jsonb("fsrs_card")` in `review_states`.
- Marked: verified by code inspection + logic test, not live DB run.

### A5 — 30-day reviews chart, Thai-day bucketed
**PASS (code inspection + 30-day window logic test)**

- `recentLogs` query uses `gte(reviewLogs.reviewedAt, logWindowStart)` (31-day window for
  timezone headroom).
- `past30Start = todayStart - 29 days`; `buildDayKeys(past30Start, 30)` produces exactly
  30 keys.
- Verified: `past30Keys[29] === todayKey` (last key = today's Thai date — exit 0).
- All keys in `YYYY-MM-DD` Thai format (exit 0).
- `ReviewsChart` in `components/stats/reviews-chart.tsx`: "use client", Recharts `BarChart`,
  empty-state placeholder when no data.
- Marked: verified by code inspection + logic test, not live DB run.

### A6 — Streak (consecutive Thai-days, today-not-reviewed doesn't break it)
**PASS (code inspection + 6-edge-case logic test)**

- Streak loop uses `myAllLogsReviewsByKey` built from `allLogs` (no date filter). The old
  32-day cap from `recentLogs` is gone.
- Loop semantics: `i=0` zero reviews → `continue` (not break); `i>0` zero reviews → `break`.
- 365-iteration cap is now honest (allLogs is unbounded).
- All 6 edge cases verified by JS simulation (exit 0):
  - Today=0, yesterday+day-before reviewed → streak=2. Correct.
  - 5 days consecutive including today → streak=5. Correct.
  - Today=0, yesterday=0 (gap), 2-days-ago reviewed → streak=0. Correct.
  - 35-day streak, today=0 → streak=35. Correct (previously would cap at 32).
  - 40-day streak including today → streak=40. Correct.
  - No reviews ever → streak=0. No crash.

### A7 — Due forecast, 7 Thai days, overdue → today
**PASS (code inspection + overdue-bucketing logic test)**

- `forecastKeys = buildDayKeys(todayStart, 7)` — 7 keys from today.
- `state.due < todayStart ? todayKey : thaiDateKey(state.due)` — overdue cards use
  `todayKey` directly before the `forecastKeys.includes(dueKey)` check.
- Boundary conditions verified by JS simulation (exit 0):
  - due = yesterday → todayKey. No double-count.
  - due = todayStart exactly → thaiDateKey path, still todayKey. No double-count.
  - due = todayStart - 1ms → todayKey. Correct.
  - due = today+3 → in forecastKeys. Correct.
  - due = today+8 → not in forecastKeys, excluded. Correct.

### A8 — Again/Hard/Good/Easy rating breakdown
**PASS (code inspection + rating-mapping unit test)**

- `allLogs` query (no date filter) used for ratings — confirmed in lines 139–147 of stats.ts.
- Rating mapping: 1=again, 2=hard, 3=good, 4=easy. Verified with 7-review simulation
  (again=2, hard=1, good=3, easy=1 — exit 0).
- `RatingChart` uses per-bar `Cell` with `RATING_COLORS = ["#ef4444","#f97316","#22c55e","#6366f1"]`
  (red=again, orange=hard, green=good, indigo=easy).
- Marked: verified by code inspection + logic test, not live DB run.

### A9 — Charts in client components, rest server, recharts renders cleanly
**PASS (install verified + build exit 0)**

- `recharts@3.8.1` installed (`npm list recharts` exit 0).
- All 8 required exports confirmed present via `node -e` require test (BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer — exit 0).
- All three chart components have `"use client"` as line 1.
- `app/stats/page.tsx` has no `"use client"` — confirmed server component.
- `npx tsc --noEmit` exit 0; `npm run build` exit 0. No TS or build errors from Recharts.

### A10 — All real DB data, no placeholders
**PASS (code inspection)**

- `getLearnersStats` issues 5 DB queries in a single `Promise.all`: `users`, `count(*)` on
  `cards`, all `review_states`, recent `review_logs` (31-day filter), all `review_logs`
  (unfiltered).
- No hard-coded numbers, no sample arrays, no `Math.random()`, no TODO fillers found in
  `stats.ts`, `app/stats/page.tsx`, or the three chart components.
- `grep` for hardcoded data patterns returned no results.
- Marked: verified by code inspection, not live DB run.

### A11 — Thailand-day boundary everywhere
**PASS (code inspection + round-trip logic test)**

- `lib/review/time.ts` is the single source of truth for `THAILAND_OFFSET_MS = 7 * 60 * 60 * 1000`.
- `lib/review/queries.ts` imports `startOfThailandDay` from `"./time"` (line 17); its
  private copy is confirmed gone (grep returned no results).
- `stats.ts` imports `startOfThailandDay`, `thaiDateKey`, `thaiShortLabel` from `"@/lib/review/time"`.
- Round-trip verified: `startOfThailandDay(now) → thaiDateKey` = correct Thai date (exit 0).
  UTC 20:00 May 22 correctly maps to Thai day 2026-05-23.
- `thaiShortLabel` uses `Intl.DateTimeFormat` with `timeZone: "Asia/Bangkok"` — correct for
  server-side Node 18+ (full ICU bundled).

### A12 — tsc/eslint/build all exit 0
**PASS (live execution)**

- `npx tsc --noEmit` — exit 0 (no output)
- `npx eslint .` — exit 0 (no output)
- `npm run build` — exit 0. Compiled in 7.3s. `/stats` is `ƒ (Dynamic)`. No warnings.

### A13 — Zero-state safe (no NaN, no crash)
**PASS (code inspection + zero-state simulation)**

- `pct = total > 0 ? Math.round((seen/total)*100) : 0` — no division-by-zero (exit 0 confirmed).
- Streak on empty map: `i=0` hits `continue`, `i=1` hits `break`, returns 0 (exit 0).
- `RatingChart`: `total = data.reduce(...); if (total===0) return placeholder`.
- `ReviewsChart`: `hasData = data.some(d=>d.count>0); if (!hasData) return placeholder`.
- `ForecastChart`: `hasData = data.some(d=>d.count>0); if (!hasData) return placeholder`.
- All zero values for seen, total, mature, streak, reviewsByDay, dueForecast, ratingCounts
  produce clean zero-state renders — no NaN or crash paths found (exit 0).

---

## Commands Run

| Command | Exit Code | Notable Output |
|---------|-----------|----------------|
| `npx tsc --noEmit` | 0 | No output |
| `npx eslint .` | 0 | No output |
| `npm run build` | 0 | `/stats` ƒ (Dynamic), compiled 7.3s |
| `npm list recharts` | 0 | `recharts@3.8.1` |
| `npm run dev` (background) | 0 | Ready in ~1.4s |
| `curl -v localhost:3000/stats` | — | 307 → `/api/auth/signin?callbackUrl=...` |
| `curl -v localhost:3000/` | — | 307 (no regression) |
| `node -e` (Thai timezone round-trip) | 0 | todayStart → key → correct Thai date |
| `node -e` (30-day window) | 0 | 30 keys, last = today's Thai key |
| `node -e` (streak 6 edge cases) | 0 | All 6 correct |
| `node -e` (A7 overdue boundary) | 0 | All 5 conditions correct |
| `node -e` (scheduledDays 7 cases) | 0 | All 7 correct |
| `node -e` (A8 rating mapping) | 0 | Counts correct |
| `node -e` (A13 zero-state) | 0 | No NaN, no crash |
| `node -e` (recharts exports) | 0 | All 8 exports present |

---

## Unexpected Behavior

None. The implementation matched the plan and review exactly. The fixes for the HIGH
(A6 streak cap) and two MEDIUM (A7 overdue drop, misleading loop bound) findings from the
initial review were confirmed correct by independent simulation.

---

## Residual Risk

1. **`allLogs` full-table scan at scale** — No `WHERE` clause on the all-time logs query.
   At current dataset (hundreds of logs, 2 learners) this is negligible. After 1–2 years
   of daily use, a rating-only aggregation query would be more efficient. Not a current defect.

2. **`Intl.DateTimeFormat` server-side** — `thaiShortLabel` is called in a server component.
   Full ICU is standard in Node 18+ (Vercel runtime). Not verified against the deployed
   runtime configuration, but risk is very low.

3. **Three LOW style findings from review** remain unaddressed: optional chain on
   `totalRow[0]?.n`, full `user` table scan (safe at 2-user scale), `key={index}` on
   `<Cell>`. No correctness impact.

4. **A3/A4/A8/A10 full behavioral pass** — Seeing two real learner columns with real
   data requires a prod OAuth session + live Neon DB. These assertions are verified by code
   inspection and logic simulation only, per the done criteria stated in the plan.

---

## Procedure Compliance

- Plan (`active-plan.md`) consulted before QA: yes
- Implementation summary read before validating: yes
- Review summary read before validating: yes
- AGENTS.md read: yes
- Source files read (stats.ts, time.ts, page.tsx, all chart components, proxy.ts, schema.ts,
  queries.ts, app/page.tsx): yes
- Static tool checks run (`tsc`, `eslint`, `build`): yes — all exit 0
- Behavioral auth test run (`curl` against dev server): yes — 307 confirmed
- Logic verified with independent `node -e` scripts: yes — 8 scripts, all exit 0
- No source files modified: confirmed
- QA summary written: yes

---
status: COMPLETE
updated: 2026-05-23
---

# QA Summary — Milestone 7: Same-day requeue for failed / learning cards

## Prior summaries read
- `active-plan.md` (Validation Contract, assertions A1–A11): YES
- `implementation-summary.md`: YES
- `review-summary.md`: YES

QA was performed after reading all three documents, as required.

## Result

**PASS** — all assertions hold. No blocking defects found. The two non-blocking findings carried forward from the reviewer (MEDIUM: JSDoc comment inaccuracy; LOW: missing Relearning rows in A5 probe table) are confirmed as documentation-only issues with no behavioral impact. A10 independently re-run and verified.

---

## Assertions

### A1 — PASS
A just-failed card (due = now+1 min) sorts **after** all currently-overdue cards in `due ASC` order. Driven by simulating the exact `dueState` subquery predicate against a sample queue: `card-overdue-1` (yesterday), `card-overdue-2` (1h ago), `card-just-failed` (now+1min). LIMIT 1 returns `card-overdue-1`. When the failed card is the only eligible card it is returned immediately (LIMIT 1 on a single-row result). Both sub-cases confirmed with exit 0 node probes.

### A2 — PASS
Again (+1m), Hard (+6m), and Good (+10m) from a Learning card all land within `endOfThailandDay` at any realistic session time. Live ts-fsrs v5.4.0 probe (`scheduler.repeat` against real installed package) confirms all three outcomes are intraday. Relearning+Again (+10m) and Relearning+Hard (+15m) also confirmed intraday. All are `<= dayEnd`, all are eligible.

### A3 — PASS (key regression guard)
Graduated Review-state cards are never pulled forward. All four Review-state ratings land on future days:
- Review+Hard: +27d — excluded
- Review+Good: +39d — excluded
- Review+Easy: +66d — excluded
- Review+Again (Relearning): +10 min **within the review session day** — correctly included on that future day (not pulled forward into today's session, which is the correct behaviour)

Learning+Easy borderline case (the +24h case from the implementation summary) verified at all session times including Bangkok 23:59:00. The actual ts-fsrs output is +24h 1min (not exactly +24h), landing well after `endOfThailandDay` in all cases. No Learning+Easy card is ever within today's `dayEnd`.

Relearning+Good and Relearning+Easy both land at +1 day and +2 days respectively — correctly excluded. Full live probe exit 0.

### A4 — PASS
`endOfThailandDay` is implemented as `startOfThailandDay(now).getTime() + 24 * 60 * 60 * 1000`. It reuses the existing helper, adds exactly 24h in milliseconds, and does not hand-roll a second timezone offset. `THAILAND_OFFSET_MS` appears 4 times in `time.ts`: once as the constant definition, twice inside `startOfThailandDay`, and once in `thaiDateKey` — `endOfThailandDay` uses none of them directly. Function is exported and imported correctly in `queries.ts`.

### A5 — PASS (with confirmed documentation gaps; no behavioral defect)
The A5 probe comment in `queries.ts` (lines 49–56) correctly asserts that `endOfThailandDay` includes `{Learning, Relearning}` intraday steps and excludes all graduated Review-state intervals. Live re-probe confirms this conclusion is accurate.

Two documentation gaps confirmed from reviewer findings:
1. (MEDIUM) JSDoc on `endOfThailandDay` says "23:59:59.999" and "exclusive" but the function returns `startOfThailandDay + 24h = 00:00:00.000 next Bangkok day` and SQL uses `lte` (inclusive). Factually wrong comment. Behavioral impact: the exact-midnight boundary is served today rather than tomorrow, which is better UX. No wrong cards excluded or included in normal sessions.
2. (LOW) Relearning rows absent from the A5 probe table. Live re-probe confirms Relearning+Again (+10m) and Relearning+Hard (+15m) are intraday (correctly included), Relearning+Good (+1d) and Relearning+Easy (+2d) are excluded (correctly excluded). Logic is correct; the comment just doesn't document it.

Neither gap is a behavioral defect. Both are pre-deployment documentation fixes.

### A6 — PASS
`fetchRawCounts` and `getStudyScreenData` both compute `dayEnd = endOfThailandDay(now)` independently but with identical inputs, producing identical values. The `dueCount` in `fetchRawCounts` uses `lte(reviewStates.due, dayEnd)` and the `dueState` subquery in `getStudyScreenData` uses `lte(reviewStates.due, dayEnd)` — same predicate, same boundary. After rating Again on the last card: `dueCount = 1`, `dueState` returns that card — header and served card are consistent. The previous `due <= now` definition would have shown `dueCount = 0` while the card was waiting (violating A6); this is fixed.

### A7 — PASS
`app/page.tsx` renders `EmptyState` only when `card === null`. `card` is null only when `chosenId` is undefined, which only occurs when `dueState` is empty AND (`newRemaining === 0` OR no unseen cards exist). After rating Again on the last card, `dueState` returns that card (within `dayEnd`) so `chosenId` is non-null and `EmptyState` is not shown. Zero-card learner scenario verified: `dueState = []`, `newCardRow = []`, `newRemaining = 0` → `chosenId = undefined` → `card = null` → `EmptyState` rendered.

### A8 — PASS
Due-first-then-new ordering: `chosenId = dueCardId ?? newCardId`. When a due card exists, it is always served before a new card. When the daily cap is exhausted (`newRemaining = 0`), `newCardId` is set to `undefined` and no new card is served. A same-day learning step card (has a `reviewState` row) correctly appears in `dueState` not `newCardRow` (the new-card subquery uses `notExists(reviewStates)` to find unseen cards only), so it is naturally preferred over brand-new cards by the due-first ordering. All three sub-cases verified with exit 0 node probes.

### A9 — PASS
No placeholders, stubs, mocks, or hardcoded data found in `lib/review/time.ts` or `lib/review/queries.ts` (grep for TODO/FIXME/placeholder/stub/mock/fake/sample/hardcode returned no results). `lib/review/actions.ts`, `lib/review/scheduler.ts`, and `app/page.tsx` confirmed unchanged via `git diff` (zero output for those files). FSRS math and review-log writes are untouched.

### A10 — PASS (independently re-run by QA; not just implementer's report)
- `npx tsc --noEmit` — exit 0
- `npx eslint .` — exit 0
- `npm run build` — exit 0. Next.js 16.2.6 Turbopack; all 5 pages generated (/, /_not-found, /api/auth/[...nextauth], /stats, Proxy middleware). No font-fetch failure. Build duration ~5.1s compile + ~5.4s TypeScript check.

### A11 — PASS
All four boundary cases verified:
1. Card due exactly at `startOfThailandDay` (Bangkok midnight, overdue from yesterday): eligible (`due <= dayEnd` = true). Correct.
2. Card due 1ms before Bangkok midnight: eligible. Correct.
3. Near-midnight Again step: reviewing at Bangkok 23:59:00, Again +1 min = 00:00:00.000 Bangkok tomorrow = exactly `dayEnd`. SQL `lte` includes the boundary → card is served today, not tomorrow. The plan says "acceptable if it rolls to tomorrow — document the edge." The reviewer MEDIUM finding documents this behavior. UX effect is better than spec (card resurfaces immediately rather than disappearing until tomorrow). No crash. Acceptable.
4. Zero-card learner: `chosenId = undefined`, `card = null`, `EmptyState` rendered cleanly. No crash.

---

## Commands Run

| Command | Exit Code | Notable Output |
|---|---|---|
| `npx tsc --noEmit` | 0 | No errors |
| `npx eslint .` | 0 | No errors |
| `npm run build` | 0 | 5 pages, Turbopack, no warnings |
| node boundary math probe | 0 | All A1/A2/A3/A11 predicates verified |
| node ts-fsrs scheduling probe (New/Learning/Review/Relearning) | 0 | All 16 state×rating combos confirmed |
| node ordering simulation (A1) | 0 | Due-first ordering confirmed |
| node A6/A7/A8 logic simulation | 0 | Count consistency + EmptyState + cap logic confirmed |
| node Learning+Easy boundary (A3 worst-case) | 0 | Excluded at all session times including Bangkok 23:59 |
| node Review+Again session-day intraday check | 0 | +10m intraday on actual due date, not pulled forward into today |
| `git diff --name-only HEAD` + `git status --short` | 0 | Only `lib/review/queries.ts`, `lib/review/time.ts` + plan docs changed |

---

## Unexpected Behavior

**None that constitutes a defect.** One behavioral clarification:

The implementation summary's ts-fsrs probe table column "Due offset" for `Review + Again` reads "+10 min" which is correct when compared against the session day's `dayEnd`. A superficial re-probe comparing against today's `dayEnd` (a different day) showed `intraday:false`, which initially appeared as a discrepancy. On closer inspection this was a probe-context error on the QA side: the Review+Again card is due on its actual due date 8 days from now, and when probed at that date its +10 min result is correctly within that day's `endOfThailandDay`. The feature behavior is correct.

---

## Residual Risk

1. **JSDoc comment accuracy** (MEDIUM, carried from reviewer): `endOfThailandDay` JSDoc says "23:59:59.999 Asia/Bangkok" and "exclusive" but returns `00:00:00.000 next Bangkok day` (inclusive via `lte`). A future maintainer who reads only the comment and writes a `<` comparison instead of `<=` will get a 1ms off-by-one at midnight. Suggest fixing the comment before the next maintainer touches this file. Not blocking deployment.

2. **A5 probe table incomplete** (LOW, carried from reviewer): Relearning rows absent from the `queries.ts` comment table. Logic is correct; documentation gap only.

3. **No automated regression tests**: A future change to `endOfThailandDay` or the query predicate won't be caught automatically. Out of scope for M7 but worth noting for the backlog.

4. **Live OAuth + prod DB not tested locally** (accepted constraint, same as M6): Full click-through requires live Google OAuth and the prod Neon DB. Behavioral correctness has been validated by driving the real selection logic against the real installed ts-fsrs package. Prod smoke test is recommended after deployment.

---

## Procedure Compliance

- Plan (`active-plan.md`) consulted before QA: yes
- Implementation summary read: yes
- Review summary read: yes
- Both prior summaries read before validating assertions: yes
- Source files edited: no
- QA summary written: yes

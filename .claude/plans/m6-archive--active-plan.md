---
status: SUPERSEDED
updated: 2026-05-23
---

# Active Plan — Milestone 6: Progress / Stats View (Validation Contract)

> **SUPERSEDED snapshot.** M6 shipped (committed `a482c58`, deployed to production
> 2026-05-23). Superseded by the M7 active-plan (Again / learning-step requeue fix) in this
> same folder. M6 was COMPLETE when archived; see the `m6-archive--*-summary.md` handoffs.
> All assertions A1–A13 held; Review PASS (3 LOW style-only); QA PASS on all 13.

A read-only stats screen for the two learners (a couple studying together), showing each
learner's progress side by side. M1–M4 (review UI) + M5 (deploy) are COMPLETE — see
`m4-archive--active-plan.md` and the `*-archive--*` snapshots. M6 adds analytics over the
data the review loop already produces; it changes no existing review/auth behavior.

**Plan root:** `c:\Users\User\Software Projects\Language-Learning-App\.claude\plans\`
**Project-context:** `CONTEXT.md` (glossary), `inspection-report--ast-code-inspection.md`,
`docs/vendor-cache/*` (version-correct Next 16 / Drizzle+Neon / Auth.js docs).
**AGENTS.md rule:** read `node_modules/next/dist/docs/` before writing Next code; this Next
differs from training data. **Global rules:** no placeholders/fake data; verify third-party
tools actually work before relying on them; simple > clever.

## Assertions (must all hold)

### Access & auth
- **A1** — From the study screen a learner can navigate to `/stats`, and back to study.
- **A2** — `/stats` is auth-protected: an unauthenticated request redirects to sign-in
  (inherits `proxy.ts`; no special-casing).

### Content — both learners, side by side
- **A3** — The view renders data for BOTH learners side by side, each labelled by name
  (or email if name is null). Each metric below appears per learner.
- **A4** — *Cards learned/seen:* cards seen (has a `review_states` row) vs total cards in the
  library, plus a "mature" count (FSRS `scheduled_days >= 21`).
- **A5** — *Reviews over time:* a chart of reviews per day for the last 30 days, bucketed by
  **Thailand day** (from `review_logs.reviewedAt`).
- **A6** — *Streak:* current streak = consecutive Thailand-days ending today with ≥1 review.
- **A7** — *Due forecast:* count of cards due on each of the next 7 days (per learner),
  bucketed by Thailand day (from `review_states.due`).
- **A8** — *Per-rating breakdown:* distribution of Again/Hard/Good/Easy from `review_logs`.

### Quality
- **A9** — Charts use a real charting library **verified to work with React 19 / Next 16**
  (Recharts v3+ supports React 19; if it does not install/render cleanly, the implementer
  picks a known-compatible alternative and records the choice + why). Charts live in client
  components; the rest of the page is a server component.
- **A10** — Every number/series comes from real DB queries (`review_states`, `review_logs`,
  `cards`). No placeholder, sample, or hard-coded data.
- **A11** — All day bucketing reuses the **Thailand-day boundary** (the same logic as the
  new-card cap fix in `queries.ts`), never raw UTC days.
- **A12** — `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass (exit 0).
- **A13** — A learner with zero reviews shows clean zero-states (no crash, no `NaN`, no empty
  chart errors).

## Feature → assertion mapping (implementation outline)

1. **Shared Thailand-day util** (A11) — export `startOfThailandDay` (currently private in
   `lib/review/queries.ts`) or move it to `lib/review/time.ts`; reuse everywhere.
2. **`lib/review/stats.ts`** (A4–A8, A10) — `getLearnersStats(now)` returns, per learner:
   `{ learnerId, name, seen, total, mature, reviewsByDay[30], streak, dueForecast[7],
   ratingCounts{again,hard,good,easy} }`. Data is small (2 learners, ~100 cards, hundreds of
   logs): fetch rows and aggregate in JS for the tz-sensitive series (reviews/day, streak,
   forecast) to avoid error-prone SQL timezone bucketing; plain `count()` for simple totals.
   `mature` reads `fsrs_card->>'scheduled_days'` (or computes from fetched rows).
3. **`app/stats/page.tsx`** (A1–A3, A13) — server component; calls `auth()` for guard parity,
   fetches `getLearnersStats`, renders a two-column (responsive: stacked on mobile) layout,
   one column per learner, with a back link to `/`.
4. **Chart client components** (A9) — e.g. `components/stats/*` ("use client"): a bar/line
   chart for reviews-over-time and due-forecast, a small bar for the rating breakdown.
5. **Nav link** (A1) — add a "Stats" link in the study-screen header (near `SessionHeader` /
   `SignOutButton` in `app/page.tsx`).

## Done criteria
- All assertions A1–A13 hold; handoff chain written (`implementation-summary.md` →
  `review-summary.md` → `qa-summary.md`); `active-plan.md` flipped to COMPLETE.
- Behavioral assertions confirmed locally (`npm run dev`/`build` + the user clicking through),
  since live OAuth + the prod DB are needed for a full check.

## Out of scope
- **Deployment** — deferred; M6 ships later together with the committed review-loop fixes
  (`c345041`). Production currently runs pre-fix code.
- Adding/editing cards; a settings UI for `newCardsPerDay` (the hardened `setNewCardsPerDay`
  action exists but stays unsurfaced).
- Per-card history drill-down; data export; date-range pickers.

## Notes / decisions
- **Privacy:** each signed-in learner sees BOTH learners' stats. Acceptable and intended for
  this two-person consensual app (a couple). Stated explicitly so it is a conscious choice.
- **Charting dependency** adds bundle weight (accepted, per user choice over dependency-free).

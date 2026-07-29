---
name: selection-fix-count-query-drift
description: when a queue/selection query gains an exclusion or filter, check sibling COUNT queries built on the same due/date predicate for the same exclusion — otherwise the header count and the served item can disagree
metadata:
  type: feedback
---

When a fix narrows which row a selection query serves (e.g. excluding the just-graded card from Tier 3 via `pickFutureToday`), always check whether a sibling COUNT query reuses the same base predicate (e.g. `due <= dayEnd`) to build a header figure ("Due N", "Repeats N"). The count query is rarely updated in the same fix because it lives in a different `Promise.all` branch and nobody re-derives it from the selection result.

Confirmed case: `lib/review/queue.ts`'s `pickFutureToday` (2026-07-17, Tier-3 just-rated-card exclusion) changed which card Tier 3 serves, but `dueCount`/`repeatCount` in both `lib/advanced-thai/queries.ts` and `lib/review/queries.ts` still count via the old unconditional `due <= dayEnd` predicate. Result: when the only Tier-3-eligible row is the just-excluded card, the header can read "Due 1" while the empty state ("All caught up") renders — a combination that was structurally unreachable before the fix (the old code always served the sole future-due row). Self-heals once wall-clock time passes the grace window, so it's cosmetic, not a functional break — but it breaks a documented "header always matches what is served" invariant (this repo labels these "A6"-style comments).

**Why:** selection logic and count logic are computed independently (separate SQL calls in the same wave) precisely for round-trip efficiency, so there's no single source of truth forcing them to agree — a targeted fix to the selection side has no compiler/test signal that the count side drifted.

**How to apply:** when reviewing a queue/tier-selection diff, grep for every other query in the same file (and cross-file duplicates, per [[stale-parallel-range-check]]) that shares the touched predicate, and check whether its result can now diverge from what `chosenId`/`pickFutureToday` actually returns. Report the reachable combination even if told not to fix it — it's exactly the kind of interaction a plan author may not have traced through.

---
name: overdue-forecast-gap
description: When reviewing due-date forecast features, check whether overdue items (past-due) are bucketed into today or silently dropped
metadata:
  type: feedback
---

On M6 (stats view), the 7-day due forecast used `forecastKeys.includes(dueKey)` which only matched keys from today onwards. Cards with `due` timestamps before today had keys that didn't match any forecast bucket and were silently excluded. A learner with a backlog would see an artificially low "today" bar.

**Why:** Forecast logic naturally thinks in terms of "future buckets" and misses the case where an item's scheduled date is already in the past but the item still exists in the schedule table.

**How to apply:** For any feature that buckets items by a future-facing date field, ask "what happens to items whose date is already past?" If they're dropped silently (no bucket matches), flag it as MEDIUM because it produces misleading aggregate counts.

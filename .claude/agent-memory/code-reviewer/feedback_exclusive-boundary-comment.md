---
name: exclusive-boundary-comment
description: Check whether "exclusive" bound functions return last-moment-of-period vs first-moment-of-next-period, and whether SQL operator (lt vs lte) matches intent
metadata:
  type: feedback
---

When a helper is named/documented as an "exclusive upper bound" (e.g. `endOfDay`, `endOfPeriod`), verify two things independently:

1. **What value does the function return?** There are two conventions:
   - Last moment of today: `23:59:59.999` (inclusive-feels exclusive)
   - First moment of tomorrow: `00:00:00.000` next day (a true exclusive sentinel)

2. **What SQL operator consumes it?** `lte` / `<=` is **inclusive** — it admits a row whose `due` equals the boundary exactly. `lt` / `<` is exclusive.

A mismatch between the comment and either of these produces a one-off admission at the boundary point. In timezone-aware code this is particularly easy to miss because `startOfDay(tomorrow)` and `endOfDay(today) + 1ms` look identical in UTC but the comment says one thing and the operator does another.

**Why:** Found in M7 review: `endOfThailandDay` comment said "23:59:59.999 (exclusive)" but returned `00:00:00.000` next day; SQL used `lte`, so a card due at exactly Bangkok midnight was admitted. Practical impact was minimal (measure-zero window) but the documentation was misleading.

**How to apply:** In any date-range feature, always run a quick `node -e` to print what the boundary function actually returns, then check the SQL operator used against it.

---
name: streak-cap-verification
description: When an implementer documents a data-window cap on a streak/series computation, always verify the documented cap value against the actual loop bounds in the code
metadata:
  type: feedback
---

On M6 (stats view), the implementer documented the streak as "capped at 31 days" but the actual cap was 32 days (the loop ran `i=0..31` inclusive = 32 iterations). The mismatch was because the `logWindowStart = todayStart - 31*24h` day IS included in the DB query's `gte` filter, making i=31 valid data.

**Why:** Implementers tend to read "31-day window" and write "31 day cap" without accounting for off-by-one in loop bounds (0-indexed inclusive ranges).

**How to apply:** Whenever a spec deviation mentions a numeric cap derived from a data window, manually trace the loop bounds: count iterations from i=0 to i=N-1 inclusive, and verify whether the boundary day is included or excluded from the DB query's filter. If the documented cap doesn't match the code's effective cap, flag it as a HIGH finding because the disclosed limitation itself is wrong.

**Fix confirmed (M6 re-review 2026-05-23):** The correct fix is to use an already-fetched all-time query (no date filter) as the backing data source, eliminating the cap entirely. The loop bound (e.g., 365) then becomes an honest practical upper bound documented by comment. The "today not yet reviewed does not break streak" semantic should use `i===0 → continue` rather than `i===0 → break`, which is the standard SRS idiom.

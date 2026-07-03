---
name: drizzle-update-no-rowcount
description: Drizzle update() on neon-http returns no row count; migration scripts that log the result without .returning() show [] and give no confirmation of rows touched
metadata:
  type: feedback
---

When reviewing one-time migration scripts using Drizzle with the neon-http driver, check whether the `update()` call chains `.returning()`. Without it, the return value is an empty array `[]` — the operator gets no confirmation of how many rows were updated.

**Why:** neon-http's Drizzle driver does not surface a row-count in the base `update()` return. This was found in `scripts/migrate-retention.ts` (M8) where `console.log("Updated ... rows:", result)` would print `[]`.

**How to apply:** In any migration script or admin action that uses `db.update(...).set(...)`, verify `.returning({ id: table.primaryKey })` (or similar) is chained if the result is logged or acted upon. Flag as LOW if missing — the update itself is correct, but operability is degraded.

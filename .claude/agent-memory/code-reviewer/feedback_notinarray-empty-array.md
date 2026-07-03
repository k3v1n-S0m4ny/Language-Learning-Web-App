---
name: notinarray-empty-array
description: Drizzle notInArray/inArray with an empty array generates invalid Postgres SQL (NOT IN () / IN ()) and throws at runtime
metadata:
  type: feedback
---

`notInArray(col, [])` in Drizzle generates `WHERE col NOT IN ()` which is invalid Postgres SQL and throws a runtime error. Similarly `inArray(col, [])` generates `WHERE col IN ()`. Guards against empty arrays are required before calling these operators.

**Why:** Seen in refresh-seed-db.ts (2026-05-23 seed refresh): a SELECT used `notInArray(cards.headword, keep)` with no guard for an empty `keep` array. The downstream DELETE had an `if (doomed.length)` guard, but the upstream SELECT did not. The script was documented as "safe to re-run" — a claim that silently breaks if the deck file is empty or truncated.

**How to apply:** Any time `notInArray` or `inArray` is called in a Drizzle query, check whether the array argument can be empty at runtime. If it can, require an explicit early-return or guard before the query. The pattern `if (!arr.length) return;` is sufficient. Note that `seed-db.ts` in this codebase already handles this correctly for its `inArray` call (line 43-48).

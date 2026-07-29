---
name: override-vs-propagation-variable
description: When reviewing a single-account/flag override of one exposed field, verify chained/propagated state uses the real pre-override variable, not the overridden field
metadata:
  type: feedback
---

When a feature force-overrides one exposed field on an object (e.g. `unlocked: qaUnlockAll ? true : unlocked` in a loop that also propagates state to the next iteration, like unit-unlock chaining), always trace the local variable that feeds the NEXT iteration's computation separately from the field written into the pushed/returned object literal.

**Why:** A one-account QA/debug override that accidentally reads from the overridden field instead of the real computed value would silently make the override leak into chained logic for ALL accounts (e.g. a QA-only unlock override that also skips forward via `previousUnitUnlocksNext = unlocked && ...` — if `unlocked` there aliased the overridden field instead of the real per-iteration boolean, every learner's next-unit gate would be forced open the moment ONE learner triggered the override, because the loop state is shared across the whole array-building pass, not created fresh in an isolated request scope). Confirmed correct in `lib/thai/queries.ts:118,127,132` (Read-Thai QA-unlock review, 2026-07-04): the pushed summary uses `qaUnlockAll ? true : unlocked` but the propagation reads the separate `const unlocked` binding computed before the override.

**How to apply:** For any per-request override of a single exposed field in an object built inside a loop/array-reduce, grep every read of the variable name feeding both (a) the object literal and (b) any forward-carried accumulator/loop variable, and confirm they are NOT the same read when one of them must stay override-proof. This is a distinct check from [[feedback_client-supplied-correct-answer]] (which is about untrusted client input) — this is about override contamination flowing sideways into shared computation state within a single trusted server-side function.

---
name: grandfather-clause-single-site
description: A "grandfather old progress under new drill-type rule" fix applied to the unlock-gate function alone can leave sibling lifetime-mastery/weighting functions inconsistent
metadata:
  type: feedback
---

When a drill-type migration (retiring type A in favor of type B for one unit, with a
grandfather clause so `oldType OR newType` counts as mastered) is implemented, check
every function that consumes "is this item's required set satisfied," not just the one
that gates unit unlock. This codebase (Read-Thai) has (at least) two parallel
"required drill types for an item" consumers built on the same underlying reachability
map: the unit-scoped gate (`unitMasteryStats`, in `lib/thai/reachability.ts`) and the
cross-unit lifetime-mastery union (`allReachableDrillTypesForItem`, same file) used
for sampling weight (`buildDrillRound`) and "newly mastered" badges
(`submitThaiAttempt`'s `itemFullyMastered`).

**Why:** In the unit-2 flashcard pilot (letter-sound/letter-class/audio-letter →
letter-read), the grandfather clause (`masteredSet.has("letter-read") ||
masteredSet.has("letter-sound")`) was added only inside `unitMasteryStats` — correctly
fixing the unlock gate — but not mirrored into `allReachableDrillTypesForItem`. Result:
learners who fully mastered a unit-2 consonant under the old MCQ rule get
oversampled in unit 6's letter-final rounds (weighted as "not fully mastered" until
they separately clear the new flashcard for that letter) and never re-trigger a
"newly mastered" badge for that item, even though the unit itself correctly shows
100% and stays unlocked.

**How to apply:** When reviewing a grandfather/back-compat clause for a drill-type
rename or consolidation, grep for every function keyed off the same reachability data
structure (search the type name, e.g. `DrillTypeId[]` maps) and confirm the clause (or
an explicit rationale for its absence) is applied consistently everywhere "mastered"
is checked — not just at the one call site the task description highlighted (usually
the unlock gate, since that's the security/gating-sensitive one).

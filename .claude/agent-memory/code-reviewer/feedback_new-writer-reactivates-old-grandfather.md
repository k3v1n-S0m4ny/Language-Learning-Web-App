---
name: new-writer-reactivates-old-grandfather
description: a grandfather/legacy-equivalence clause added for migration purposes can be silently reactivated when a NEW feature starts writing fresh data under the old (grandfathered) key
metadata:
  type: feedback
---

A grandfather clause (e.g. `isRequiredTypeMastered`: legacy `letter-sound`
streak satisfies the new `letter-read` requirement, added purely so
learners who mastered content under an old regime don't get re-locked) is
usually reasoned about as closed/backward-looking: "this only matters for
rows written before the cutover." But the codebase enforces no such
time-boundary — the grandfather condition is a pure key-equivalence check
(`masteredSet.has("letter-sound")`), so it fires identically whether the
`letter-sound` row is three years old or was written one second ago by a
brand-new feature.

**Why:** confirmed in the Read-Thai Stage 2 Consonant Review Exam review
(2026-07-07): the exam's MCQ reinforcement path writes fresh `letter-sound`
progress for the same items whose home units were converted to
flashcard-only ("only flashcard-mode moves a unit %" was the explicit,
stated design invariant). The pre-existing letter-sound→letter-read
grandfather (added for a *different*, already-migrated cohort) silently
lets the new exam's MCQ answers satisfy that invariant anyway, contradicting
the plan's own claim in its own implementation summary ("Expected, not a
bug") — the implementer reasoned about the invariant correctly for the
*direct* case (units 2-5's own drill session no longer offers MCQ) but
missed that a different code path (the exam) reintroduces writes under the
exact key the grandfather still watches for.

**How to apply:** whenever a review finds a new feature reinforcing/writing
progress under a `drillType`, `status`, or other bookkeeping key that ALSO
has a grandfather/equivalence/migration clause pointed at it elsewhere in the
codebase (grep for the key across `is*Mastered`-shaped predicates, not just
the obvious call sites), explicitly trace whether the new writes can
reactivate that clause for learners who never went through the original
migrated cohort. This is a distinct failure mode from
[[grandfather-clause-single-site]] (which is about a SINGLE grandfather
function being consistently reused across call sites) — here the grandfather
function IS reused consistently and correctly; the bug is that its condition
was designed against an assumption ("this key is only ever written by the
old regime") that a later, unrelated feature invalidates.

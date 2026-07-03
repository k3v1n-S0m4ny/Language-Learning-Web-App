---
name: cross-unit-mastery-deadlock
description: When a unit-unlock system requires cross-unit/cross-session drill types for a unit's own percentMastered, check for circular unlock deadlocks, not just per-item reachability
metadata:
  type: feedback
---

In gated-progression course apps (Read-Thai course, M12), a "reachability"
invariant that only checks "is this item reachable via *some* drill type"
(or "does *some* code path exist to answer it") is NOT sufficient to
guarantee the unlock chain is actually satisfiable. A second, distinct class
of bug exists: a unit's own `percentMastered` (which gates the *next* unit's
unlock) can structurally require a drill type that is only ever offered
inside a *different, later* unit's own drill session — creating a circular
dependency where the earlier unit can never hit the unlock threshold because
the skill lives in a unit that itself won't unlock until the earlier one
does. M12 shipped `allReachableDrillTypesForItem` as an unconditional union
across ALL drilled units (e.g. a unit-2 consonant's "letter-final" skill,
only drillable from a unit-6 session) and used that same full cross-unit set
as the requirement for the unit's own local percentMastered — this makes
units 3-9 permanently unreachable (max ~11% on unit 2), independent of any
audio/content gating. This was NOT caught by the seed-time
"findUnreachableDrillableIds" invariant because that invariant only checks
per-item "reachable at all," not "achievable given unlock ORDER."

A related but separate instance: a drill type marked "structurally
reachable" for an item that can PERMANENTLY never produce a scoreable
question (e.g. `audio-form` required for two "hidden vowel" items with no
written form to ever synthesize audio from) caps that unit below the unlock
threshold forever, blocking everything downstream — same root cause
(reachability != achievability) applied to content/audio permanence rather
than unit-ordering.

**Why:** This is the third+ recurrence of a bug class ("denominator counts
an item with no real path to being answered") that M11 review already
caught and fixed twice for this same course. Both prior instances were
single-unit ("this item is never a drill subject at all"); M12's version is
subtler because the item IS reachable somewhere, just not from a unit the
learner can access yet, or not ever for a permanent content reason.

**How to apply:** Whenever reviewing a mastery/unlock system with any kind
of cross-unit, cross-session, or cross-drill-type aggregation feeding into a
gating percentage, independently compute (don't trust the implementer's own
invariant script) — for each unit — "what is the max achievable percentage
using ONLY the drill types actually offered inside that unit's own
session," and separately, "does every structurally-required drill type for
every item have an actual, permanent, non-null path to producing a
scoreable question." Do this via a standalone script importing the shipped
pure functions directly, not by trusting a green "[reachability] OK" log
line — that log line only proves per-item reachability, not per-unit
achievability under the real unlock order. See
[[feedback_probe-table-completeness]] for the related principle of checking
all states/combinations rather than trusting a summary pass/fail.

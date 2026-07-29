---
name: retake-status-toggle-loses-permanence
description: a single-row-per-key table whose status toggles in_progress/completed cannot serve as a "permanently unlocked" signal once retakes are allowed
metadata:
  type: feedback
---

When a retakeable checkpoint/exam persists exactly ONE row per (learner, key) and
toggles `status` between `in_progress`/`completed` (chosen specifically so a
retake doesn't violate a unique index — see [[grandfather-clause-single-site]]
for a related single-writer-of-truth failure mode), any downstream gate that
reads `status === "completed"` as "has this ever been cleared" will silently
re-lock on every retake, because starting a retake flips status back to
`in_progress` (and often nulls `completedAt` too, compounding it).

**Why:** confirmed in the Read-Thai Stage 2 Consonant Review Exam review
(2026-07-07): `startOrResumeExam` UPDATEs the exam session row's `status` to
`in_progress` and `completedAt` to `null` the moment a learner reopens the
exam to review it — even before they've answered a single card. A downstream
`getUnitSummaries`-style gate computing `consonantsExamCleared = status ===
"completed"` immediately flips to false, re-locking whatever the first clear
had permanently unlocked, until the retake finishes. This is a hard violation
of any "first clear unlocks X permanently" contract.

**How to apply:** whenever a review encounters a retakeable checkpoint (exam,
mastery test, one-time-unlock quiz) backed by a row that toggles between an
"in progress" and "done" status, explicitly check whether ANY consumer treats
that live status as a permanent/historical signal. The correct pattern is a
separate STICKY field (e.g. `completedAt` that is only ever set, never
re-nulled, or a distinct `firstClearedAt` column) that survives every future
retake — the live `status`/`state` can and should still reset per-retake for
progress-display purposes (Continue/Review/cleared-count), but gates that
promise permanence must read the sticky field, not the live one. Also check
whether the page/action that starts a retake runs concurrently (`Promise.all`)
with a read of the gate elsewhere in the same request — the race can make the
bug's user-visible symptoms (e.g. a false "unlocked!" celebration replaying)
non-deterministic, which can make it harder to reproduce on casual testing but
does not make it less real.

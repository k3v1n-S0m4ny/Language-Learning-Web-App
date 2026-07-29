---
name: redundant-sibling-refetch
description: composing several "read state" server actions in one page render can silently multiply an expensive shared computation (e.g. getUnitSummaries) 2-3x per request
metadata:
  type: feedback
---

When a page/component composes multiple small read-only server actions (e.g.
`getConsonantExamState`, `startOrResumeExam`, `getUnitSummaries`) via
`Promise.all` for parallelism, it's easy to miss that one or more of those
actions ALREADY calls another one of the siblings internally — turning what
looks like N independent cheap reads into N re-computations of the same
expensive shared read.

**Why:** confirmed in the Read-Thai Stage 2 Consonant Review Exam review
(2026-07-07): `getConsonantExamState` internally calls `getUnitSummaries` (via
`isConsonantExamOpen`); `thai-home.tsx` calls `getUnitSummaries` directly AND
`getConsonantExamState` (which calls it again) in the same `Promise.all`;
`app/thai/exam/page.tsx` compounds further by calling `getConsonantExamState`
first and THEN `Promise.all([getUnitSummaries, startOrResumeExam])` where
`startOrResumeExam` also calls `getUnitSummaries` internally — three full
re-derivations of the learner's mastery state (each its own DB round trips)
in one page render. Not a correctness bug, but real, easily-missed
performance debt, especially ironic in a codebase whose own comments
elsewhere explicitly justify reading a value "once" for cheapness.

**How to apply:** when reviewing a page/component that fans out several
server-action reads via `Promise.all` (or sequential awaits), grep each
action's own implementation for calls to the OTHER actions being composed
alongside it. If a shared expensive read appears more than once in the call
graph for a single request, flag it and recommend threading the already-
fetched value through instead of letting each helper independently re-fetch.

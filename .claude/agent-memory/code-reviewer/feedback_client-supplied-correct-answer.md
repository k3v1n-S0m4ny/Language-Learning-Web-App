---
name: client-supplied-correct-answer
description: MC-quiz/drill server actions must recompute the correct answer server-side from itemId+drillType, not accept it as a client parameter, even when learnerId is properly session-derived
metadata:
  type: feedback
---

When reviewing a server action that scores a multiple-choice or quiz-style answer, check whether the "expected"/correct value is a parameter passed in from the client, versus looked up server-side from the item's row given itemId (+ drillType/question type).

**Why:** Found in M11 Read-Thai review (`lib/thai/actions.ts::submitThaiAttempt`): `learnerId` was correctly derived from the session (the specific thing the task brief asked to check), but `expected` (the correct answer) was a client-supplied parameter — sourced from data the server had already shipped to the browser as part of the drill-round payload. `correct = expected === chosen` is therefore a comparison of two client-controlled values with zero server-side verification against the DB. A user (or buggy client) can force every attempt to score as correct via a raw call to the action, corrupting mastery/streak state and any downstream analytics. This is easy to miss because "learnerId from session, not client input" is the checklist item everyone remembers — the *answer/correctness* value is just as much client input and is equally exploitable, but doesn't trigger the same reflexive check.

**How to apply:** For any drill/quiz/flashcard-grading server action, treat every value used to compute "was this right" as untrusted client input unless it's re-derived from a DB lookup keyed by itemId inside the action itself. Flag it even in single-user/personal apps where exploit motive is low — it's still a data-integrity gap (stats/mastery become meaningless under a compromised or buggy client), which matters for anyone building analytics (failure heatmaps, accuracy-by-unit, etc.) on top of that data.

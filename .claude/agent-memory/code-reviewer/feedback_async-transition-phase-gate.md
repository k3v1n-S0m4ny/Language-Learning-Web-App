---
name: async-transition-phase-gate
description: In useTransition async callbacks with two sequential awaits, state cleared before the 2nd await must be gated by a combined phase+data check, not by the data alone
metadata:
  type: feedback
---

When a client component's `startTransition(async () => {...})` callback does two
sequential server-action awaits (e.g. submit-answer, then fetch-summary-on-completion),
any `setState` calls between the two awaits commit as their own render **before** the
second await resolves — React's automatic batching only covers synchronous work, it
does not span an `await`. If the first batch of state changes (e.g. emptying a queue,
advancing an index to one-past-the-end) removes the data the main render path depends
on (`current = queue[0]`), and the component gates its "done" screen on the *result* of
the second await alone (`if (summary) {...}`) rather than on a phase flag set in the
same tick as that result, there is a real intermediate render where the "in-progress"
branch executes with no current item — a crash if that branch doesn't guard for it.

**Why:** Found in the Read-Thai unit-2 flashcard pilot
(`components/thai/drill/flashcard-session.tsx`): `setQueue(rest)` (rest=[]) commits
before `await getUnitProgressSnapshot(...)` resolves and `setSummary(snap)` runs,
so `current = queue[0]` is `undefined` and the unconditional `current.glyph` JSX
throws — on essentially every real completion, since network latency guarantees the
intermediate render happens. The sibling component `drill-session.tsx` avoids this
exact bug by setting `setSummary(snap)` and `setPhase("summary")` **together**, in the
same tick after the same kind of await, and gating the summary view on
`phase === "summary" && summary` (both), never on `summary` alone.

**How to apply:** When reviewing any multi-step client drill/quiz/flashcard loop with
`useTransition` + a "last item" completion branch that fetches a summary via a second
await, explicitly trace what state is empty/undefined in the render that happens
*between* the two awaits. Check whether the "done" screen is gated by a value set in
the same tick as the emptying update (a `phase` flag, or gating on the *combination* of
"queue empty" AND "summary loaded") vs. gated on the fetched value alone. If the two
are set in different microtask ticks, demand either a reordering (fetch before
emptying) or an explicit "finishing" guard.

---
status: COMPLETE
updated: 2026-05-23
---

# Review Summary — Milestone 7: Same-day requeue for failed / learning cards

## Result
PASS (with one MEDIUM documentation inaccuracy and one LOW probe-table gap; no blocking issues)

## Files Reviewed
- `lib/review/time.ts` (working-tree change: `endOfThailandDay` added)
- `lib/review/queries.ts` (working-tree change: import updated, `fetchRawCounts` and `getStudyScreenData` predicates broadened)
- `lib/review/stats.ts` (read to confirm it imports from `time.ts` cleanly — no change)
- `lib/review/types.ts` (read to confirm `SessionCounts.dueCount` shape — unchanged)
- `components/session-header.tsx` (read to confirm dueCount consumer — unchanged)
- `app/page.tsx` (confirmed unchanged via `git diff`)
- `lib/review/actions.ts` (confirmed unchanged via `git diff`)
- `lib/review/scheduler.ts` (confirmed unchanged via `git diff`)

## Findings

### CRITICAL
None.

### HIGH
None.

### MEDIUM

- **`lib/review/time.ts:22`** — The JSDoc comment says the function returns "23:59:59.999 Asia/Bangkok" but the implementation returns `startOfThailandDay(now) + 24h`, which is exactly `00:00:00.000` of the **next** Bangkok day (17:00:00.000 UTC). The comment also describes the bound as "exclusive" yet the SQL callers use `lte` (i.e. `<=`), which is inclusive. The net effect is that a card whose `due` field equals exactly `00:00:00.000 Bangkok tomorrow` is admitted into today's session.

  Verified with `node -e`:
  ```
  endOfThailandDay(new Date('2026-05-23T12:00:00Z'))
  // => 2026-05-23T17:00:00.000Z  (Bangkok midnight tomorrow, not 23:59:59.999)
  lte(due, 17:00:00.000Z) where due = 17:00:00.000Z => TRUE (included)
  ```

  **Practical severity is low**: ts-fsrs computes `due = now + interval_ms` (no midnight-snapping), so a card lands at exactly Bangkok midnight only if reviewed at exactly `23:59:00.000 Bangkok` (Again, +1 min) — a one-second window. When it does occur the card is served back within the same session rather than rolling to tomorrow as A11 ("acceptable if it rolls to tomorrow") anticipates. The UX effect is actually better than the spec, not worse. Nevertheless the comment is factually wrong and will mislead future maintainers.

  **Suggested fix direction**: Either (a) change the comment to say "exclusive upper bound = start of next Bangkok day" and note the lte-includes-boundary behaviour, or (b) subtract 1ms from the return value to make the function truly return the last millisecond of today and align comment with code. Option (a) is safer.

### LOW

- **`lib/review/queries.ts:49-56` (A5 probe table)** — The embedded probe table covers `{New, Learning, Review}` × `{Again, Hard, Good, Easy}` but omits the fourth FSRS state: `Relearning`. The A5 requirement says the implementer "MUST verify" all relevant paths. A live probe run during this review confirmed the missing rows:

  | Card state   | Rating | Result state | Due offset | Within same day? |
  |---|---|---|---|---|
  | Relearning | Again | Relearning | +10 min | YES — correctly included |
  | Relearning | Hard  | Relearning | +15 min | YES — correctly included |
  | Relearning | Good  | Review     | +1 day  | NO — correctly excluded  |
  | Relearning | Easy  | Review     | +1 day  | NO — correctly excluded  |

  The logic is correct — no bug — but the comment table is incomplete. A future reader auditing the comment against the spec will notice the gap and have to re-probe.

  **Suggested fix direction**: Add the four Relearning rows to the A5 comment table.

## Assertions Checked

- **A1** PASS — `dueState` subquery now uses `lte(due, dayEnd)` with `orderBy(asc(due)).limit(1)`. After Again (+1 min), the just-failed card's due is greater than all currently-overdue cards, so it sorts to the back and is served after them. If it is the only eligible card, `dayEnd` includes it immediately.
- **A2** PASS — Any same-day learning/relearning step (Learning Again/Hard/Good, Relearning Again/Hard) produces a due within +15 min, well inside `endOfThailandDay`. All are covered by the broadened predicate.
- **A3** PASS — All graduated Review intervals (Hard +27d, Good +39d, Easy +66d, Relearning-Good/Easy +1d) land after `endOfThailandDay`. Probe confirmed. Learning/Easy (+24h) also lands after `endOfThailandDay` for any active session time (verified by calculation).
- **A4** PASS — `endOfThailandDay` is implemented as `startOfThailandDay(now).getTime() + 24h`, reusing the existing helper with no second hand-rolled offset. Exported from `lib/review/time.ts`, imported cleanly in `queries.ts`.
- **A5** PASS (with LOW gap noted) — Comment present, probe findings embedded. The conclusion (endOfThailandDay covers exactly {Learning, Relearning} intraday steps) holds. The Relearning rows were not originally probed but a live re-probe confirms correctness. The comment "23:59:59.999" is inaccurate (MEDIUM finding above).
- **A6** PASS — `fetchRawCounts` `dueCount` uses `lte(reviewStates.due, dayEnd)`, the same `dayEnd` as the `dueState` subquery in `getStudyScreenData`. Predicates are identical — header and served card cannot diverge.
- **A7** PASS — `app/page.tsx` renders `EmptyState` only when `card` is null. After Again, the failed card's `due` is within `dayEnd`, so `dueState` returns it and `card` is non-null. EmptyState will not appear while a failed card is eligible.
- **A8** PASS — Due-first-then-new ordering is unchanged (`dueCardId ?? newCardId`). `newRemaining` logic and the Thailand-day new-card cap (`sql createdAt >= dayStart`) are untouched.
- **A9** PASS — `lib/review/actions.ts` and `lib/review/scheduler.ts` have zero working-tree changes (confirmed via `git diff`). FSRS math, review-log writes, and auth/validation are untouched. All counts come from real DB queries.
- **A10** NOT REVIEWED — Build/lint/tsc runs were reported by the implementer (all exit 0); I did not re-run them as that is outside the reviewer's scope. Residual risk: environmental build flake.
- **A11** PASS with caveat — Card due at `startOfThailandDay` (overdue) and card due 1ms before midnight both pass `lte(due, dayEnd)` correctly. Midnight-crossing Again step: reviewed at 23:59:00 Bangkok → due at 00:00:00.000 Bangkok tomorrow = exactly `dayEnd` → passes `lte` → served today rather than tomorrow. The plan says "acceptable if it rolls to tomorrow — document the edge." The edge is neither documented in code nor does the code roll it tomorrow; the card is served back today. This is better UX than the spec but the A11 documentation requirement is not met. The MEDIUM finding above covers this.

## Commands Run

- `git diff -- lib/review/time.ts lib/review/queries.ts` — confirmed exact working-tree changes
- `git status --short` — confirmed only `lib/review/queries.ts` and `lib/review/time.ts` have source changes; all other modifications are plan/handoff docs
- `git diff -- lib/review/actions.ts lib/review/scheduler.ts app/page.tsx` — exit 0, no output (confirmed unchanged)
- `node -e` boundary math probe — confirmed `endOfThailandDay` returns `00:00:00.000` next Bangkok day, not `23:59:59.999`
- `node -e` A11 near-midnight learning step probe — confirmed midnight-crossing Again step is included (not rolled to tomorrow)
- `node --input-type=module` ts-fsrs Relearning probe — confirmed Relearning+Again/Hard stay intraday; Relearning+Good/Easy graduate to Review (+1 day, excluded)

## Residual Risk

1. **Comment accuracy** (MEDIUM above): The `endOfThailandDay` JSDoc says "23:59:59.999" and "exclusive" but the function returns `00:00:00.000` next day and the SQL operator is inclusive. A future maintainer who reads the comment and writes a range check using `<` instead of `<=` will get a different boundary than intended. Should be fixed before A10 re-run.

2. **A5 probe table incompleteness** (LOW): The Relearning state rows are absent from the embedded comment table. Logic is correct but documentation doesn't fully match the spec's "MUST verify" requirement.

3. **A10 not independently verified**: Build/lint were reported by the implementer only. If the project has CI this is not an issue; if not, a one-time QA re-run of `npx tsc --noEmit && npm run build` would close it.

4. **No automated tests**: This feature has no regression tests. A future change to `endOfThailandDay` or the `lte` predicate would not be caught automatically. Out of scope for this milestone but worth noting for the backlog.

## Procedure Compliance

- Plan (`active-plan.md`) consulted before review: yes
- Implementation summary read: yes
- All changed source files read in full: yes
- Assertions A1–A11 individually checked: yes (A10 deferred to QA per scope)
- No source files edited: yes
- Review summary written: yes

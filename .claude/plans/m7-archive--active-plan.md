---
status: COMPLETE
updated: 2026-05-23
---

# Active Plan — Milestone 7: Same-day requeue for failed / learning cards (Validation Contract)

Fix a user complaint: rating **Again** does not bring the card back within the session. Root
cause confirmed in code: the study queue selects the earliest card where `due <= now`
(`lib/review/queries.ts` — the `dueState` subquery + `fetchRawCounts`). ts-fsrs schedules an
**Again** (and short **Hard**) on a new/learning card with a same-day learning step
(`due ≈ now + ~1 min`), which is *in the future*, so the `due <= now` filter excludes it: the
just-failed card vanishes for ~1 real minute (or the session shows "done" if it was the last
card). M1–M6 are COMPLETE and live (prod `a482c58`); this changes only queue **selection** and
the header **counts**, not the FSRS scheduling math or the review-log writes.

**Plan root:** `c:\Users\User\Software Projects\Language-Learning-App\.claude\plans\`
**Project-context:** `CONTEXT.md` (glossary), `m6-archive--*` (prior milestone handoffs),
`lib/review/{queries,scheduler,actions,time,types}.ts`, `app/page.tsx`, `lib/db/schema.ts`.
**AGENTS.md rule:** this is Next.js 16 — read `node_modules/next/dist/docs/` before writing
Next code. **Global rules:** no placeholders/fake data; verify third-party behavior (here, the
actual ts-fsrs scheduling shape) before relying on it; simple > clever.

## Desired behavior (from the user)
- **Again → comes back soon, after a few cards** (Anki-style learning queue), and immediately
  if it is the only card left. (User chose "Soon, after a few cards.")
- **Applies to any same-day step**, not just Again — e.g. a short **Hard**/**Good** learning
  step that schedules the card for later *today* should also be eligible to resurface in the
  current session. (User chose "Yes, any same-day step.")

## Assertions (must all hold)

### Core requeue behavior
- **A1** — After rating **Again** on a card, that card is served again within the same session
  without waiting for wall-clock time to pass: if it is the only eligible card it reappears
  immediately; if other genuinely-due cards remain it reappears **after** them (it does not
  jump to the front). Verified by driving the real queue selection.
- **A2** — The same holds for any rating whose ts-fsrs result schedules the card to be due
  **later the same Thailand-day** (learning/relearning steps), not only Again.
- **A3** — A card scheduled by ts-fsrs to be due on a **future day** (a graduated multi-day
  interval) is **NOT** pulled forward into today's session — it disappears until its due day,
  exactly as before. (No regression to normal review intervals.)

### Selection mechanism
- **A4** — Queue eligibility uses a **Thailand-day** upper bound, reusing the existing
  `startOfThailandDay` boundary (add an `endOfThailandDay`/equivalent to `lib/review/time.ts`;
  do not hand-roll a second tz offset). Selection stays ordered by `due` ascending so overdue
  cards precede same-day learning steps (this is what makes A1's "after a few cards" hold).
- **A5** — The "due" definition change is justified in a code comment: ts-fsrs Review-state
  intervals are ≥ 1 day, so `due <= endOfThailandDay(now)` pulls in exactly *overdue cards +
  same-day learning/relearning steps* and never a normal Review card due on a later day. The
  implementer MUST verify this assumption against the **installed** ts-fsrs (learning_steps /
  enable short-term scheduling) by reading `node_modules` and/or a small real-data probe; if
  Review intervals can be intra-day in this config, fall back to an explicit FSRS-state filter
  (`state ∈ {Learning, Relearning}`) and record the finding.

### Counts / UI consistency
- **A6** — The header counts and the served card stay **consistent**: the study screen never
  shows a card while the header reads 0 due / 0 new (today's todo). Whatever predicate selects
  the card also feeds `dueCount` (or `dueCount` is redefined to "due today" to match). State
  the chosen count semantics in the handoff.
- **A7** — The **EmptyState** ("done") appears only when there is genuinely nothing eligible
  today **and** no new card within the daily cap — i.e. failing the last card does NOT show the
  done screen; the failed card shows again.
- **A8** — New-card behavior is unchanged: the daily new-card cap (Thailand-day) and the
  due-first-then-new ordering still hold; a same-day learning step is preferred over
  introducing a brand-new card (you finish learning what you started before adding more).

### Quality
- **A9** — Every count and selected card comes from real DB queries; no placeholder, sample,
  or hard-coded card. FSRS math, the review-log writes, and `submitReview` auth/validation are
  unchanged.
- **A10** — `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all pass (exit 0). Build
  fetches Google Fonts; a font-fetch failure is environmental — retry and note it.
- **A11** — Round-trip / boundary cases hold without crash or wrong results: a card due exactly
  at `startOfThailandDay`, a card due 1 ms before midnight, a learning step that crosses
  Thailand-midnight (acceptable if it rolls to tomorrow — document the edge), and a learner
  with zero cards (clean EmptyState).

## Feature → assertion mapping (implementation outline)
1. **`lib/review/time.ts`** (A4) — add `endOfThailandDay(now)` (or `startOfThailandDay(now) +
   24h`, exclusive) next to the existing boundary helper; export it.
2. **`lib/review/queries.ts`** (A1–A8) —
   - `getStudyScreenData`: change the `dueState` subquery's predicate from `lte(due, now)` to
     `lte(due, endOfThailandDay(now))`, keep `orderBy(asc(due)).limit(1)`. Due-first-then-new
     ordering and the new-card cap stay as-is (A8).
   - `fetchRawCounts` / `toCounts`: align `dueCount` with the same "due today" predicate so the
     header matches what is served (A6). Keep `newRemaining` logic.
   - Add the justifying comment + the verified ts-fsrs assumption note (A5).
3. **No client changes expected** — `app/page.tsx` already renders `ReviewSession` vs
   `EmptyState` off `card`; correct selection makes A7 fall out. Confirm `refresh()` in
   `submitReview` still re-runs selection (it does).
4. **Verify ts-fsrs scheduling shape** (A5) — read the installed ts-fsrs config/defaults; if
   needed, a throwaway `node -e` probe with a real empty card to confirm Again/Hard produce a
   same-day due and Good/Easy graduate to ≥ 1 day.

## Done criteria
- A1–A11 hold; handoff chain written (`implementation-summary.md` → `review-summary.md` →
  `qa-summary.md`) with canonical frontmatter; `active-plan.md` flipped to COMPLETE.
- Behavioral assertions confirmed by driving the real selection logic locally (the full
  click-through needs live OAuth + prod DB, accepted as in M6).

## Out of scope
- Changing FSRS parameters, learning_steps, or request_retention; a settings UI for them.
- A client-side in-memory session queue / "learn-ahead" limit configuration.
- Interday vs intraday due model for **Review** (graduated) cards — only same-day learning
  steps are pulled forward; graduated cards keep day-boundary behavior.
- Deploying — decide separately after QA (M6 deploy is already live).

## Notes / decisions
- "After a few cards" is achieved purely by `due ASC` ordering: a failed card's `now+1m` due
  sorts behind all currently-overdue cards, so they are served first; when it is the only card
  left it returns immediately (user accepted this).
- Single-card repeat-loop: hammering Again on the last remaining card reshows it each time —
  intended and accepted.

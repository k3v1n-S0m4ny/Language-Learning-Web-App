# Implementation summary — Quizlet step ladder, Phase 4 (Mandarin)

Date: 2026-07-29 | Status: COMPLETE (Phase 4 of 5)

Branch `fix/tier3-just-rated-repeat`, working DB = Neon branch `quizlet-ladder`
(`br-solitary-queen-apsbjzle`, endpoint `ep-lucky-fire-*`). **Production (`ep-calm-frost-ap4nd591`)
was never touched — no migration was run, and every command in this session was pointed at the
branch explicitly.**

Phases 1–3 stand as delivered (ladder engine, schema + migration, Advanced Thai). This session was
Phase 4 and the deletions that Phase 5 had been holding.

## Completed work

### The Mandarin ladder (`lib/review/*`)

- **`types.ts`** — `RatingValue` and `IntervalHints` deleted. `StudyCard` gains `step`, `format`,
  `options?` and `demotions` (replacing `lapses`). `SessionCounts` is now `remaining` / `repeats` /
  `gate`, the same reading of a round the Advanced Thai header uses.
- **`hsk-gate.ts`** — threshold 80 → **100**. `isMasteryLog` (a scan of append-only `review_logs`)
  replaced by `isMastered(step)`, read off `review_states.step`. `GateCardRow` collapses `seen` and
  `mastered` into one nullable `step` — a row exists iff the card has been introduced.
  `computeGate(rows, storedUnlocks)` now takes the recorded unlocks and returns `bandsToPersist`;
  `firstEligibleUnseenId` became `eligibleUnseenIds` because a round admits a batch, not one card.
- **`queries.ts`** — the three-tier queue is gone. Round construction mirrors
  `getAdvancedRoundData`: batch = `due <= now` + unseen up to the remaining daily cap, ordered by
  `lib/ladder/round.ts`. New: `expectedAnswerFor`, `isMultipleChoice`, band-biased `optionsFor`
  (`IS NOT DISTINCT FROM` so a null band draws against other null-band cards rather than nothing).
  Mandarin now honours the `bonus_new_cards` top-up, which was previously Advanced-Thai-only.
- **`actions.ts`** — `submitReview(cardId, rating)` → `submitSelfGrade(cardId, step, passed)` and
  `submitChoice(cardId, step, choice)` over a shared `loadForAnswer` + `record`, exactly the shape
  `lib/advanced-thai/actions.ts` uses. Added `addNewCardsToday` (Mandarin's top-up) and
  `syncHskUnlocks`. Neither submit action calls `refresh()`.
- **`stats.ts`** — `mature` now reads `interval_rung >= 3` (27d, the first rung past the 21-day SRS
  convention the FSRS figure used). The rating breakdown is replaced by a live ladder spread plus an
  interval histogram; leeches read `demotions`.
- **`time.ts`** — `endOfThailandDay` removed. It existed solely to widen the queue past `now` for
  FSRS intraday learning steps; nothing is scheduled in minutes any more. It had no callers left.

### Shared ladder additions

- `lib/ladder/intervals.ts` — `MATURE_RUNG` / `isMature`.
- `lib/ladder/ladder.ts` — `LEECH_DEMOTIONS` (10) / `isLeech`, successor to the FSRS lapse
  threshold. Set higher than Anki's 8 because a demotion is a cheaper unit: it counts misses at
  every step including a card's first climb, where an FSRS lapse could not fire at all.

### Components

- **`review-session.tsx`** — dispatches on `card.format`. MC at step 1 via the shared
  `components/ladder/mc-question.tsx`; the existing 3D flip card at steps 2–3, reversed on the
  produce step; `PassFailRow` replaces the four rating buttons.
- **`card-front.tsx`** — takes `direction`, so a produce step shows the English and asks for the
  hanzi. Only the front flips; the back was already the full answer.
- **`card-back.tsx`** — leech badge reads `demotions`.
- **`session-header.tsx`** — Due/New → Left/Repeats.
- **`empty-state.tsx` → `mandarin-round-complete.tsx`** — wraps the shared `RoundComplete` and keeps
  the band-locked panel, which is the one thing Advanced Thai has no analogue for. The confetti
  one-shot carries over unchanged.
- **`stats/rating-chart.tsx` → `stats/distribution-chart.tsx`** — one generic labelled bar chart,
  used for both the ladder spread and the interval histogram.
- `stats/hsk-ladder.tsx` copy now says "at the top step", not "mastered".

### Deleted

`lib/review/scheduler.ts`, `lib/review/config.ts`, `lib/review/queue.ts`, `lib/review/queue.test.ts`,
`components/rating-buttons.tsx`, `components/empty-state.tsx`, `components/stats/rating-chart.tsx`,
and `ts-fsrs` from `package.json` (`npm install` → `removed 1 package`).

## Design decisions made during implementation

**The 100% bar is only safe because unlocks are stored, so the write has to happen somewhere a
render cannot.** `syncHskUnlocks` runs from the submit action, and only when a card has just been
promoted INTO the top step — the one event that can raise a band's mastered count. That keeps the
515-row deck scan off the other four answers of every card's climb, and keeps the write out of the
read path entirely.

**An unlock earned from an EMPTY band below is deliberately not persisted.** `bandPasses` lets an
empty band pass so it cannot become an infinite wall, but writing that down would mean seeding that
band later could never gate anything — the door above it would already be nailed open. Empty bands
still unlock live; they just do not become permanent facts. Unit-tested both ways.

**Mastery became a LIVE signal where it used to be sticky.** Reading `review_states.step` means a
demotion out of the top step does reduce a band's mastered count — the opposite of the append-only
`review_logs` read it replaces. That is safe only because the door it opened is a separate stored
fact. The sticky thing is now the `hsk_unlocks` row, not the mastery.

**`GateCardRow.seen` was merged into `step`.** A `review_states` row exists if and only if the card
has been introduced, so two fields could disagree and only one can be true.

**MC distractors use `IS NOT DISTINCT FROM`, not `=`.** `hsk_level = NULL` is UNKNOWN and would hand
an unlevelled card an empty option pool. No such card exists in the deck today (bands are 208/69/55/
52/33/58/40), which is exactly why it would have gone unnoticed.

## Left undone

- **Phase 5 — the production migration.** Deliberately not started: it wipes real learner data
  (75 `review_states`, 346 `review_logs`, 65 `at_review_states`, 129 `at_review_logs`) and is an
  owner decision. Nothing else blocks it.
- **The branch still carries the unmerged `pickFutureToday` work** (commit `3bf34d4`,
  `lib/review/queue.ts`) that this redesign deletes. Owner decides whether it lands on `main` first.
- **No colocated test for `lib/review/queries.ts` / `actions.ts`.** Both import the database, so
  they cannot run under `tsx --test`; they are covered by the branch simulation below instead. The
  pure logic they call (ladder, round, distractors, gate) has 73 unit tests.

## Commands run

| command | exit | result |
|---|---|---|
| `npx tsc --noEmit` | **0** | clean — first time since Phase 2 |
| `npx eslint app components lib scripts seed` | **0** | clean |
| `npx tsx --test lib/ladder/*.test.ts lib/review/*.test.ts` | **0** | `tests 73 / pass 73 / fail 0` |
| `npx next build` | **0** | `✓ Compiled successfully in 7.3s`, 10 routes |
| `npm install` | **0** | `removed 1 package` (ts-fsrs) |
| `$env:DATABASE_URL=<branch>; npx tsx .artifacts/sim-mandarin-round.mts` | **0** | `ALL CHECKS PASSED` (41 checks) |

### The branch simulation (`.artifacts/sim-mandarin-round.mts`, gitignored)

Reads go through the production `getStudyScreenData` / `getHskGate`; the write mirrors the action's
`record()` line for line, because `"use server"` + `next/cache` cannot be imported under tsx. It
refuses to run unless `DATABASE_URL` contains `ep-lucky-fire`. Verified:

- A 3-card round of new cards runs **exactly 15 answers**, and one card's climb is
  `recognise-mc, recognise-mc, recognise-card, recognise-card, produce-card`.
- `Left` holds at 3 through the climb and reaches 0 only at the finish line (trace
  `3 3 3 3 3 3 3 3 3 3 3 3 3 2 1 0`) — the corrected cards-left definition, not asks-left.
- Every card exits at step 3, `interval_rung = 1`, `due = +1d`.
- The MC step ships exactly 4 unmarked strings, the correct answer among them; the flashcard steps
  ship none.
- Failing at the top step → `step 3 → 2`, `rung → 0`, `demotions 1`, `due = now`, and the round
  reopens with that one card asked a rung easier.
- **The gate trap, end to end:** with 207/208 band-1 cards at the top step band 2 is locked; driving
  the 208th up unlocks it and offers band 2 for persisting; the row is written; a newly seeded
  band-1 card then drops band 1 below 100% and **band 2 stays open**. Control: the same rows with
  the stored row removed re-lock band 2 — i.e. the persistence is doing the work, not an accident.
- Branch restored to 0 `review_states` / 0 `review_logs` / 0 `hsk_unlocks` / 515 cards.

## Procedure compliance

Read `active-plan.md`, the full approved plan, and the Phase 3 reference implementations
(`lib/advanced-thai/{actions,queries}.ts`) before writing. No placeholders, stubs or fake data. No
migration generated or run. `active-plan.md` updated. Not yet reviewed — `code-reviewer` has not run
on Phase 4.

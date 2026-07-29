# ACTIVE — Quizlet-style step ladder, replacing FSRS

Full approved plan: `C:\Users\User\.claude\plans\i-want-to-change-imperative-badger.md`
Neon working branch: **`quizlet-ladder`** — `br-solitary-queen-apsbjzle`, project `blue-queen-01978548` (`neon-cyan-forest`)

## Why

Both FSRS courses are a single flip card, four buttons, one `ts-fsrs` state per
`(learner, card)`, and an infinite drip with no finish line. No direction concept exists —
Mandarin is only Chinese→English, Advanced Thai only Thai→English, and the Learner is never
asked to produce the target language.

Replacing that with Quizlet's teaching shape: cards climb a ladder of progressively harder
formats, sessions are bounded rounds with a completion moment, grading is binary pass/fail,
and scheduling is a deterministic hand-tuned interval table rather than a memory model.

## Locked decisions

- Scheduler → deterministic step-interval ladder; `ts-fsrs` removed entirely.
- Unit → one row per `(learner, card)`; a `step` column advances.
- Grading → binary pass/fail everywhere (MC auto-graded, flashcards self-graded).
- Promotion → two consecutive passes. The top step needs one pass and buys an interval rung.
- Climb → a new card may climb its whole ladder in one session.
- Re-queue → full cycle: every unfinished card served once per pass.
- Failure → demote one step, reset rung to 0, increment `demotions`. **No demotion cap.**
- Intervals → 3× growth: 1, 3, 9, 27, 81, 243, 729 days (capped).
- Round → all due + capped new; "+20 new cards today", repeatable, expires at Bangkok midnight.
- New cards → 10/day baseline + 20 per click.
- HSK gate → kept, raised to **100%**; mastered = reached top step; unlocked bands stay unlocked.
- Advanced Thai grammar → **deleted** (rows, seed JSON, extractor, component, `kind` enum).
- Practice mode → read-only drill; random seen cards at current step; writes nothing.
- Stats → rebuilt on step distribution; leech badge → `demotions`.
- Migration → wipe the four FSRS tables; everyone restarts at step 1.
- Read-Thai → **untouched**.
- Rollout → Advanced Thai first, then Mandarin.

### Ladders

| key | steps | exposures to graduate |
|---|---|---|
| `mandarin` | recognise-mc → recognise-card → produce-card | 5 |
| `advanced-thai:vocab` | recognise-mc → recognise-card → produce-mc → produce-card | 7 |
| `advanced-thai:phrase` | recognise-card | 1 |

## Live data (measured on the branch, 2026-07-29)

| table | count |
|---|---|
| `cards` (Mandarin) | 515 |
| `review_states` | **75** |
| `review_logs` | 346 |
| `at_cards` | 340 — vocab 79, grammar 25, phrase 236 |
| `at_review_states` | **65** |
| `at_review_logs` | 129 |
| `thai_progress` (untouched) | 170 |

Corrects the approved plan's estimate: only 140 cards have ever been started, so the wipe is
far cheaper than "history on ~830 cards".

## Progress

- [x] **Phase 1 — ladder engine.** `lib/ladder/intervals.ts`, `ladder.ts`, `round.ts` plus three
      colocated test files. 32/32 passing: `npx tsx --test lib/ladder/*.test.ts`.
- [x] **Neon branch cut and verified** against expected table counts.
- [x] **Phase 2 — schema + migration.** `0009_opposite_blue_marvel.sql` (wipe + drop FSRS columns
      + create `hsk_unlocks`), `0010_steep_skaar.sql` (add ladder columns). Applied to the branch;
      production verified untouched.
- [x] **Phase 3 — Advanced Thai.** Grammar deleted from code (types, both generated decks, the
      hand-extracted reference, the extractor, the seeder, the component, the CSS tokens);
      `queries.ts` and `actions.ts` rewritten onto the ladder; three `components/ladder/*`
      components + `lib/ladder/distractors.ts` (15 colocated tests); both screens and both routes
      wired; practice mode now read-only with no `?since=`.
- [x] **Phase 4 — Mandarin.** `lib/review/{types,hsk-gate,queries,actions,stats}.ts` rewritten onto
      the ladder; HSK gate raised to 100% with persistent unlocks (`hsk_unlocks`); mastery is now
      "reached the top step" read off `review_states.step`; stats rebuilt on step distribution +
      interval histogram + demotion leeches; `review-session.tsx` dispatches on `card.format`;
      `empty-state.tsx` → `mandarin-round-complete.tsx`; `rating-chart.tsx` →
      `distribution-chart.tsx`. All FSRS modules and `ts-fsrs` deleted.
- [x] **Committed and merged.** The redesign was committed on `fix/tier3-just-rated-repeat` in five
      commits (`1e74cf8` ladder engine + schema, `e477e8b` Advanced Thai, `d484e86` Mandarin,
      `191e485` ts-fsrs drop, `037ddf8` plans) and squash-merged to **local `main` as `f7ecf70`**.
      `git diff fix/tier3-just-rated-repeat main` is empty. Re-verified ON `main`: `npx tsc
      --noEmit` → 0, `npx eslint app components lib scripts seed` → 0, `npx tsx --test
      lib/ladder/*.test.ts lib/review/*.test.ts` → 0 (73/73), `npx next build` → 0.
      Owner decision taken: commit `3bf34d4` (`pickFutureToday`) is **abandoned** — it rides in as a
      no-op because the ladder deletes the file it fixed.
- [ ] Phase 5 — prod migration (owner decision: this wipes real learner data).
      **`main` is NOT pushed.** It is deliberately held local: pushing triggers a Vercel production
      deploy, and `f7ecf70` reads ladder columns that production's schema does not have yet. The
      push and the migration must happen together — migrate `0009`+`0010` on prod first, then push.

**The repo typechecks and builds again.** `npx tsc --noEmit` → exit 0 and `npx next build` →
success, both for the first time since Phase 2's schema rewrite.

## Migration mechanics worth remembering

`drizzle-kit generate` needs a TTY whenever one table has **both** added and dropped columns —
it prompts to disambiguate renames, and Claude's shell has no TTY. Worse, it would have offered
`rating` → `step` (both integer) as a plausible rename, silently reinterpreting FSRS ratings as
ladder positions. **Fix: split into two migrations** — drops first, adds second. Neither diff is
ambiguous, so neither prompts.

The wipe lives in `0009`, before the adds, because `0010` adds `NOT NULL` columns with no default
to the log tables and that cannot succeed while rows exist. Keeps the pair replayable on prod.

`drizzle.config.ts` calls `config({ path: ".env.local" })` **without** `override: true`, so
dotenv will not clobber an already-set variable. Setting `$env:DATABASE_URL` inline wins — verified
empirically before running anything. Shell state does not persist between tool calls, so the
variable must be set in the same command as the migrate.

## Design refinement made during implementation

**The round is not persisted.** Full-cycle ordering needs no round table, no batch snapshot and
no pass counter. Two invariants produce it for free:

1. Any answer that does NOT finish a card sets `due = now` and stamps `last_review` — the card
   stays in the batch (`due <= now`) and moves to the back of the line.
2. An answer that finishes a card schedules it ≥ 1 day out, so it drains from the batch on its own.

Serving the unfinished card with the oldest `last_review` (nulls first, deck-order tiebreak) is
then exact round-robin, expressible as `ORDER BY last_review ASC NULLS FIRST, deck_order ASC
LIMIT 1`. This is also why `lib/review/queue.ts` and `pickFutureToday` are deleted rather than
ported: Tier 3 existed to rescue cards FSRS had scheduled minutes ahead, and nothing is ever
scheduled in minutes now.

## Decisions made during Phase 3

**`Left N` counts CARDS left, not asks left.** The approved plan specified a `Left N · Repeats N`
header borrowed from practice mode, where `remaining` meant "not yet served this session". Built
that way and run against the branch, it reads **0 after the tenth answer of seventy** — a ten-card
round of new vocab is ~70 answers, and the counter flatlines at zero with the whole climb still
ahead. `remaining` is now every card in the batch short of a top-step pass, so it holds at 10 and
reaches 0 exactly at the finish line; `repeats` is the already-asked-today subset of it.

*Open for the owner:* the genuinely smooth progress number is EXPOSURES remaining, computable
exactly from `(step, pass_streak)` — 70 → 0 monotonically. It was not built because it changes the
header's shape from what was approved, and a round opening at "Left 68" may read as punishing.

**Two submit actions, not one.** `submitAnswer(cardId, step, passed)` cannot work for multiple
choice: the client is never told which option is correct, so it has no verdict to send.
`submitAdvancedSelfGrade(cardId, step, passed)` takes the flashcard's self-graded boolean;
`submitAdvancedChoice(cardId, step, choice)` takes the chosen STRING and grades it server-side,
returning the verdict for the feedback highlight. A third, `gradeAdvancedChoice`, is the same
comparison with the write left out — practice mode's grader, since practice must not record.

**Neither submit action calls `refresh()`.** Refreshing from inside the action swaps the card out
from under a correct/incorrect highlight the Learner has not read. The session component drives
advancement with `router.refresh()` after a 1.1s feedback hold. `addNewCardsToday` still refreshes:
it has no feedback to hold.

**The client's `step` is a staleness guard, never the step graded at.** It is compared against the
stored one and the request is rejected on a mismatch. Without that, a replayed submission applies
at whatever step the card has since climbed to — promoting a card on the strength of an answer
given to an easier question.

**`shuffled`/`pick` moved to `lib/shuffle.ts`.** They were private to `lib/thai/drill.ts`, which
imports the database; importing them from there would have dragged a DB connection into
`lib/ladder/`, whose whole contract is that it runs under `tsx --test`. One implementation, both
callers, no dependencies.

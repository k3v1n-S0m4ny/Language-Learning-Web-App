# Implementation summary — Unit 2 flashcard pilot

**Branch / worktree:** `worktree-thai-unit2-flashcards` (git worktree off `origin/main`)
**Date:** 2026-07-05
**Owner-approved design:** unit 2 only · clear-the-deck-once unlocks unit 3 · self-graded flip · grandfather legacy learners · ป audio fix deferred to a separate paid step.

## Completed work

Converted Read-Thai **unit 2** from a multiple-choice drill to a self-graded flashcard "clear-the-deck" loop. Units 3–14 are untouched.

- **New drill type `letter-read`** (`lib/thai/types.ts`, `lib/thai/reachability.ts`). Unit 2 split out of the `2–5` branch of `reachableDrillTypesForUnit` → requires only `letter-read`; units 3–5 keep the `letter-sound`/`letter-class`/`audio-letter` trio. `canDrillTypeScore` teaches `letter-read` (consonant), keeping the seed-time 100%-achievable invariant green. `VALID_KINDS_FOR_DRILL_TYPE` completed in `lib/thai/drill.ts`.
- **Deck loader** `lib/thai/flashcards.ts::buildFlashcardDeck` — the 9 mid consonants (glyph, sound, acrophonic name, gloss, audioUrl, alreadyRead) from the DB.
- **Server action** `lib/thai/actions.ts::submitFlashcardGrade(itemId, knewIt)` — validates the item is a unit-2 drillable consonant, re-checks the unit-2 unlock gate server-side, atomically upserts `thai_progress` (one "knew it" masters immediately; "missed it" resets streak, never un-masters), logs a `thai_attempts` row. `letter-read` is deliberately **excluded** from `KNOWN_DRILL_TYPES`, so it cannot be routed through the hardened `submitThaiAttempt`.
- **UI** `components/thai/drill/flashcard-session.tsx` — shuffled queue of all 9, front = glyph, flip → sound + name + gloss + audio, "Knew it"/"Missed it"; missed cards rotate to the back; deck cleared → completion screen + unit-3 unlock celebration. `app/thai/[unit]/drill/page.tsx` branches unit 2 → `FlashcardSession`.
- **Grandfather** — a single shared definition `isRequiredTypeMastered(masteredSet, requiredType)` (`letter-sound` satisfies `letter-read`, one-directional) routed through **all three** mastery-check sites: `unitMasteryStats` (unlock gate), `buildDrillRound` sampling weight, and `submitThaiAttempt` item-level `newlyMastered`. Existing learners who cleared old unit 2 are not re-locked, re-sampled, or un-badged.
- **Tests** `lib/thai/flashcard-mastery.test.ts` (7 tests): unit-2 reachability, units-3–5 unchanged, letter-read mastery, grandfather, cross-unit exclusion, `maxAchievablePercentForUnit(2)==100`, and the one-directional alias helper.

## Left undone (by design)

- **ป audio regeneration** — bad clip, a *paid* TTS step deferred per owner. Needs: locate `scripts/generate-thai-audio.ts` pipeline + the exact voice, then surface model + cost options for approval (no auto-pick). The flashcard works without it.
- **No data migration / prod DB write.** `letter-read` is a text value in existing columns; the grandfather clause avoids any backfill.
- Full `next build` not run (would hit the prod DB); relied on tsc + tests + lint.

## Commands run (verbatim, re-run after fixes)

- `npm test` → **37 pass, 0 fail** (exit 0)
- `npx tsc --noEmit` → clean, no output (exit 0)
- `npx eslint <8 changed files>` → clean, no output (exit 0)

## Issues discovered & resolved (from code review round 1)

1. **CRITICAL** — client crash on deck completion: React commits an empty-queue render in the gap between `setQueue([])` and `setSummary` (auto-batching doesn't span an await), crashing on `current.glyph`. **Fixed** with an `if (!current)` guard rendering a "Finishing…" placeholder before the main render.
2. **MEDIUM** — grandfather applied only in `unitMasteryStats`, not the item-level checks driving unit-6 sampling + the "newly mastered" badge. **Fixed** by centralizing into `isRequiredTypeMastered` and routing all three sites through it.

## Spec deviations

None. Design matches the owner-approved decisions (unit 2 only, clear-the-deck-once, self-graded, grandfather).

## Procedure compliance

Worked in an isolated worktree as instructed. Plan approved before implementation. Static verification (tests/tsc/lint) run and re-run after review fixes. Independent `code-reviewer` invoked; findings addressed and sent back for re-verification. ป audio held as a separate gated paid step per the paid-generation protocol.

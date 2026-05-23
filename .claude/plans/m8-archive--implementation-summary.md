---
status: COMPLETE
updated: 2026-05-23
---

# Handoff: Milestone 8 — Auto-play phrase audio + FSRS Chinese tuning

Agent: implementer | Date: 2026-05-23 | Status: COMPLETE

## Completed

### Feature 1 — Default playback to whole-phrase audio

- **`components/audio-button.tsx`** — Added `export function playAudio(url: string | null): void` as a standalone imperative helper. Extracted from the `AudioButton` internal `play()` call, which now delegates to it. Safe to call with `null` (no-op).
- **`components/review-session.tsx`** — Imported `playAudio`. Changed the `onReveal` prop from `() => setRevealed(true)` to an arrow function that calls `setRevealed(true)` then `playAudio(card.wholeAudioUrl)`. Play fires inside the click handler (user-gesture context), satisfying browser autoplay policy. `null` `wholeAudioUrl` is handled by `playAudio`'s null guard — no throw on reveal.

React 18 StrictMode note: StrictMode double-invokes *effects*, not event handlers. Since play is called inside the click handler, no ref guard was needed. No double-play risk.

### Feature 2 — FSRS Chinese tuning as global constants

- **`lib/review/config.ts`** (new file) — Exports `REQUEST_RETENTION = 0.85`, `LEECH_THRESHOLD = 7`, and `isLeech({ lapses }): boolean`. Single source of truth for all retention and leech logic.
- **`lib/review/scheduler.ts`** — Imported `REQUEST_RETENTION` from `./config`. `getScheduler()` now takes no arguments and always builds the FSRS instance with the global constant. (Parameter removed entirely to avoid a dead-arg lint warning.)
- **`lib/db/schema.ts` (line ~174)** — Changed `learnerSettings.requestRetention` column default from `0.9` to `0.85`. Added a comment marking it vestigial (column kept, not dropped).
- **`lib/review/actions.ts`** — Removed the `ensureLearnerSettings` import and the `settings` variable (no longer needed; `getScheduler()` takes no args). `getScheduler()` called with no args.
- **`lib/review/queries.ts`** — `getScheduler()` call in `getStudyScreenData` updated to no-arg form. After loading `fsrsCard`, sets `card.lapses = fsrsCard.lapses` so the client gets the lapse count without receiving the full FSRS jsonb blob. `loadStudyCard` seeds `lapses: 0` as the placeholder for unseen cards (correct — no state row exists for them).
- **`lib/review/types.ts`** — Added `lapses: number` to `StudyCard` interface.
- **`lib/review/stats.ts`** — Imported `isLeech`. Added `extractLapses(fsrsCard)` internal helper. Added `leechCount: number` to `LearnerStats` interface. Computed `leechCount` per-learner: `myStates.filter(s => isLeech({ lapses: extractLapses(s.fsrsCard) })).length`.
- **`app/stats/page.tsx`** — Added `<StatTile label="Leeches" value={stats.leechCount} />` tile. Grid changed from `grid-cols-3` to `grid-cols-2 sm:grid-cols-4` to fit four tiles.
- **`components/card-back.tsx`** — Imported `isLeech`. Computes `leech = isLeech({ lapses: card.lapses })` on render. Renders a small red `leech` badge pill inline with the headword when `leech` is true. Badge has `title` attribute showing the raw lapse count. Absent for non-leeches.
- **`scripts/migrate-retention.ts`** (new file) — One-time script to UPDATE all `learner_settings` rows to `request_retention = 0.85`. Must be run manually once against production: `tsx scripts/migrate-retention.ts`.

## Left Undone

- **Executing the migration script** — `scripts/migrate-retention.ts` was written but not run (no live DB credentials in this session). Must be run once manually.
- **Content work** — intentionally out of scope per plan (tags, more phrases, stroke order all cut).

## Commands Run

- `npm run build` (first pass) — exit 0, compiled successfully, TypeScript clean
- `npm run lint` (first pass) — exit 1 with 1 warning: `_requestRetention` parameter defined but never used in `scheduler.ts`. Fixed by removing the parameter.
- `npm run build` (second pass) — exit 0
- `npm run lint` (second pass) — exit 0, clean

## Issues Discovered

- **`_requestRetention` lint warning** — First version of `getScheduler` accepted an optional `_requestRetention` parameter for API compatibility. ESLint `@typescript-eslint/no-unused-vars` warned on it even with the underscore prefix. Resolved by removing the parameter entirely; no call site in the project passes a retention value anymore.
- **`lapses` on `StudyCard`** — FSRS card lives server-side. The simplest path to the client for the leech badge was adding `lapses: number` to `StudyCard` (already a serializable client-bound shape). `loadStudyCard` seeds it 0; `getStudyScreenData` overwrites it from the real state row before returning.

## Spec Deviations

- `getScheduler` signature simplified to zero-args. Spec said "use global REQUEST_RETENTION rather than per-Learner column" but did not say keep the parameter. Removing it is stricter and eliminates a dead-arg smell. Documented here for reviewer awareness.
- Stats grid changed from 3 to 4 columns to accommodate the Leeches tile. The three existing tiles are unchanged in meaning and layout; 4 columns was a necessary UI adjustment.

## Procedure Compliance

- Plan consulted before coding: yes
- AGENTS.md read: yes (Next.js docs checked — no new Next.js APIs introduced; only React client-side state and the browser DOM `Audio` API used)
- Tests run before finishing: yes (`npm run build` exit 0, `npm run lint` exit 0)
- Handoff written: yes

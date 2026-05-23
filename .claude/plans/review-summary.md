---
status: COMPLETE
updated: 2026-05-23
---

# Review Summary — Milestone 8: Auto-play phrase audio + FSRS Chinese tuning

## Result
PASS

## Files Reviewed
- `components/audio-button.tsx`
- `components/review-session.tsx`
- `components/card-back.tsx`
- `components/card-front.tsx`
- `components/word-chip.tsx`
- `lib/review/config.ts`
- `lib/review/scheduler.ts`
- `lib/review/actions.ts`
- `lib/review/queries.ts`
- `lib/review/types.ts`
- `lib/review/stats.ts`
- `lib/db/schema.ts`
- `app/stats/page.tsx`
- `scripts/migrate-retention.ts`

## Findings

### CRITICAL
None.

### HIGH
None.

### MEDIUM
None.

### LOW

- `scripts/migrate-retention.ts:22-23` — The `result` value logged by `console.log("Updated learner_settings rows:", result)` will be an empty array `[]` under the neon-http Drizzle driver. Drizzle `update()` on neon-http returns no row count unless `.returning()` is chained. The script runs correctly and the UPDATE fires, but the operator sees no confirmation of how many rows were actually touched. Suggested fix: chain `.returning({ learnerId: learnerSettings.learnerId })` so the log shows which rows were updated.

- `components/audio-button.tsx:7` — `new Audio(url).play()` creates a detached `HTMLAudioElement` with no stored reference. Modern browsers keep active media elements alive via an internal active-media list while playing, so GC before playback completes is not a real-world risk. This is the standard fire-and-forget audio idiom. Flagged for completeness; not a functional bug in any current browser.

## Assertions Checked

**A1 — Auto-play on reveal exactly once; no front auto-play; no per-word auto-play; null-safe.**
PASS.
- `playAudio` is called inside the inline `onReveal` arrow function at `review-session.tsx:54-59`, which is the `onClick` of `CardFront`'s "Show answer" button. It fires once per click, inside the user-gesture context.
- `revealed` flips to `true` on that same click; `CardFront` is conditionally rendered only when `!revealed`. The "Show answer" button — and therefore the `onReveal` handler — is unreachable after the first reveal. No second call path exists.
- `CardBack` and `WordChip` render `AudioButton`, which requires an explicit user click. No `useEffect` hooks exist anywhere in the component tree (confirmed: grep for `useEffect` in `components/` returns zero matches). No auto-play on `CardBack` mount.
- `playAudio(null)`: first line is `if (!url) return`. No throw on null `wholeAudioUrl`. Confirmed.
- React 18 StrictMode double-invoke concern: StrictMode double-invokes render functions and effects, not event handlers. The play call is in a click handler; no double-play risk.

**A2 — `request_retention: 0.85` flows into every scheduler call.**
PASS.
- `REQUEST_RETENTION = 0.85` is the single definition at `lib/review/config.ts:11`.
- `getScheduler()` at `scheduler.ts:22` passes it directly: `fsrs(generatorParameters({ request_retention: REQUEST_RETENTION }))`.
- Both call sites (`actions.ts:28`, `queries.ts:226`) call `getScheduler()` with zero arguments.
- No call site passes a retention argument. The per-learner column path is completely removed from scheduling logic.
- Grep for `0.9` in `lib/`, `components/`, `app/` returns zero matches.
- Schema default updated to `0.85` and marked vestigial with an inline comment (`schema.ts:174-177`).
- `ensureLearnerSettings` is still called in `queries.ts:172` (needed for `newCardsPerDay`), but only `settings.newCardsPerDay` is used from its return value; `requestRetention` is never read.

**A3 — `isLeech` returns true iff `lapses >= 7`; badge and stats count use the same predicate.**
PASS.
- `isLeech` implementation at `config.ts:17`: `return fsrsCard.lapses >= LEECH_THRESHOLD` where `LEECH_THRESHOLD = 7`. Boundary is `>=`, not `>`. Correct per spec.
- Badge in `card-back.tsx:19`: `const leech = isLeech({ lapses: card.lapses })`, rendered conditionally at line 27. Same predicate via shared import.
- Stats count in `stats.ts:176-178`: `myStates.filter(s => isLeech({ lapses: extractLapses(s.fsrsCard) })).length`. Same predicate via shared import.
- All three consumers import `isLeech` from the single source. No predicate drift possible.
- New cards (no state row): `lapses` seeded `0` in `loadStudyCard` and then overwritten from `createEmptyCard(now).lapses` (also `0`) in `getStudyScreenData`. Badge correctly suppressed for unseen cards.

**A4 — Build / typecheck / lint clean; no M7 same-day requeue regression; no M6 stats regression.**
PASS.
- `npm run build`: exit 0, TypeScript clean, all 5 routes generated successfully.
- `npm run lint`: exit 0, no warnings.
- `npx tsc --noEmit`: exit 0, no output.
- M7 same-day requeue logic (`queries.ts:47-100`, `endOfThailandDay` predicate, `fetchRawCounts`, `getStudyScreenData` due-window) is untouched by this milestone. No changes to the due-eligibility predicate.
- M6 stats fields (`seen`, `mature`, `reviewsByDay`, `streak`, `dueForecast`, `ratingCounts`) are all present and unmodified in `stats.ts`. `leechCount` is purely additive.
- `app/stats/page.tsx` grid changed from `grid-cols-3` to `grid-cols-2 sm:grid-cols-4` to fit the fourth tile. The three existing `StatTile` instances are unchanged in label and data binding.

**Vestigial column check — `requestRetention` is not read for scheduling.**
PASS.
- All usages of `requestRetention` / `request_retention` in source: `schema.ts` (column definition), `config.ts` (comment only), `scheduler.ts` (uses `REQUEST_RETENTION` constant, not the DB column), `migrate-retention.ts` (update script).
- Confirmed via grep across all `.ts`/`.tsx` files: no call path reads the column value and passes it to `getScheduler` or `generatorParameters`.

## Commands Run
- `npm run lint` — exit 0, clean (no output)
- `npm run build` — exit 0, TypeScript clean, 5 routes generated
- `npx tsc --noEmit` — exit 0, no output
- `grep -rn "0\.9" lib/ components/ app/ --include="*.ts" --include="*.tsx"` — zero matches
- `grep -rn "getScheduler(" lib/ components/ app/ --include="*.ts" --include="*.tsx"` — 2 call sites, both zero-arg
- `grep -rn "requestRetention|request_retention" --include="*.{ts,tsx}"` — no scheduling use of per-learner column confirmed
- `grep -rn "useEffect" components/ --include="*.tsx"` — zero matches (no auto-play-on-mount risk)
- `cat node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md` — confirmed `refresh()` from `next/cache` is the correct API for this Next.js version

## Residual Risk

1. **Migration not yet run.** `scripts/migrate-retention.ts` updates the vestigial `request_retention` column for the 2 existing learner_settings rows and has not been executed (no DB credentials in the session). Functional risk is zero since the column is no longer read for scheduling. The cosmetic risk is that reading `learner_settings` directly shows `0.9` until the script runs.

2. **Migration result logging opaque.** The `console.log` in `migrate-retention.ts` prints `[]` rather than a row count. The operator should verify post-run with a direct SELECT. See LOW finding above.

3. **`lapses` field relies on ts-fsrs default.** Code assumes `createEmptyCard(now).lapses === 0`. This is standard ts-fsrs behavior but is not asserted in a test. A future ts-fsrs upgrade that changes the default would cause new cards to erroneously show the leech badge. Risk is low for a pinned dependency.

4. **No automated tests.** No regression tests cover audio auto-play, leech threshold, or retention constant propagation. A future refactor touching these paths would not be caught automatically. Out of scope for this milestone.

## Procedure Compliance
- Plan (`active-plan.md`) consulted before review: yes
- Implementation summary (`implementation-summary.md`) read before review: yes
- All changed and related source files read in full: yes
- Next.js API usage verified against `node_modules/next/dist/docs/` (`refresh` from `next/cache` confirmed correct): yes
- No source files modified during review: yes
- Review summary written: yes

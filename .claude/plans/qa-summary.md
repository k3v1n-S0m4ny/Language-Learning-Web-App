---
status: COMPLETE
updated: 2026-05-23
---

# QA Summary — Milestone 8: Auto-play phrase audio + FSRS Chinese tuning

## Prior summaries read before validating
- `implementation-summary.md`: YES — read in full before any assertion was tested.
- `review-summary.md`: YES — read in full before any assertion was tested.
- `active-plan.md` (Validation Contract): YES — all four assertions taken from this document.

## Result

**PASS** — all four assertions hold. No blocking defects found. Two non-blocking residual risks carried forward from the review summary (migration not yet run; migration log opaque) remain open but have zero functional impact on scheduling.

---

## Assertions

### A1 — PASS
**Revealing a card auto-plays whole-phrase audio exactly once; front never auto-plays; per-word clips never auto-play; null `wholeAudioUrl` reveals without error.**

Evidence:
- `grep -rn "useEffect" components/ --include="*.tsx"` — **zero matches**. No effect-based auto-play anywhere in the component tree; audio cannot fire on mount or on any state change outside a user click handler.
- `playAudio` is called at exactly one site in the component tree: `review-session.tsx:58`, inside the `onReveal` arrow function that is the `onClick` of `CardFront`'s "Show answer" button.
- `CardFront` is conditionally rendered only when `!revealed` (`review-session.tsx:51`). Once `revealed` flips to `true` on the first click, `CardFront` is unmounted and its `onReveal` path is unreachable. No second call path exists.
- `CardFront` (`card-front.tsx`) imports no audio modules; zero audio references in that file.
- `WordChip` (`word-chip.tsx`) renders `AudioButton` which requires explicit user `onClick`; no `playAudio` or `useEffect` in that file. Per-word clips are tap-only.
- `grep -rni "autoplay\|auto_play\|autoPlay" components/ --include="*.tsx"` — zero matches.
- `playAudio(null)` null-safety verified by Node simulation: `if (!url) return` exits before constructing any `Audio` object. No throw for `null`, `undefined`, or `""`. (Node probe exit 0.)

### A2 — PASS
**A freshly scheduled review uses request_retention 0.85; value reaches ts-fsrs; interval previews shift accordingly vs. 0.9.**

Evidence:
- `lib/review/config.ts:11` — `export const REQUEST_RETENTION = 0.85;` — single authoritative constant.
- `lib/review/scheduler.ts:22` — `fsrs(generatorParameters({ request_retention: REQUEST_RETENTION }))` — constant flows directly into `generatorParameters`.
- Both call sites (`actions.ts:28`, `queries.ts:226`) call `getScheduler()` with zero arguments; no path bypasses the constant.
- `grep -rn "0\.9" lib/ components/ app/ --include="*.ts" --include="*.tsx"` — **zero matches** (old 0.9 default gone from all scheduling paths).
- Schema default updated to 0.85 at `schema.ts:176`.
- Node probe confirmed `generatorParameters({ request_retention: 0.85 }).request_retention === 0.85` vs `0.9` (values differ: `true`). (Exit 0.)
- Node probe confirmed interval shifts for a card reviewed 3x Good:

  | Rating | 0.85 retention | 0.90 retention | Differs? |
  |--------|---------------|---------------|---------|
  | Again  | 0.0d          | 0.0d          | same    |
  | Hard   | 55.0d         | 29.0d         | YES     |
  | Good   | 76.0d         | 40.0d         | YES     |
  | Easy   | 123.0d        | 65.0d         | YES     |

  Hard/Good/Easy all shift materially, confirming the parameter is live in the scheduler. (Exit 0.)

### A3 — PASS
**`isLeech` returns true iff `lapses >= 7` (boundary: 6 → false, 7 → true, 8 → true); leech badge and stats leech count use the same predicate.**

Boundary tests (Node probe, exit 0):

| lapses | isLeech result | Expected | Verdict |
|--------|---------------|----------|---------|
| 0      | false         | false    | PASS    |
| 1      | false         | false    | PASS    |
| 5      | false         | false    | PASS    |
| 6      | false         | false    | PASS — boundary below threshold |
| 7      | true          | true     | PASS — boundary at threshold |
| 8      | true          | true     | PASS — above threshold |
| 100    | true          | true     | PASS    |

`LEECH_THRESHOLD = 7`, operator is `>=` (not `>`). All 7 boundary cases pass.

Badge alignment: `card-back.tsx:19` — `const leech = isLeech({ lapses: card.lapses })` — badge rendered conditionally at line 27 via the same imported `isLeech` function from `lib/review/config`.

Stats alignment: `stats.ts:176-178` — `myStates.filter(s => isLeech({ lapses: extractLapses(s.fsrsCard) })).length` — same imported `isLeech` function. `extractLapses` is defensive (returns 0 for null/missing/non-number lapses), preventing false positives on malformed jsonb.

All three consumers (definition, badge, stats count) share a single imported predicate. No predicate drift is possible.

New cards: `loadStudyCard` seeds `lapses: 0`; `getStudyScreenData` overwrites from `fsrsCard.lapses` for seen cards. Badge correctly suppressed for unseen cards (lapses=0 < 7).

### A4 — PASS
**`npm run build`, typecheck, and lint are clean; no regression in M7 same-day requeue or M6 stats.**

- `npm run build` — **exit 0**. TypeScript compiled in 5.7s. All 5 routes generated (`/`, `/_not-found`, `/api/auth/[...nextauth]`, `/stats`, Proxy middleware). No errors or warnings.
- `npm run lint` — **exit 0**. No output (clean).
- `npx tsc --noEmit` — **exit 0**. No output (clean).

M7 regression check: `lib/review/time.ts` — `endOfThailandDay`, `startOfThailandDay`, Thailand UTC+7 logic intact and unmodified. `lib/review/queries.ts` — `fetchRawCounts`, `endOfThailandDay` due-window predicate, Learning/Relearning intraday requeue logic all present and unchanged.

M6 stats regression check: `lib/review/stats.ts` — all original fields present and unmodified: `seen`, `mature`, `reviewsByDay`, `streak`, `dueForecast`, `ratingCounts`. `leechCount` is purely additive (new field only). `app/stats/page.tsx` — three original `StatTile` instances (`Seen`, `Mature`, `Streak`) unchanged in label and data binding; `Leeches` tile added as fourth in `grid-cols-2 sm:grid-cols-4` grid.

---

## Commands Run

| Command | Exit Code | Notable Output |
|---|---|---|
| `node --input-type=module` (A2: FSRS 0.85 vs 0.90 probe) | 0 | `params085.request_retention: 0.85`; Hard/Good/Easy intervals differ for both new and reviewed cards |
| `node --input-type=module` (A3: isLeech boundary probe) | 0 | All 7 cases PASS; `LEECH_THRESHOLD=7`, operator `>=` confirmed |
| `node --input-type=module` (A1: null-safety simulation) | 0 | `playAudio(null/undefined/"")` all no-op, no throw |
| `grep -rn "useEffect" components/ --include="*.tsx"` | 0 | Zero matches |
| `grep -rni "autoplay" components/ --include="*.tsx"` | 0 | Zero matches |
| `grep -rn "playAudio" components/ --include="*.tsx"` | 0 | 2 matches: definition in `audio-button.tsx`, single call in `review-session.tsx` onReveal handler |
| `grep -rn "0\.9" lib/ components/ app/ --include="*.ts" --include="*.tsx"` | 0 | Zero matches |
| `grep -rn "getScheduler" lib/ app/ --include="*.ts" --include="*.tsx"` | 0 | 3 matches: definition (zero-arg), `actions.ts:28`, `queries.ts:226` — all zero-arg |
| `npm run build` | 0 | TypeScript clean, 5 routes |
| `npm run lint` | 0 | No output |
| `npx tsc --noEmit` | 0 | No output |

---

## Unexpected Behavior

None. All behaviors matched spec precisely.

---

## Residual Risk

1. **Migration script not yet executed.** `scripts/migrate-retention.ts` updates the vestigial `request_retention` column for existing `learner_settings` rows from 0.9 to 0.85. The column is no longer read for scheduling (confirmed by zero grep matches in all scheduling paths), so functional risk is zero. A direct SELECT on `learner_settings` will still show 0.9 for the 2 existing rows until the script is run manually.

2. **Migration result logging opaque.** The migrate script's `console.log` prints `[]` (not a row count) under the neon-http Drizzle driver because `.returning()` is not chained. Identified as a LOW finding in the review summary. Recommend the operator verify with a post-run SELECT.

3. **No browser-level auto-play test.** A1's "auto-plays exactly once" assertion was validated by static analysis (single call site, guarded by `!revealed` rendering, no useEffect). A Playwright test would give higher confidence for the audio play mechanics, but the DOM `Audio` API is not exercisable in Node. The code path is simple and the review-summary code reading concurs.

4. **No automated regression tests.** No test suite covers audio auto-play, leech threshold, or retention propagation. Future refactors touching these paths will not be caught automatically. Out of scope for this milestone.

---

## Procedure Compliance

- Plan (`active-plan.md`) consulted before QA: yes
- Implementation summary (`implementation-summary.md`) read before validating: yes
- Review summary (`review-summary.md`) read before validating: yes
- Both prior summaries read before validating assertions: yes
- Source files edited: no (only `qa-summary.md` written)
- QA summary written: yes

# Review Summary - Tier 3 just-rated-card exclusion (pickFutureToday)

## Result
PASS

No correctness defect found in `pickFutureToday` or its three call sites. One UI inconsistency the task explicitly flagged as suspected is confirmed reachable (not to be fixed, reported only, per instructions), plus one test-coverage gap worth fixing before this ships.

## Files Reviewed
- `C:\Users\User\.claude\plans\why-when-i-fluttering-rabbit.md` (plan)
- `.claude/plans/implementation-summary.md` (handoff)
- `lib/review/queue.ts` (NEW)
- `lib/advanced-thai/queries.ts` (diff)
- `lib/review/queries.ts` (diff)
- `components/advanced-thai/advanced-review-session.tsx` (diff)
- `lib/review/scheduler.ts`, `lib/review/config.ts` (FSRS step verification)
- `node_modules/ts-fsrs/dist/index.umd.js`, `index.d.ts` (default learning-step values, ground truth for grace window)
- `lib/advanced-thai/actions.ts` (write path — `lastReview` timestamp provenance)
- `components/advanced-thai/advanced-study-screen.tsx`, `advanced-practice-screen.tsx`, `components/session-header.tsx` (header count vs. served-card reachability)
- `lib/review/hsk-gate.test.ts` (precedent for colocated pure-logic tests)
- `git diff` for all four changed files (byte-for-byte, not just described changes)

## Findings

### CRITICAL
None.

### HIGH
None.

### MEDIUM
- **`lib/review/queue.ts` has no unit test, despite an established colocated-test pattern for exactly this kind of pure logic.** `lib/review/hsk-gate.test.ts` (same directory) is a `node:test` suite for a comparably subtle pure gating function, and `package.json`'s `test` script (`tsx --test lib/**/*.test.ts`) would auto-discover `lib/review/queue.test.ts` if it existed — no wiring needed. `pickFutureToday` is the kind of function this review had to hand-trace through ~8 distinct cases (zero rows, one row just-rated, one row rated long ago, two-row alternation, exclusion-target-not-in-top-2, all-null `lastReview`, tie on identical `lastReview`) to convince myself it's correct. That reasoning belongs in an executable test, not just this review's prose — the next person to touch Tier 3 (there will be a next time; it's been touched twice already per the plan's own history) has nothing to run. Recommend adding `lib/review/queue.test.ts` covering at minimum the cases enumerated above before merging.
- **New reachable UI inconsistency, confirmed (task's own suspicion, item 6).** `getAdvancedStudyData`'s `dueCount` (`lib/advanced-thai/queries.ts:196`, `lte(atReviewStates.due, dayEnd)`) counts the Tier-1 + Tier-3 window, independent of `pickFutureToday`. When exactly one Tier-3-eligible row exists and it is the just-rated card, `dueCount` still counts it (due <= dayEnd is true) while `pickFutureToday` correctly excludes it, so `card` is `null` → `AllCaughtUp` renders under a header reading "Due 1" (`components/advanced-thai/advanced-study-screen.tsx:63,74-78`). **This combination was unreachable before this fix** (previously `futureRow[0]?.cardId` was used unconditionally, so the sole future-due row was always served, never dropped). The same construction applies to `getAdvancedPracticeData`'s `repeatCount` (`lib/advanced-thai/queries.ts:410-423`, same `gte(lastReview, since) AND lte(due, dayEnd)` shape) against `components/advanced-thai/advanced-practice-screen.tsx:74,82`. It also generalizes to the **Mandarin** flow: `lib/review/queries.ts`'s `fetchRawCounts` (`lte(reviewStates.due, dayEnd)`, lines 109-116) feeds the same `dueCount` shown by `components/session-header.tsx:11`, and Mandarin's Tier 3 now runs through the same `pickFutureToday`, so a single-card exclusion there produces the identical "Due 1" + empty-state combination. Not asked to fix; flagging that it is not Advanced-Thai-only and is a direct, load-bearing side effect of this change (it breaks the invariant `lib/review/queries.ts:95` labels "A6": "the header count always matches what is actually served" — worth a follow-up ticket, e.g. subtracting the excluded id from `dueCount`/`repeatCount` or computing them from the same tier queries).

### LOW
None.

## Assertions Checked (per the 6 numbered scrutiny items in the task)

1. **`pickFutureToday` correctness — PASS.** Traced by hand:
   - Zero rows: `mostRecent` stays `undefined` → `justRatedId` `undefined` → `.find` on `[]` returns `undefined`. Correct (falls to empty state).
   - One row, just rated (within grace): `mostRecent` = that row, within grace → `justRatedId` = its id → `.find(row => row.cardId !== justRatedId)` filters out the only row → returns `undefined`. Correct — matches the explicit design intent ("a single-card session correctly falls through to the empty state").
   - One row, rated long ago (outside grace): not excluded → returned. Correct.
   - Two rows both rated within grace (alternation case): `mostRecent` is always the greater-`lastReview` row, i.e. genuinely the more-recently-graded of the two — excluding it and serving the other is exactly "alternate, never blank." Verified this holds under the concrete scenario in the plan's own verification step 4 (rate A then B in quick succession → A's due < B's due since A started its step timer first, B has the greater `lastReview` → B excluded, A served next; then rate A again → A now has the greater `lastReview` → A excluded, B served). Never blanks with 2 legitimately-different candidates.
   - Two rows where the just-rated card is NOT among them: by construction the just-rated card's `lastReview` is `now` to within milliseconds. If it isn't in the fetched top-2 (its `due` wasn't among the 2 smallest), the fetched rows' `lastReview` values are both from earlier, unrelated gradings — either they're old enough to be outside the 60s window (nothing excluded), or (rapid multi-card rating burst, e.g. 3 cards rated back-to-back) one of the two fetched rows can itself be "recently rated" and get excluded even though it isn't literally the single most-recent action. Confirmed this is **not a bug**: Tier 3's entire purpose is to serve future-due cards early: the excluded row only matters if it's `rows[0]`, and if it's `rows[0]`, `rows[1]` (a different, legitimately Tier-3-eligible card) is correctly served — never a re-serve of the literal just-graded card, and never a wrongful blank.
   - All-null `lastReview`: loop's `if (!row.lastReview) continue` skips every row → `mostRecent` stays `undefined` → nothing excluded → first row returned. Correct; matches the plan's expectation for legitimately-never-reviewed rows (schema: `last_review` has no `.notNull()`, `lib/db/schema.ts:144,409`).
   - Tie (two rows, identical `lastReview` to the millisecond): the strict `>` comparison means the earlier-due row (encountered first in the loop) keeps `mostRecent` if the second row's timestamp is not strictly greater — a genuine tie exempts the *later*-due row from being flagged "most recent," which could theoretically exclude the wrong one. This requires two writes at the exact same millisecond, which given `db.batch`'s single-HTTP-round-trip design (one rating action per call) I could not construct a realistic path to. Noting as a footnote, not a finding.

2. **Is limit(2) enough? — PASS, and provably so, not just empirically.** The algorithm computes a single `mostRecent` (a `reduce`-shaped loop keeping the strict maximum) and excludes at most that one id. It is structurally impossible for a second row to also be "excluded-worthy" — there is exactly one greatest `lastReview` per invocation. So the failure mode the prompt asks about (row0 excluded, row1 *also* excluded-worthy, row3 needed) cannot occur: at most one row is ever excluded, and `limit(2)` guarantees a fallback survivor whenever ≥2 Tier-3-eligible rows exist. When exactly one Tier-3-eligible row exists and it's the excluded one, returning `undefined` is the *intended* fallthrough, not a starvation bug.

3. **60s grace vs. FSRS's actual shortest step — PASS, confirmed against the installed package, not assumed.** `lib/review/scheduler.ts:22` calls `generatorParameters({ request_retention: REQUEST_RETENTION })` with no `learning_steps`/`relearning_steps` override, so ts-fsrs's defaults apply. Verified directly in `node_modules/ts-fsrs/dist/index.umd.js:539-545`: `default_learning_steps = ["1m", "10m"]`, `default_relearning_steps = ["10m"]`, and `ConvertStepUnitToMinutes` (`:269-284`) parses `"1m"` as exactly 1 minute (60,000ms) — no rounding or fuzz applied to the step duration itself. The shortest step system-wide is "Again" on a New/Learning card, using `firstStep = learning_steps[0] = "1m"` (`:292-296`). This exactly matches `JUST_RATED_GRACE_MS = 60_000` — not shorter, not longer. `lib/review/queries.ts:97-107`'s own doc comment (probe results for A5) is consistent with this. No step in the app is shorter than 60s, so the grace window cannot outlive its purpose or wrongly blank a session past the point Tier 1 legitimately claims the card.

4. **Practice mode composition — PASS.** `getAdvancedPracticeData`'s Tier 3 query already filters `gte(atReviewStates.lastReview, since)` in addition to the due-window predicates (`lib/advanced-thai/queries.ts:456-459`); `pickFutureToday` operates on the rows that already survived that filter. Since the exclusion logic never removes more than one row, and the `since` filter only narrows the candidate pool further (it cannot introduce a second exclusion-worthy row), the two compose without conflict. Confirmed no scenario where `since`-filtering plus the grace-window exclusion together strand a session that has ≥2 genuinely servable Tier-3 rows — same proof as item 2 applies verbatim, since `since` only affects which rows enter the `WHERE`, not the selection algorithm.

5. **Mandarin regression — PASS.** `lib/review/queries.ts:259-296`: the HSK gate (`computeGate`, `gate.firstEligibleUnseenId`, `gate.eligibleUnseenCount`) is consumed only in the `newCardId`/`counts.newRemaining` (Tier 2) branch. `readyRow` (Tier 1, `:264-272`) and `futureTodayRow` (Tier 3, `:273-287`) query `reviewStates` directly with no gate/band predicate — confirmed unchanged by this diff (the diff only adds `lastReview` to the select and bumps `.limit(1)` to `.limit(2)` on the Tier 3 query; the `WHERE` clause is untouched). Matches the file's own comment: "The HSK gate deliberately constrains Tier 2 ONLY."

6. **UI inconsistency — CONFIRMED REACHABLE**, both in Advanced Thai (`dueCount`, `repeatCount`) and, additionally (not asked, found while checking), in Mandarin's equivalent header. See MEDIUM findings above. Not fixed, per instructions.

## Commands Run
My own re-run, independent of the implementer's pasted output.

- `npx tsc --noEmit` — exit 0
  ```
  (no output — clean)
  ```
  Matches implementer's claimed exit 0 / no diagnostics.

- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  Matches implementer's claimed exit 0.

- `npm test` (`tsx --test lib/**/*.test.ts`) — exit 0, 111 passed / 0 failed
  ```
  ✔ empty string returns false (0.1347ms)
  ✔ null returns false (0.1607ms)
  ✔ undefined returns false (0.1208ms)
  ℹ tests 111
  ℹ suites 0
  ℹ pass 111
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 623.8037
  ```
  Not claimed by the implementer (they only ran tsc/lint, correctly noting no test suite covers this path) — I ran the existing suite myself to confirm the new code doesn't break any pre-existing pure-logic test, and to establish that `lib/review/queue.test.ts` genuinely does not exist (confirmed via `Glob` before running). All read-only (`node:test`/`tsx`, no DB access) — consistent with the "no command that writes to the DB" constraint.

- `git diff -- lib/advanced-thai/queries.ts lib/review/queries.ts components/advanced-thai/advanced-review-session.tsx` — reviewed byte-for-byte; matches the implementer's line-by-line description in `implementation-summary.md` exactly (Tier 3 select gains `lastReview`, `.limit(1)`→`.limit(2)`, `chosenId`/`futureTodayId`/`futureRow[0]?.cardId` replaced with `pickFutureToday(...)`, doc comments corrected, `components/review-session.tsx` and `lib/review/time.ts` untouched as instructed).

- Verified ts-fsrs default step config directly against `node_modules/ts-fsrs/dist/index.umd.js` and `index.d.ts` rather than trusting the doc-comment's probe claims — the source matches (`default_learning_steps = ["1m","10m"]`, `default_relearning_steps = ["10m"]`, `"1m"` = 60,000ms exactly).

No mismatches between my own re-run and the implementer's claimed results.

## Residual Risk
- The two MEDIUM findings above (missing `pickFutureToday` unit test; the `dueCount`/`repeatCount` vs. served-card mismatch reachable in both Advanced Thai and Mandarin) are unresolved. The second was explicitly out of scope for this task ("do NOT fix it; just report it") but should be tracked — it is a genuine, newly-introduced regression of the "A6" header-matches-served invariant, even though it is cosmetic (self-heals within ≤60s once Tier 1 claims the card) rather than functionally broken.
- No end-to-end/manual browser verification of the fix has been performed by anyone in this chain yet (the implementer explicitly deferred it per the DB-write constraint, and this review is static-only per its own constraints). The plan's verification steps 1-6 (real-schedule rating in `/advanced-thai/nak-kosana`, two-card alternation, practice mode, Mandarin) remain unexecuted against a live/branched database. That is expected at this stage (QA's job next), not a defect in this review, but it means the hand-traced correctness above has not yet been confirmed against actual FSRS scheduling output end-to-end.
- Tie-on-identical-`lastReview`-millisecond edge case (noted under assertion 1) is theoretically possible but no realistic write path produces it given `db.batch`'s single-round-trip design; not worth blocking on.

## Procedure Compliance
- Plan consulted before review: yes (`C:\Users\User\.claude\plans\why-when-i-fluttering-rabbit.md`)
- Implementation summary read: yes (`.claude/plans/implementation-summary.md`)
- Review summary written: yes

# Review Summary - Advanced Thai: cross-theme practice by card type

## Result
PASS

## Files Reviewed
- `lib/advanced-thai/types.ts`
- `lib/advanced-thai/queries.ts` (`getKindSummaries`, `getAdvancedPracticeData`, plus re-read `getThemeSummaries`/`getAdvancedStudyData` for idiom comparison)
- `app/advanced-thai/practice/[kind]/page.tsx`
- `components/advanced-thai/advanced-practice-screen.tsx`
- `components/advanced-thai/advanced-thai-home.tsx`
- Comparison/context files: `app/advanced-thai/[theme]/page.tsx`, `components/advanced-thai/advanced-study-screen.tsx`, `components/advanced-thai/advanced-review-session.tsx`, `lib/advanced-thai/actions.ts`, `lib/advanced-thai/access.ts`, `lib/review/time.ts`, `lib/db/schema.ts` (at_cards / at_review_states / at_review_logs / at_themes)
- Next-version docs (per AGENTS.md instruction, since this is a non-standard Next build): `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md`, `redirect.md`

## Findings

### CRITICAL
None.

### HIGH
None.

### MEDIUM
None.

### LOW
- `app/advanced-thai/practice/[kind]/page.tsx:51` — `redirect(..., RedirectType.replace)` is called from a Server Component (not a Server Action), and the Next docs for this build state explicitly: "The `type` parameter has no effect when used in Server Components." The default behavior outside Server Actions is already `replace`, so the observed behavior is correct, but the explicit second argument is a no-op here rather than doing what the inline comment ("replace so Back goes home") implies it's doing. Harmless — just misleading self-documentation. No functional risk.
- `lib/advanced-thai/types.ts:80` / `queries.ts:344` — `AtKindSummary.totalCards` is computed by `getKindSummaries` but never read by any consumer (`advanced-thai-home.tsx` only renders `seenCards`). Matches the plan's field list verbatim, so not a deviation, just a currently-unused field. Low-risk, likely intentional headroom for a future "X/Y seen" display like the theme cards have.
- `lib/advanced-thai/queries.ts` (`getAdvancedPracticeData`) — `poolSize`, `remaining`, and `repeatCount` are recomputed live on every render rather than snapshotted at session start (`since`-mint time). If a card of the same kind is newly introduced via the *per-theme* flow mid-practice-session (crossing into this pool for the first time), its freshly-inserted `at_review_states` row gets `lastReview = now` (>= `since`) on creation, so it is immediately counted as "practiced" and folds into `poolSize`/`repeatCount` without ever having been served as an "unpracticed" card in this practice session. The "Session complete — you practiced all N cards" copy would then slightly overstate what the practice screen itself served. This is a natural extension of the plan's own accepted "cross-flow interleave" edge case (queries.ts header comment + active-plan.md line 69), just one layer further (new-card case, not just re-rating), and is very low probability for an owner-only course with light concurrent flow-switching. Not blocking.

## Assertions Checked
- **Tier predicates match spec** (active-plan.md lines 19-23): PASS. Tier 1 `gte(lastReview, since) AND lte(due, now)`, Tier 2 `isNull(lastReview) OR lt(lastReview, since)` random-ordered, Tier 3 `gte(lastReview, since) AND gt(due, now) AND lte(due, dayEnd)` — verified byte-for-byte against `queries.ts:424-455`.
- **`lastReview IS NULL` handling**: PASS. Nullable per schema (`lib/db/schema.ts:409`); `or(isNull(...), lt(...))` correctly treats never-rated pool cards as unpracticed; `gte`/`gt` comparisons against a NULL `lastReview` column naturally evaluate false in Postgres, so tiers 1/3 correctly exclude never-rated cards without extra guards.
- **`since` validation bounds**: PASS. `Number.isInteger(sinceMs) && sinceMs <= now.getTime() && sinceMs >= startOfThailandDay(now).getTime()` (page.tsx:45-48) matches plan exactly; traced multiple adversarial inputs (`undefined`, `"123.5"`, `"1e10"`, `" "`, `"-1"`, array) — all correctly fail-safe to a fresh redirect, no SQL injection surface since `since` is only ever passed as a `Date` into Drizzle's typed comparison helpers, never into a raw `sql` template.
- **Thai-day boundaries**: PASS. Uses `startOfThailandDay`/`endOfThailandDay` from `lib/review/time.ts` unchanged (no hand-rolled offset), consistent with `getAdvancedStudyData`.
- **SQL/Drizzle correctness — joins scoped to learner, kind filter on every tier, random() only on tier 2**: PASS. All 6 queries in `getAdvancedPracticeData` share the same `poolFilter = and(eq(learnerId), eq(kind))` composed via `innerJoin(atCards, ...)`; only the tier-2 (`unpracticedRow`) query has `.orderBy(sql\`random()\`)`; tiers 1/3 order by `due ASC`; counts have no `orderBy`/`limit`. No cross-learner or cross-kind leakage found.
- **Route safety — notFound before data leak**: PASS. `page.tsx:25-29` — `auth()` + `isAdvancedThaiLearner` check and `notFound()` happen strictly before `await params` (kind) or any DB read, mirroring `[theme]/page.tsx`'s established pattern.
- **kind validation**: PASS. `AT_CARD_KINDS.includes(kindParam as AtCardKind)` gate before use; unknown kind -> `notFound()`.
- **Redirect loop risk**: PASS (verified no loop under normal or adversarial clocks). Each request computes a fresh `now`; the redirect target embeds that request's `now.getTime()`, and the *next* request's own fresh `now2` will always satisfy `sinceMs <= now2.getTime()` (equal at worst, never less, since clocks only move forward on a single server). Exactly-equal edge (`since === now`) is inclusive (`<=`) on both bounds, so no loop.
- **Reuse integrity — AdvancedReviewSession/submitAdvancedReview unchanged**: PASS. Both files are untouched (confirmed via `git status`); `advanced-practice-screen.tsx` imports `AdvancedReviewSession` directly with no wrapper. Confirmed via the bundled Next docs that `refresh()` (called inside `submitAdvancedReview`) re-renders the *current* route from a Server Action — i.e., preserves the calling route's search params (`?since=`) — matching the plan's claim.
- **No accidental change to per-theme flow or daily new-card cap**: PASS. `getAdvancedStudyData`/`getThemeSummaries` diffed and unchanged in logic (only whitespace-adjacent additions of the two new functions below them); `getAdvancedPracticeData` has no `ensureLearnerSettings` call and no cap logic, matching the plan's explicit scope note.
- **Consistency with existing idioms**: PASS. `advanced-practice-screen.tsx` mirrors `advanced-study-screen.tsx`'s shell (ThaiFontProvider, sticky glass header, SegmentedControl, `key={card.id}` remount) almost verbatim; `advanced-thai-home.tsx`'s new "Practice by type" section reuses the same `bg-surface`/`border-border-base`/`shadow-[var(--glass-shadow)]`/`tabular-nums` classes as the existing theme rows.
- **Owner-only guard (404, not access-denied)**: PASS by inspection, matches `[theme]/page.tsx`'s established comment/rationale.

## Commands Run
Re-run independently, not copy-pasted from the implementer's handoff.

- `npx tsc --noEmit` — exit 0
  ```
  (no output — clean)
  ```
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
- `npm test` — exit 0
  ```
  ℹ tests 111
  ℹ suites 0
  ℹ pass 111
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 761.6453
  ```
- `git status --porcelain=v1` (scoped to non-`.claude` paths) — confirms exactly the 5 files/dirs named in the plan changed, no extra or missing files.
- `git diff --stat` on the 3 modified files — 291 insertions / 5 deletions total, consistent with additive-only changes (no unrelated edits to `getThemeSummaries`/`getAdvancedStudyData`).

All three results match the implementer's handoff exactly (same exit codes, same test count/pass count, 111/111). No mismatch found between claimed and actual output.

## Residual Risk
- No unit tests exist for `getKindSummaries`/`getAdvancedPracticeData` (or, for that matter, any of `lib/advanced-thai/queries.ts`'s existing functions) — this is consistent with the pre-existing codebase pattern (DB-query-heavy functions in this app are not unit tested; confirmed via `Glob` that no `lib/**/queries.test.ts` exists anywhere, including for the older `getAdvancedStudyData`/`lib/review/queries.ts`), so this is not a regression introduced by this feature, but it does mean the tier-predicate logic verified above was checked by close reading only, not by an executable test against real rows.
- Manual browser/DB verification (plan's Verification step 3-5: live `?since=` flow, Again-card resurfacing, grammar-card rendering in the mixed queue, owner-only 404) was explicitly left undone by the implementer per the handoff, and this review did not perform it either, per the task's explicit instruction not to run the dev server or hit the production DB. This is the single largest gap between "reviewed" and "verified in production" for this feature — recommend the owner do the manual pass in the plan's Verification section before considering this fully done, or route to qa-engineer if a safe (non-destructive) QA pass is desired.
- The three LOW findings above (redirect-type no-op comment, unused `totalCards`, poolSize/repeatCount drift on cross-flow new-card interleave) are all edge-case/documentation-quality issues, not functional bugs, and none block shipping.

## Procedure Compliance
- Plan consulted before review: yes (`active-plan.md` read in full)
- Implementation summary read: yes (`implementation-summary.md` read in full)
- Review summary written: yes

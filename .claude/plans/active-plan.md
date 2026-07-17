# Advanced Thai: cross-theme practice by card type

## Context

The Advanced Thai course (M16, owner-only) currently only offers per-theme review sessions: `getAdvancedStudyData` scopes every queue query to one `themeId`, and cards surface in due-order/deck-order. The owner wants a practice mode that pulls **all vocabulary cards (or all grammar, or all phrase cards) across every theme together, in random order, with FSRS still applying** — ratings recorded to `at_review_states`/`at_review_logs` and moving real due dates.

Decisions confirmed with the owner:
- **Pool = only cards already introduced** (have an `at_review_states` row) of the chosen kind, across all themes — due or not. Unseen cards stay in the per-theme flow; the daily new-card cap is untouched.
- **Random order** within the session.
- **FSRS-driven repeats**: a card rated Again/Hard resurfaces within the session once due again (mirrors the per-theme tier-3 "future-today" behavior). Session ends when the pool is exhausted and no repeat is due before end of Thailand day.

## Session-tracking design (the core problem)

The flow stays server-driven one-card-at-a-time (existing idiom), so the server must know which non-due cards were already practiced this session. Solution: a `since` timestamp searchParam.

- First load without a valid `since` → `redirect(\`/advanced-thai/practice/${kind}?since=${Date.now()}\`, RedirectType.replace)` (replace so Back goes home).
- **Validity guard**: `since` must be a finite integer, `<= now`, and `>= startOfThailandDay(now).getTime()`; otherwise replace-redirect to a fresh one. Server clocks only — `lastReview` is also server-stamped.
- **Practiced-this-session** = `lastReview >= since`. **Unpracticed** = `lastReview IS NULL OR lastReview < since` (NULL branch defensive; `submitAdvancedReview` always sets it). Cards reviewed earlier today in the per-theme flow have `lastReview < since` → correctly eligible.
- **Three-tier pick** (mirrors `getAdvancedStudyData`'s reasoning — a just-failed card is not yet `due <= now`, so it can't immediately repeat):
  1. REPEAT-READY: `lastReview >= since AND due <= now`, ORDER BY due ASC
  2. UNPRACTICED: pool card with `lastReview IS NULL OR lastReview < since`, `ORDER BY random()` LIMIT 1
  3. FUTURE-TODAY REPEAT: `lastReview >= since AND due > now AND due <= endOfThailandDay(now)`, ORDER BY due ASC
  - All empty → session complete.
- Mid-session refresh keeps `?since` → session continues. `refresh()` (from `next/cache`, verified in Next 16.2.6 docs) re-renders the calling route with query string intact, so `submitAdvancedReview` needs **no changes**.
- Per-request `ORDER BY random()` replaces a seeded shuffle: the server serves one card at a time and repeat tiers are due-ordered anyway. Indexes already cover the queries (`at_cards_kind_idx`, `at_review_states_learner_due_idx`); pool is small.

## Files

### 1. `lib/advanced-thai/types.ts` (edit)
- Add `export const AT_CARD_KINDS = ["vocab", "grammar", "phrase"] as const;` and derive `AtCardKind` from it (replaces the hand-written union at line 12) so route validation and the home section share one list.
- Add:
  - `AtPracticeCounts { remaining: number; repeatCount: number; poolSize: number }` — unpracticed left / practiced cards due again before end of Thai day / all seen cards of this kind.
  - `AtKindSummary { kind: AtCardKind; seenCards: number; totalCards: number }`.

### 2. `lib/advanced-thai/queries.ts` (edit — two new functions)
- **`getKindSummaries(learnerId)`** — one grouped query (same `db.execute(sql...)` style as `getThemeSummaries` at :74): `LEFT JOIN at_review_states` scoped to learner, `GROUP BY c.kind`, returning per-kind `total_cards` / `seen_cards`. Map into fixed `AT_CARD_KINDS` order, zero-fill absent kinds, skip unknown kinds (same rationale as `toStudyCard`'s default branch).
- **`getAdvancedPracticeData(learnerId, kind, since, now = new Date())`** → `{ counts: AtPracticeCounts; card: AtStudyCard | null; hints }` — structured like `getAdvancedStudyData` (:160): `Promise.all` of small Drizzle selects, then the same card+state hydration (`toStudyCard` :34, `hydrateFsrsCard`, `previewIntervals` — rating buttons show real intervals). No `ensureLearnerSettings`, no cap logic (unseen cards excluded by construction: every query inner-joins `at_review_states`).
  - All tiers: `innerJoin(atCards, eq(atCards.id, atReviewStates.cardId))` + `eq(atReviewStates.learnerId, learnerId)` + `eq(atCards.kind, kind)`, plus the tier predicates above.
  - Counts: `remaining` = tier-2 where-count; `repeatCount` = `gte(lastReview, since) AND lte(due, dayEnd)` count; `poolSize` = learner+kind count.
  - Chosen id: `tier1 ?? tier2 ?? tier3`; none → `{ counts, card: null, hints: null }`.

### 3. `app/advanced-thai/practice/[kind]/page.tsx` (new)
Modeled on `app/advanced-thai/[theme]/page.tsx`:
1. `auth()` + `isAdvancedThaiLearner` (`lib/advanced-thai/access.ts`) → `notFound()` (allowlist course, leak nothing).
2. `const { kind } = await params` (params/searchParams are Promises in this Next version); validate against `AT_CARD_KINDS` else `notFound()`.
3. Parse/validate `since` (take first if array); invalid/stale → replace-redirect with fresh `since`.
4. `getAdvancedPracticeData(...)` → render `<LangSync activeMode="advanced-thai" />` + `<AdvancedPracticeScreen kind counts card hints />`.

Route note: the static `practice` segment beats the `[theme]` dynamic sibling; bare `/advanced-thai/practice` falls into `[theme]`, fails theme lookup, 404s — fine. Add a one-line comment reserving the `practice` slug (no future theme may use it).

### 4. `components/advanced-thai/advanced-practice-screen.tsx` (new client component)
Sibling of `advanced-study-screen.tsx` (deliberate-duplication idiom from the queries.ts header — counts shape and empty state genuinely differ):
- Same shell: `ThaiFontProvider` + looped/loopless `SegmentedControl`, sticky header, "← Themes" link to `/`, title "Vocabulary · practice" (kind → Vocabulary / Grammar / Phrases).
- Counts line: `Left {remaining} · Repeats {repeatCount}` (replaces Due/New).
- Card area: `card && hints ? <AdvancedReviewSession key={card.id} card={card} hints={hints} /> : <PracticeComplete />`. **`AdvancedReviewSession` is reused unchanged** — it dispatches purely on `card.kind` and calls `submitAdvancedReview`, whose `refresh()` re-renders this route with `?since` intact.
- `PracticeComplete` (local; like `AllCaughtUp` but **no top-up button** — cap/unseen out of scope here):
  - `poolSize > 0`: "Session complete — you practiced all {poolSize} {label} cards" + note that ratings counted toward the real schedule + back link.
  - `poolSize === 0` (deep link before any card of this kind is seen): "Nothing to practice yet" explainer.

### 5. `components/advanced-thai/advanced-thai-home.tsx` (edit)
- `const [themes, kinds] = await Promise.all([getThemeSummaries(learnerId), getKindSummaries(learnerId)]);`
- Below the theme list (when themes exist), add a "Practice by type" section: three compact rows styled like the theme cards, each showing label + `{seenCards} cards` (tabular-nums matching existing counts style). `seenCards > 0` → `Link` to `/advanced-thai/practice/${kind}`; else non-interactive muted row ("no cards yet").

### No changes
`lib/advanced-thai/actions.ts` (`submitAdvancedReview` re-checks allowlist, accepts any at_card id, sets `lastReview = now`, `refresh()`), `lib/review/scheduler.ts`, `lib/review/time.ts`, `advanced-review-session.tsx`, `rating-buttons.tsx`, schema (no migration).

## Edge cases (accepted)
- **Second session same day**: re-entering from home mints a fresh `since`; whole pool eligible again. Intended — FSRS still records every rating truthfully.
- **Cross-flow interleave**: rating a card in the per-theme flow mid-practice marks it practiced-this-session. Harmless.
- **Tier-3 early serve**: an Again card (due ~1 min) can surface seconds early when it's the last thing left — identical to existing per-theme tier-3 behavior.
- **Thai-midnight boundary**: repeats scheduled past midnight drop out mid-session — matches per-theme semantics.
- **`remaining` reads 0 during repeat-drain** while cards still appear — the `Repeats` count in the header explains why; show both.

## Verification
1. `npx tsc --noEmit` (or the repo's typecheck script) after each layer.
2. Local dev against a Neon branch is NOT needed — read-only new queries + reuse of the existing rating action; but remember `.env.local` DATABASE_URL **is production** (memory), so manual testing happens as real owner data, which is acceptable here (practice ratings are real ratings by design).
3. Manual flow on localhost: home shows the three practice rows with seen counts → start Vocabulary practice → URL gains `?since=` → cards from BOTH themes appear in random order → rate one Again → after its step elapses it resurfaces (tier 1/3) → refresh mid-session keeps position semantics → finish session → "Session complete" (no top-up button) → re-enter for a fresh session → confirm `at_review_states.due` moved for practiced cards.
4. Grammar practice specifically: grammar cards have `audioUrl: null` and don't flip — confirm `AdvancedReviewSession` renders them fine in the mixed-theme queue (it dispatches on kind, so it should).
5. Owner-only guard: hitting `/advanced-thai/practice/vocab` as a non-allowlisted user → 404.

## Execution order
types.ts → queries.ts (+ typecheck) → route page → practice screen → home section → manual verify.

# Handoff: Advanced Thai — cross-theme practice by card type
Agent: implementer | Date: 2026-07-17 | Status: COMPLETE

## Completed
- `lib/advanced-thai/types.ts` — added `AT_CARD_KINDS` const array + derived `AtCardKind` (replaces the hand-written union), `AtPracticeCounts` (`remaining`/`repeatCount`/`poolSize`), and `AtKindSummary` (`kind`/`seenCards`/`totalCards`).
- `lib/advanced-thai/queries.ts` — added `getKindSummaries(learnerId)` (grouped `LEFT JOIN` by `c.kind`, zero-filled against `AT_CARD_KINDS`, unknown kinds skipped) and `getAdvancedPracticeData(learnerId, kind, since, now)` (three-tier repeat-ready / unpracticed(random) / future-today pick over the already-introduced pool, `Promise.all`'d count queries for `remaining`/`repeatCount`/`poolSize`, same card+state hydration path as `getAdvancedStudyData` via `toStudyCard` + `hydrateFsrsCard` + `previewIntervals`).
- `app/advanced-thai/practice/[kind]/page.tsx` (new) — allowlist guard via `isAdvancedThaiLearner` → `notFound()`, `kind` param validated against `AT_CARD_KINDS` → `notFound()`, `since` searchParam validated (finite integer, `<= now`, `>= startOfThailandDay`) with replace-redirect to mint a fresh session when invalid/missing, renders `<LangSync>` + `<AdvancedPracticeScreen>`.
- `components/advanced-thai/advanced-practice-screen.tsx` (new) — client shell sibling to `advanced-study-screen.tsx`: `ThaiFontProvider`, sticky header with "← Themes" link + letterform `SegmentedControl`, "Left N · Repeats N" counts line, reuses `AdvancedReviewSession` unchanged for the card area, local `PracticeComplete` empty state (no top-up button — pool has no cap to raise) with two copies depending on `poolSize > 0`.
- `components/advanced-thai/advanced-thai-home.tsx` — now fetches `getKindSummaries` alongside `getThemeSummaries` in one `Promise.all`; added a "Practice by type" section below the theme list (only rendered once at least one theme exists) with one row per kind, `Link` to `/advanced-thai/practice/${kind}` when `seenCards > 0`, otherwise a non-interactive muted "no cards yet" row.

All five files match the plan in `.claude/plans/active-plan.md` with no deviations. This continuation session picked up after an API error interrupted the prior session immediately before the typecheck step; all file edits had already landed per `git status` at the start of this continuation, so this session's work was verification (typecheck/lint/tests) plus this handoff — no further code changes were made.

## Left Undone
- Manual browser verification (plan's Verification step 3: home page rows, `?since=` session flow, Again-card resurfacing, refresh-mid-session, grammar-card rendering, owner-only 404 guard) was not performed — this requires a live dev server + real owner-account session against the production DB per the plan's own note (`.env.local` DATABASE_URL is production). Left for the owner or a follow-up QA pass; not something the implementer should do unattended given the "real production data" caveat.

## Commands Run
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
  ℹ duration_ms 903.1924
  ```

## Issues Discovered
- `.claude/plans/implementation-summary.md` contained a stale handoff from an unrelated prior task (Advanced Thai theme 2 content build, dated the same day) when this continuation session started. It has been overwritten with this handoff per the required chain; the prior content is preserved in git history if needed.
- No code issues — the pre-interruption edits typechecked, linted, and passed the full existing test suite on the first attempt in this continuation session, with no fixes needed.

## Spec Deviations
- None identified against `active-plan.md`. Implementation matches the plan's file list, tier logic, count semantics, empty-state copy, and route-reservation comment for the `practice` static segment.

## Procedure Compliance
- Plan consulted before coding: yes (read `.claude/plans/active-plan.md` in full before verifying/continuing)
- Tests run before finishing: yes — see `npx tsc --noEmit` (exit 0), `npm run lint` (exit 0), and `npm test` (`ℹ tests 111 ... ℹ pass 111 ... ℹ fail 0`) under Commands Run above
- Handoff written: yes

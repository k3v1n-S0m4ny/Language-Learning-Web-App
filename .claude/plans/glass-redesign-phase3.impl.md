# Handoff: Glass Redesign — Phase 3 (Stats + celebrations)
Agent: implementer | Date: 2026-07-04 | Status: COMPLETE

## Completed

### New UI primitives
- `components/ui/count-up.tsx` — animated 0→value count-up via `motion`'s
  `animate()` driving local state through `onUpdate`/`onComplete` callbacks
  (never a direct synchronous `setState` in the effect body itself — see
  Issues Discovered re: the `react-hooks/set-state-in-effect` lint rule).
  `useReducedMotion()` gates a no-op effect; render uses `value` directly
  (not the animated `display` state) when reduced motion is on, so the
  fallback path never touches state at all. `onComplete` always snaps to the
  exact `value` prop — no off-by-one from a mid-flight rounded frame.
- `components/ui/stat-card.tsx` — server-safe (no hooks) glass-language
  metric card; `hero` renders `.text-display`; `accent` puts a small
  decorative left rule on the LABEL, never on the value text itself (see
  Issues Discovered — raw `--accent` fails AA as small text on a light
  surface). Reuses the existing "solid elevated" recipe (border + bg-surface
  + `var(--glass-shadow)`) rather than `.glass` blur, consistent with the
  "content surfaces stay solid" rule and the a11y finding below.
- `components/ui/celebration.tsx` — dependency-free `motion`-particle
  confetti burst + spring "pop" on the wrapped children, gated on `show`.
  Handles both call-site shapes (already-true at mount, and flipping true
  later on an already-mounted instance) via React's documented "adjust state
  during render" pattern (a lazy `useState` initializer for the mount-true
  case + a plain conditional `setState` call during render for the
  later-transition case) — deliberately NOT a `useEffect`, to avoid
  `react-hooks/set-state-in-effect` (see Issues Discovered). The actual
  confetti overlay is a separate `ConfettiBurst` subcomponent, mounted fresh
  per burst via `key`, whose own one-shot timeout calls `setState` from
  inside the `setTimeout` callback (the sanctioned async-callback exception
  to that same lint rule). `useReducedMotion()` skips confetti + the spring
  pop entirely, rendering children in a plain `<div>`. Particle colours cycle
  `var(--accent)`/`var(--accent-2)`/`var(--accent-3)`, resolving per
  `[data-lang]` automatically.
- `components/stats/glass-tooltip.ts` — shared `contentStyle`/`labelStyle`/
  `itemStyle` CSSProperties objects (Recharts v3.8.1 types these as plain
  `CSSProperties`, so no custom `content` render component with
  version-sensitive generics was needed), reused by every chart on both
  stats pages.
- `components/thai/stats/heat-scale.ts` — shared 5-stop glass-native
  intensity ramp (`HeatStop` 0-4), reused by `failure-heatmap.tsx` (full
  0-4) and `tone-confusion-matrix.tsx` (1-4; its 0/no-data cells keep the
  existing neutral `bg-background`, unchanged). Deliberately built as a
  static `Record<HeatStop, string>` lookup of COMPLETE class strings, not a
  template-literal-interpolated `bg-[var(--heat-${stop})]` — Tailwind's
  build-time scanner only discovers whole class names that appear verbatim
  in source, so an interpolated string would silently never generate any
  CSS (caught this before it shipped; see Issues Discovered).

### Tokens + AA (`app/globals.css`)
- Added the `--heat-0`..`--heat-4` background tokens + a matching
  `--heat-N-ink` text-colour token per stop (light `:root` set + a separate
  `:root[data-theme="dark"]` override set — deeper/muted floor, brighter
  ceiling, mirroring how the Thai class/tone tokens already invert
  light/dark treatment). NOT tied to `--accent` — this is a generic
  severity scale shared by two components regardless of active language.
- Appended a full "Phase 3" AA block to the existing contrast-ratio comment
  table (same format as Phases 0-2), documenting every computed ratio for
  the heat ramp (both themes) and the accent-as-text findings below.
- Documented, in the CSS comment itself, that the `dataviz` skill referenced
  by the brief could not be located anywhere on disk in this environment
  (searched `~/.claude/skills` and the broader user profile — nothing named
  `dataviz` exists) — see Issues Discovered for what was done instead.

### Charts (Mandarin `components/stats/*`, Thai `components/thai/stats/*`)
- `reviews-chart.tsx`, `forecast-chart.tsx`, `accuracy-by-unit-chart.tsx`,
  `drill-activity-chart.tsx`: hardcoded `#62736f`/`#1a7a40` series hexes →
  `var(--accent)`; radius bumped `[2,2,0,0]` → `[4,4,0,0]`; glass tooltip
  style props; `isAnimationActive={!reduceMotion}`.
- `mastered-over-time-chart.tsx`: `LineChart`/`Line` → `AreaChart`/`Area`
  with an accent-tinted vertical gradient (35%→0% opacity), `strokeWidth=2`,
  a custom `dot` function that renders a circle ONLY on the last data point
  (every interior point stays dot-free) plus `activeDot` for hover; glass
  tooltip; reduced-motion gated.
- `rating-chart.tsx` (Mandarin, functional FSRS ramp): `RATING_COLORS`
  retokened from its own standalone earthy hex set onto the SAME
  `var(--rate-again/hard/good/easy)` tokens the on-screen rating buttons
  already use — see Spec Deviations for why this reading of "leave the ramp
  semantics" was chosen over leaving the old hex set in place. Radius bumped
  `[0,2,2,0]` → `[0,4,4,0]`; glass tooltip; reduced-motion gated.
- `failure-heatmap.tsx`, `tone-confusion-matrix.tsx`: `cellColor()` now
  returns `heatCellClass(stop)` from the shared ramp instead of
  `bg-sage`/`bg-peach`/`bg-highlight`/`bg-clay`/`bg-easy`. The matrix's
  zero-count cells keep `bg-background` unchanged (no ink override — no
  text ever renders in an empty cell, so there's nothing to verify AA
  against); its `<td>` fallback text colour changed `text-on-earthy` →
  `text-foreground` (the per-stop ink class now supplies the real color when
  a heat stop applies). Both files' empty-state/radius classes retokened to
  `--r-md`.
- `streak-calendar.tsx`: `bg-brand` → `bg-accent`; `rounded-sm` → `rounded-
  [3px]` (kept the same visual size, just off the raw Tailwind scale for
  consistency with the token-driven radii elsewhere).

### Pages
- `app/stats/page.tsx` (Mandarin): dropped `bg-background` from `<main>`;
  `<h1>` → `.text-display`; "Back to study" pill → `--r-pill`; `LearnerColumn`
  → `rounded-[var(--r-lg)] border border-border-base bg-surface shadow-
  [var(--glass-shadow)]` (the same "solid elevated" recipe as the flip-card
  faces, not `.glass` blur); added a hero `StatCard accent` with `<CountUp
  value={stats.seen}/>` and `sub={pct% of total}` (the `accent` prop is
  exercised here — the decorative label rule, not the value text, per the
  AA finding in Spec Deviations); replaced the old `StatTile` grid with
  `StatCard` (non-hero) tiles for Mature/Streak/Leeches, same figures.
- `app/thai/stats/page.tsx`: `<h1>` → `.text-display`; `Section` wrapper
  retokened to the same solid-elevated recipe (this was explicitly deferred
  to Phase 3 by the Phase 2 handoff); added a hero `StatCard accent` with
  `<CountUp value={itemsMastered}/>` (derived as `masteredOverTime.at(-1)
  ?.count ?? 0` — cumulative, last value, no new query) plus a 3-tile metric
  row: current streak (new `currentStreakFromCalendar()` helper walking the
  already-fetched `streakCalendar` trailing run, same "today with zero
  activity yet doesn't reset the streak" semantics as
  `lib/review/stats.ts`), 30-day drill attempts (sum of `drillActivity`),
  and units-with-data (`accuracyByUnit.length`) — all derived in the page
  from data `getThaiStats` already returns, no new queries, no
  `lib/thai/stats.ts` changes (only a type-only `import { type StreakDay }`
  was added).

### Celebration wiring
- **Thai unit unlock** (`components/thai/drill/drill-session.tsx`): wrapped
  the existing "🎉 Unit N unlocked!" banner in `<Celebration show>`, gated
  exactly as before by `unlockedThisRound` (`nextUnitNewlyUnlocked &&
  !nextUnitWasUnlocked`). Banner text/logic unchanged.
- **Mandarin deck cleared** (see Spec Deviations for the full reasoning):
  - `components/review-session.tsx`'s `rate()` now sets
    `sessionStorage['review-session:rated'] = '1'` before submitting (wrapped
    in try/catch for private-mode/storage-disabled, matching the existing
    `ui/theme-toggle.tsx` guard convention). This is the only touch to the
    review flow; `submitReview` itself is untouched.
  - `components/empty-state.tsx` — converted to a client component. Reads
    both sessionStorage flags via `useSyncExternalStore` (mirroring
    `ui/theme-toggle.tsx`'s existing pattern for exactly this "read a
    browser-only external source once, safely across SSR" problem) rather
    than `useEffect+useState`, then marks `mandarin:cleared-fired` in a
    SEPARATE plain `useEffect` that contains no `setState` call at all (just
    the storage write). Renders the SAME quiet "All caught up" glass card
    every time; only the confetti prop (`show={celebrate}`) differs based on
    the gate.

## Left Undone
- No live browser/Chrome-DevTools screenshot pass (light+dark, reduced-
  motion emulation, mobile viewport, hover/focus on tooltips) — matches how
  Phases 1/2 scoped this to the code-reviewer/qa-engineer stage, not an
  implementer deliverable.
- Streak-landmark celebration trigger — explicitly OPTIONAL per the brief
  ("only wire it if a clean, already-computed signal exists without new
  logic"); no such signal exists without inventing one, so left undone/
  deferred, per the brief's own instruction not to invent a query for it.
- Out-of-scope items the brief itself deferred to Phase 4: full AA re-audit
  sweep, reduced-motion device sweep, cross-device + hanzi legibility pass,
  bundle-size check, Vercel preview cutover.

## Commands Run
- `npm test` — exit 0
  ```
  ℹ tests 24
  ℹ suites 0
  ℹ pass 24
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 4417.6888
  ```
- `npm run build` — exit 0
  ```
  ✓ Compiled successfully in 41s
    Running TypeScript ...
    Finished TypeScript in 56s ...
    Collecting page data using 10 workers ...
  ✓ Generating static pages using 10 workers (6/6) in 3.8s
    Finalizing page optimization ...

  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ```
  (Same pre-existing two-lockfile Turbopack workspace-root warning as every
  prior phase — not new, harmless. No other warnings.)
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint

  ```
  (no findings; this took two iterations — the first attempt failed with 3
  `react-hooks/set-state-in-effect` errors across `count-up.tsx`,
  `celebration.tsx`, `empty-state.tsx`, all fixed as described in Issues
  Discovered before this clean run.)
- `git status --porcelain` (full) — exit 0
  ```
   M .claude/plans/glass-redesign.handoff.md
   M app/globals.css
   M app/stats/page.tsx
   M app/thai/stats/page.tsx
   M components/empty-state.tsx
   M components/review-session.tsx
   M components/stats/forecast-chart.tsx
   M components/stats/rating-chart.tsx
   M components/stats/reviews-chart.tsx
   M components/thai/drill/drill-session.tsx
   M components/thai/stats/accuracy-by-unit-chart.tsx
   M components/thai/stats/drill-activity-chart.tsx
   M components/thai/stats/failure-heatmap.tsx
   M components/thai/stats/mastered-over-time-chart.tsx
   M components/thai/stats/streak-calendar.tsx
   M components/thai/stats/tone-confusion-matrix.tsx
  ?? .claude/plans/glass-redesign-phase3.plan.md
  ?? components/stats/glass-tooltip.ts
  ?? components/thai/stats/heat-scale.ts
  ?? components/ui/celebration.tsx
  ?? components/ui/count-up.tsx
  ?? components/ui/stat-card.tsx
  ```
  (`.claude/plans/glass-redesign.handoff.md` was already modified before
  this session started, per the environment's initial `gitStatus` block —
  not touched by this phase.)
- `git --no-pager diff --stat` — exit 0
  ```
   .claude/plans/glass-redesign.handoff.md            | 118 ++++++++++++++-------
   app/globals.css                                    |  90 ++++++++++++++++
   app/stats/page.tsx                                 |  62 +++++------
   app/thai/stats/page.tsx                            |  50 ++++++++-
   components/empty-state.tsx                         |  76 +++++++++++--
   components/review-session.tsx                      |  13 +++
   components/stats/forecast-chart.tsx                |  26 +++--
   components/stats/rating-chart.tsx                  |  32 ++++--
   components/stats/reviews-chart.tsx                 |  26 +++--
   components/thai/drill/drill-session.tsx            |  13 ++-
   components/thai/stats/accuracy-by-unit-chart.tsx   |  24 ++++-
   components/thai/stats/drill-activity-chart.tsx     |  24 ++++-
   components/thai/stats/failure-heatmap.tsx          |  18 ++--
   components/thai/stats/mastered-over-time-chart.tsx |  59 +++++++++--
   components/thai/stats/streak-calendar.tsx          |   4 +-
   components/thai/stats/tone-confusion-matrix.tsx    |  22 ++--
   16 files changed, 515 insertions(+), 142 deletions(-)
  ```
  No `lib/**` or `seed/**` path appears anywhere in this diff — confirms
  constraint #1 (pure frontend, no logic/data changes).
- `grep -n -E "bg-sage|bg-peach|bg-clay|bg-highlight" components/thai/stats/failure-heatmap.tsx components/thai/stats/tone-confusion-matrix.tsx` —
  exit 1 (grep convention: no matches found), zero output — clean.
- `grep -rn -E "#62736f|#1a7a40" components/stats components/thai/stats` —
  exit 1, zero output — clean (includes `rating-chart.tsx`, which no longer
  contains the old `#1a7a40` hex anywhere, per the retoken decision above).
- Final re-verification after adding `accent` to both hero `StatCard`s (the
  last edit made): `npm run build` — exit 0, `✓ Compiled successfully in
  4.4s` / `✓ Generating static pages using 10 workers (6/6) in 659ms`, same
  route list, same single pre-existing lockfile warning, no new warnings;
  `npm run lint` — exit 0, no output; `npm test` — exit 0, `ℹ tests 24 /
  ℹ pass 24 / ℹ fail 0`.

## Issues Discovered
- **`react-hooks/set-state-in-effect` (a stricter React-19-era lint rule
  already active in this repo's `eslint-config-next`) rejected my first pass
  at `count-up.tsx`, `celebration.tsx`, and `empty-state.tsx`** — all three
  called a state setter directly/synchronously at the top level of a
  `useEffect` body. Fixed by:
  - `count-up.tsx`: making the reduced-motion path render `value` directly
    (no state involved) instead of setting state inside the effect; the
    non-reduced path already only calls `setDisplay` from inside `animate()`
    's async callbacks, which the rule doesn't flag.
  - `celebration.tsx`: replaced the `useEffect`-driven burst trigger with
    React's documented "adjust state during render" pattern (comparing
    `show` vs a `prevShow` state during render, calling `setBurstId`
    conditionally in the render body — NOT inside an effect) for reacting to
    a later `show` transition, plus a lazy `useState` initializer for the
    already-true-at-mount case. The actual auto-clear-after-1600ms timer
    lives in a separate `ConfettiBurst` subcomponent whose `setState` call is
    inside a `setTimeout` callback (the rule's own documented exception:
    "calling setState in a callback function when external state changes").
  - `empty-state.tsx`: switched from `useEffect+useState` to
    `useSyncExternalStore` (exactly mirroring the existing
    `ui/theme-toggle.tsx` convention for the same underlying problem — safely
    reading a browser-only API once, with SSR falling back to a
    `getServerSnapshot`). The "mark as fired" write moved to its own
    `useEffect` that contains NO `setState` call (only a `sessionStorage`
    write), so the rule doesn't apply to it at all.
  This cost one extra lint→fix→relint cycle but is documented here since it
  meaningfully shaped all three new client components' structure — future
  Phase 4 work touching client components in this repo should expect this
  rule and reach for `useSyncExternalStore` or the render-time-adjustment
  pattern rather than `useEffect+useState` for "read once at mount" or
  "react to a prop transition" needs.
- **A CSS-comment `*/`-substring trap** (same class of bug as a prior
  session's `css-comment-slash-star-substring` finding): my first attempt at
  the Phase 3 AA-table comment wrote "`--thai-tone-*/--thai-class-*`" inline,
  and `tone-*/--thai` contains a literal `*/` that closed the surrounding
  `/* ... */` comment early — Turbopack's PostCSS pass then tried to parse
  the rest of the (still-commented-looking) prose as real CSS and failed
  with `CssSyntaxError: Unknown word invert`. Caught via the build error,
  reworded to avoid the `-*/-` sequence, rebuilt clean.
- **A Tailwind-scanner trap in the first draft of `heat-scale.ts`**: writing
  `bg-[var(--heat-${stop})]` as a template-literal string would never
  actually generate any CSS, since Tailwind's build-time source scanner only
  discovers class names that appear as COMPLETE, static strings in source —
  an interpolated `${stop}` breaks that. Rewrote as a static
  `Record<HeatStop, string>` lookup of five complete, literal class strings
  before this ever reached a build (caught during authoring, not via a
  build failure, but flagging it since it's the kind of bug that silently
  produces unstyled/invisible cells rather than an error).
- **The `dataviz` skill referenced by the Phase 3 brief could not be found
  anywhere on disk** — searched `~/.claude/skills`, the project's own
  `.claude/skills` (none exists), and the broader user home directory for
  anything named `dataviz`; nothing turned up, and no Skill-invocation tool
  was available in this session to load it another way. Proceeded instead
  with standard, well-established sequential-scale dataviz practice
  (single-hue warm ramp, monotonically increasing saturation/depth, modelled
  on ColorBrewer's OrRd-5 sequential class) and computed/documented AA
  ratios per stop exactly as the brief required. Flagging this so the
  code-reviewer/orchestrator knows the specific guidance document was
  unreachable rather than silently ignored.
- **Rating-chart's functional ramp genuinely conflicted with the grep
  instruction**, mirroring the same class of tension Phase 2 flagged for
  `failure-heatmap`/`tone-confusion-matrix`: the brief's per-surface bullet
  said "leave the ramp semantics" for `rating-chart.tsx`, but its own
  verification bullet asks to grep-confirm no `#1a7a40` remains in the chart
  files, and `rating-chart.tsx`'s `RATING_COLORS` array DID contain
  `#1a7a40` (as "Good") as part of that same functional ramp. Resolved by
  retokening the array onto the existing `var(--rate-*)` tokens (the SAME
  semantic Again/Hard/Good/Easy ramp already used by the on-screen rating
  buttons) rather than treating this as another "leave as documented
  exception" case — see Spec Deviations for why this reading was chosen.

## Spec Deviations
- **`rating-chart.tsx`'s `RATING_COLORS` retokened onto `var(--rate-*)`**,
  not left as its previous standalone earthy hex set. The brief's literal
  text only said "leave the ramp semantics... restyle the container/tooltip"
  — I read "semantics" as "the Again/Hard/Good/Easy → colour MAPPING", not
  "the literal hex values", and since `--rate-*` is already the canonical,
  AA-verified token set for that exact same semantic ramp (used by the
  actual rating buttons on the study screen), swapping the stats chart onto
  it unifies a real pre-existing inconsistency (the breakdown chart and the
  buttons used to show two different colour systems for the same four
  ratings) rather than introducing a new colour. This is the "simpler,
  better-supported interpretation" call per the ambiguity-resolution
  instruction; flagging for reviewer visibility since the brief's wording
  could be read more conservatively (as "don't touch the array at all").
- **StatCard's `accent` prop colours a decorative label rule, never the
  value text** — computed contrast shows raw `--accent` (jade `#12B886` /
  saffron `#F59E0B`) measures only ~2.15-2.55:1 as text on a light card,
  nowhere near the 4.5:1 floor (consistent with Phase 2's own
  `audio-play-button.tsx` finding). The brief's own fallback language
  ("if it misses, use text-foreground for the number and reserve accent for
  a small label/underline") anticipated exactly this outcome, so this is the
  brief's own expected resolution, not an unplanned deviation — flagging
  because it means `accent` never colours the number itself in EITHER theme,
  not just light mode (kept ONE rule for both themes rather than a
  per-theme branch, since dark mode's accent-on-card ratio does pass at
  5.74-6.82:1 but a single consistent rule was judged clearer than a
  theme-conditional one).
- **Mandarin "deck cleared" gate — the one genuinely under-specified wiring
  point, addressed exactly as the brief's own recommended approach, with one
  documented nuance**: implemented the `sessionStorage`
  `review-session:rated` / `mandarin:cleared-fired` two-flag gate exactly as
  suggested. The nuance: this fires on the FIRST empty-state render after
  ANY single rated review this session — it does not require having
  "cleared a multi-card queue," just "rated ≥1 review, then next saw an
  empty queue." If a learner's queue only ever had exactly one card due
  today, rating it will still trigger the "deck cleared" confetti, which is
  arguably a slightly generous reading of "genuine milestone" but is exactly
  the heuristic the brief itself proposed (rated-this-session AND not
  already fired) rather than a more conservative "cleared N≥2 cards" bar.
  I judged this NOT fragile/ambiguous enough to stop and flag as blocked
  (the brief's own suggested design, implemented faithfully, with a
  same-day-review one-shot guard preventing any idle-revisit false-fire) —
  but calling it out explicitly per the brief's instruction to document
  exactly what was done here, since the code-reviewer was asked to
  scrutinize this specific wiring point.
- **`streak-calendar.tsx`'s active-day cell**: `rounded-sm` → `rounded-[3px]`
  rather than a `--r-*` token (none of the existing radius scale steps
  — 8/14/22/30px — fit a 3px calendar cell without visually changing its
  size; used the literal pixel value instead, matching the exact prior
  visual size while dropping the raw Tailwind step name for consistency with
  how every other radius in this phase is expressed as an explicit value).
- **Thai stats hero metric-row figures ("Streak"/"Drills (30d)"/"Units
  drilled")** — the brief offered these as examples ("e.g.") of cheaply
  derivable figures, not a mandated exact set; I implemented exactly the
  three it named (current streak, total drill attempts, units-with-data),
  labelling the drill-attempts tile "Drills (30d)" (not just "Drills") since
  `drillActivity` is itself a 30-day-windowed field in `ThaiStats` — wanted
  the label to be honest about the window rather than implying an all-time
  count.

## Procedure Compliance
- Plan consulted before coding: yes — read
  `glass-redesign-phase3.plan.md`, `act-like-a-designer-toasty-yao.md`
  (Stats/Celebrations + Accessibility sections), and both
  `glass-redesign-phase2.plan.md`/`glass-redesign-phase2.impl.md` in full
  before touching any file, then read every in-scope page/component/chart
  file and the relevant `lib/thai/stats.ts` / `lib/review/stats.ts` data
  shapes before editing.
- Tests run before finishing: yes — `npm test` → `ℹ tests 24 / ℹ pass 24 /
  ℹ fail 0` (see Commands Run), plus `npm run build` and `npm run lint` both
  exit 0 (lint required one fix-and-relint cycle, documented above).
- Handoff written: yes (this file).

## Post-review fixes
Code review (`.claude/plans/glass-redesign-phase3.review.md`) came back
BLOCKED with 1 CRITICAL + 1 HIGH, plus a MEDIUM and a LOW to address without
blocking. All four fixed; re-verified below.

### 1. CRITICAL — tone-confusion-matrix `<td>` text-colour cascade collision
`components/thai/stats/tone-confusion-matrix.tsx`'s `<td>` had a hardcoded
`text-foreground` class SIMULTANEOUSLY with the per-stop `text-[var(--heat-
N-ink)]` class returned by `cellColor()`. Same specificity, same property —
Tailwind's compiled output happens to emit `.text-foreground` after all five
heat-ink rules, so it always won the cascade regardless of source order,
silently defeating the AA-tuned ink for every non-empty cell. Harmless at
stops 0-3 (`--foreground` happens to equal the intended ink there), but a
real AA failure at stop 4 (2.42:1 light / 2.65:1 dark — both fail 4.5:1,
contradicting the Phase 3 AA table in `globals.css`, which assumed the ink
override actually applied).
- Fix: removed the hardcoded `text-foreground` from the `<td>` className
  entirely. Folded the zero-count text colour into `cellColor()`'s own
  zero-count return (`"bg-background text-foreground"`), so the function's
  return value is now the ONLY text-colour utility ever applied to the cell
  — the two classes can never coexist again.
- Confirmed `components/thai/stats/failure-heatmap.tsx` has no competing
  `text-*` class on its cell — re-read the file, unaffected, left as-is.

### 2. HIGH — Celebration's spring pop not gated on `show`
`components/ui/celebration.tsx`'s spring "pop" (`motion.div` with
`initial={{scale:0.85,opacity:0}}`/`animate={{scale:1,opacity:1}}`) wrapped
`children` whenever `!reduceMotion`, with NO dependency on `show` — only the
confetti (`ConfettiBurst`/`burstId`) was actually gated by `show`. Since
`components/empty-state.tsx` wraps its entire "All caught up" card in
`<Celebration show={celebrate}>`, every idle EmptyState revisit
(`celebrate=false`, motion allowed) still played the whole-card scale/opacity
bounce — constraint #4 reserves the WHOLE celebration effect for a genuine
milestone, not just the confetti half.
- Fix: the ternary now branches on `show && !reduceMotion` — renders the
  animated `motion.div` only when `show` is true AND motion is allowed;
  renders a plain, un-animated `<div>` otherwise (covering both `!show` and
  `reduceMotion`).
- Confirmed `components/thai/drill/drill-session.tsx`'s unit-unlock call
  (`<Celebration show>`) is unaffected — it only ever mounts inside
  `{unlockedThisRound && (...)}`, so `show` is always `true` there; the pop
  still fires on mount exactly as before.

### 3. MEDIUM — Thai streak silently capped at 84 days
`app/thai/stats/page.tsx`'s `currentStreakFromCalendar` walks
`stats.streakCalendar`, an 84-day window (`lib/thai/stats.ts`'s
`calendarKeys`), so any streak longer than that silently displays as "84d"
forever — unlike the Mandarin streak (`lib/review/stats.ts`), which
deliberately walks 365 days of all-time logs to avoid exactly this cap. This
phase's brief forbids adding a new query/`lib/thai/stats.ts` change to fetch
a longer window, so shipping with the cap is acceptable, but it was not
documented anywhere.
- Fix: added a "CAVEAT (post-review, MEDIUM)" comment directly on
  `currentStreakFromCalendar` explaining the 84-day cap, why it can't be
  widened in this phase (no new query allowed), and that it is NOT parity
  with the Mandarin streak figure — so a future phase touching
  `lib/thai/stats.ts` knows to revisit it rather than assuming the number is
  exact. No code-behavior change (accepted as-is per the review's own
  "acceptable to ship with a documented caveat" guidance) — comment-only.
- **New Spec Deviation (added retroactively):** the Thai "Streak" hero-row
  tile is NOT behaviorally equivalent to the Mandarin "Streak" tile on
  `/stats` — Mandarin's is exact to 365 days, Thai's silently truncates at
  84 days. This asymmetry was an oversight in the original implementation
  pass (not previously called out), now documented both in-code and here.

### 4. LOW — sessionStorage flag written before awaiting submitReview
`components/review-session.tsx`'s `rate()` set
`sessionStorage['review-session:rated']='1'` BEFORE awaiting
`submitReview(card.id, rating)`, so a failed submit (network error, auth
expiry, invalid rating) still counted toward the "deck cleared" celebration
gate.
- Fix: moved the sessionStorage write to inside the `startTransition` async
  callback, AFTER `await submitReview(...)` resolves successfully — still
  wrapped in its own try/catch guard. If `submitReview` throws, the write is
  now skipped entirely (the throw propagates before reaching the write), so
  only a genuinely-completed review arms the gate.

### Re-verification (all re-run after all four fixes were applied)
- `npm test` — exit 0
  ```
  ℹ tests 24
  ℹ suites 0
  ℹ pass 24
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 210.2319
  ```
- `npm run build` — exit 0
  ```
  ✓ Compiled successfully in 4.7s
    Running TypeScript ...
    Finished TypeScript in 4.7s ...
    Collecting page data using 10 workers ...
  ✓ Generating static pages using 10 workers (6/6) in 684ms
    Finalizing page optimization ...

  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ```
  Same pre-existing two-lockfile Turbopack warning as every prior run — no
  new warnings.
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  No output/findings.
- Cascade-collision re-check (reasoned through source, the reviewer's own
  method): re-read `tone-confusion-matrix.tsx` after the fix — confirmed via
  `grep` that the `<td>` className template no longer contains a static
  `text-foreground` token anywhere, and `cellColor()`'s three return
  branches (`heatCellClass(1..4)` and the zero-count
  `"bg-background text-foreground"`) are now the ONLY text-colour utility
  ever concatenated into that className — there is no longer a second,
  competing text-color class for the cascade to arbitrate between, so the
  compiled-CSS emission order (whatever it is) can no longer matter.

# Glass redesign — Phase 3 (Stats + celebrations) — implementation brief

Branch `glass-redesign`. Phases 0/1/2 committed (HEAD `28dd313`). This phase delivers the
**Stats hero moment + glass metric cards + restyled charts** on BOTH stats pages, retokens the two
intensity ramps Phase 2 deferred, and adds the **milestone celebration** component (confetti + spring),
wired ONLY into genuine milestones.
**Pure frontend. No DB / schema / stats-logic (`lib/**`) changes.** Retoken + wiring + two new UI primitives.

Authoritative design: `C:\Users\User\.claude\plans\act-like-a-designer-toasty-yao.md`
(read "Per-surface specs → Stats/Celebrations", "Locked design decisions → Stats/Celebrations rows",
"Build order → Phase 3", "Accessibility"). North-star visual target: bake-off artifact #3 (stats & celebration).

## Hard constraints (do not violate)
1. **No logic/data changes.** `lib/review/stats.ts` and `lib/thai/stats.ts` produce the data — DO NOT touch
   them, their queries, or any `lib/**`. This is visual/interaction only. Verify with `git diff --stat` that
   `lib/**` and `seed/**` are untouched.
2. **Mandarin and Thai stay distinct systems** ([[mandarin-thai-distinct-card-design]]). Shared treatment
   (count-up hero, glass metric cards, area-filled charts, glass tooltips) but each page keeps its own
   accent (Mandarin jade `var(--accent)`; Thai saffron `var(--accent)` — already language-scoped by
   `[data-lang]` which `LangSync` sets on `<html>`). Don't flatten the two pages into one component.
3. **Every animation ships a reduced-motion fallback.** Count-up → instant final value under
   `prefers-reduced-motion: reduce`. Celebration → no confetti/bounce, a static/quiet state instead.
   Chart entry animations → Recharts `isAnimationActive={false}` when reduced-motion (or keep them off).
4. **Celebration is RESERVED for genuine milestones ONLY** — unit unlock / deck cleared / streak landmark.
   Do NOT fire on every correct answer, every navigation, or every EmptyState idle-revisit. See "Celebration
   wiring" for the exact gate on each trigger.
5. **"Flat" ≠ invisible (a11y).** Glass metric cards in dark mode must keep real value separation (the
   `.glass` recipe already gives specular edge + border + shadow — reuse it, don't hand-roll a flat tint).
6. **WCAG AA is a deliverable.** Any NEW functional color (metric-card accent text, chart series fills used
   as data encoding, the reworked intensity ramp) must clear AA in BOTH themes. Extend the globals.css table
   with a "Phase 3" block exactly as Phase 1/2 did — document computed ratios, tune hexes if they miss.

## New UI primitives (components/ui/) — build FIRST

### `components/ui/count-up.tsx` (client)
Animated count-up number using `motion` (already installed, v12).
- Props: `{ value: number; durationMs?: number; format?: (n: number) => string; className?: string }`.
- Use `useMotionValue` + `animate()` (or `useSpring`) from `motion/react`; on mount animate 0→value,
  render the rounded interpolated value into a `<span>`.
- **Reduced-motion:** read `useReducedMotion()` from `motion/react`; when true, render `format(value)`
  statically with NO animation. (Mandatory — constraint #3.)
- Must render the final exact `value` when settled (no off-by-one from rounding mid-flight).
- Keep it presentation-only; the parent passes the already-computed number.

### `components/ui/stat-card.tsx` (server-safe)
Glass metric card for the hero + key figures. Reuses the `.glass` recipe (via `GlassPanel` or the `.glass`
class directly) at `--r-lg`.
- Props: `{ label: string; value: React.ReactNode; sub?: React.ReactNode; hero?: boolean; accent?: boolean }`.
- `hero` → large display-scale number (`text-display` or a large tightly-tracked size), used for the ONE
  count-up hero figure per page. Non-hero → the compact metric tiles (replaces the current inline
  `StatTile`s on the Mandarin page and the tile grid you add to Thai).
- `accent` → tint the value with `text-accent` (language accent) for emphasis; default `text-foreground`.
- Server component (no hooks) so it can be used in the server-rendered stats pages. The count-up lives
  INSIDE it only where the caller passes a `<CountUp/>` as `value` (client island); the card shell itself
  is static. Concentric radius, 8pt padding rhythm.

### `components/ui/celebration.tsx` (client)
Confetti burst + spring bounce, milestone-gated. **Reserved for genuine milestones only** (constraint #4).
- Prefer a self-contained implementation (no new dependency): a fixed-position overlay that spawns N
  confetti particles animated with `motion` springs, plus a spring "pop" on the milestone message.
  If a confetti lib is genuinely warranted, STOP and ask — default is dependency-free `motion` particles.
- Props: `{ show: boolean; children?: React.ReactNode }` (children = the milestone message/banner it wraps),
  or a `fire()`-style imperative trigger — pick the shape that fits the two call sites cleanly.
- **Reduced-motion:** `useReducedMotion()` → skip confetti + bounce entirely; render the milestone message
  statically (still visible, just not animated). Mandatory.
- `pointer-events-none` overlay so it never blocks interaction; auto-clears after the burst.
- Respect `[data-lang]` accents for particle colors (jade/vermilion/gold vs saffron/teal/ruby) so it feels
  native to whichever product fired it.

## Per-surface work

### Mandarin stats — `app/stats/page.tsx`
- Keep the two-learner side-by-side layout and server-component shape. Drop the opaque
  `bg-background` from `<main>` (let the global ambient mesh show through — match `app/page.tsx`, whose
  main has no bg). Keep `min-h-dvh px-6 py-8`.
- **Hero moment per learner column:** a `StatCard hero` with a **`<CountUp value={stats.seen}/>`** (cards
  seen) as the hero figure, `sub` = `${pct}% of ${stats.total}`. This is the one big count-up per column.
- Replace the inline `StatTile` grid with `StatCard` (non-hero) metric cards: Mature, Streak (`${streak}d`),
  Leeches. Keep the same figures/labels — restyle only.
- Give "Progress" the display heading treatment consistent with the system; keep the "Back to study" pill
  (already `rounded-full border` — nudge to `--r-pill` for token consistency, optional).
- The `LearnerColumn` `<section>` currently `rounded-2xl border bg-surface` — give it the glass-card /
  concentric treatment consistent with the Thai page (see below); keep it a legible content surface
  (solid `bg-surface` is fine per the "reading/content surfaces stay solid" rule — cards are content).

### Thai stats — `app/thai/stats/page.tsx`
- **Hero moment:** add a `StatCard hero` at the top with a **`<CountUp/>`** of items mastered (derive from
  the LAST value of `stats.masteredOverTime` — it's cumulative; use the final `.count`, or 0 if empty).
  Add a small metric row (`StatCard` non-hero) for the key figures you can cheaply read from existing data
  (e.g. current streak from `streakCalendar` trailing run, total drill attempts from `drillActivity` sum,
  units-with-data from `accuracyByUnit.length`). Compute these in the SERVER page from data already fetched —
  do NOT add new queries or touch `lib/thai/stats.ts`. If a figure isn't cheaply derivable without new
  logic, omit it rather than inventing a query.
- **Glass-card the `Section` wrapper** (Phase 2 explicitly left this for Phase 3): give `Section` the glass /
  concentric-radius treatment matching the Mandarin `LearnerColumn`. Keep it a legible content surface.
- Drop any opaque bg that occludes the mesh (page `<main>` already has no `bg-background` after Phase 2 —
  confirm).

### Restyle the charts (Recharts — area fills, emphasized endpoints, glass tooltips, accent series)
Shared treatment across all charts; keep each chart's data shape, `ResponsiveContainer` sizing, empty-state
guards, tick formatters, and domains EXACTLY as-is (visual-only):
- **Series color → language accent.** Replace the hardcoded earthy hexes (`#62736f`, `#1a7a40`) with the
  per-language accent via `var(--accent)` (and `var(--accent-2)`/`var(--accent-3)` where a chart needs a
  second/third series). Recharts accepts CSS-var strings in `fill`/`stroke`. The page-level `[data-lang]`
  already scopes these, so Mandarin charts render jade and Thai charts saffron automatically.
- **Line charts → area fills** (`mastered-over-time`): convert `LineChart`/`Line` to `AreaChart`/`Area`
  with a subtle vertical gradient fill (`<linearGradient>` from accent-at-~0.35-alpha to transparent),
  `type="monotone"`, `strokeWidth={2}`, and an **emphasized endpoint** (a single `dot` on the last point,
  or `activeDot`). Keep `dot={false}` for interior points.
- **Bar charts** (`reviews`, `forecast`, `drill-activity`, `accuracy-by-unit`): accent `fill`, keep the
  `radius={[2,2,0,0]}` rounded caps (bump slightly if it reads better). `rating-chart` keeps its per-rating
  `Cell` colors — those are the FUNCTIONAL rating ramp (again/hard/good/easy), NOT decorative; leave the
  ramp semantics, only restyle the container/tooltip. Do NOT recolor the rating ramp to the accent.
- **Glass tooltips.** Replace the bare `contentStyle={{ fontSize: 12 }}` with a glass tooltip: either a
  custom `content={<GlassTooltip/>}` component (a small `.glass` panel) OR a `contentStyle` +
  `wrapperStyle` that applies the glass tokens (`background: var(--glass-bg-strong)`,
  `backdropFilter: blur(var(--glass-blur)) saturate(var(--glass-saturate))`, `border: 1px solid
  var(--glass-brd)`, `borderRadius: var(--r-md)`, `box-shadow: var(--glass-shadow)`,
  `color: var(--foreground)`). Prefer a single shared `components/stats/glass-tooltip.tsx` (or
  `components/ui/`) reused by every chart so it stays consistent. Ensure legible text in both themes.
- **Reduced-motion:** set Recharts `isAnimationActive={false}` when `useReducedMotion()` is true (charts are
  already client components — read the hook and pass it down, or default animations off if simpler/safer).
- **CartesianGrid / axis** stay `currentColor` low-opacity (theme-following) — keep as-is.
- `streak-calendar.tsx`: swap the active-day `bg-brand` to `bg-accent` (language accent). Keep the geometry.

### Retoken the two deferred intensity ramps (glass-native severity scale + AA)
These use earthy `bg-sage/peach/highlight/clay/easy` for a GENERIC severity scale (not class/tone color).
Move both to ONE shared glass-native intensity scale and AA-verify text-on-cell in both themes.
- `components/thai/stats/failure-heatmap.tsx` (`cellColor`): 5-stop ramp low→high failure.
- `components/thai/stats/tone-confusion-matrix.tsx` (`cellColor`): 4-stop ramp keyed off each row's max.
  Its tone-label HEADERS already consume `--thai-tone-*` (Phase 2) — DO NOT touch those; only the cell
  intensity fill.
- **Design of the ramp:** a monochrome/sequential intensity scale (per dataviz best practice for an
  ordered magnitude) — recommend a saffron/amber-tinted sequential ramp (`0` = quiet neutral surface,
  rising to a saturated accent-adjacent hue at the top) so it reads as "heat" and stays in the Thai accent
  family, OR a neutral→red severity ramp if that reads clearer for "failure". Pick ONE, use it in BOTH
  components, define the stops as tokens in globals.css (e.g. `--heat-0..--heat-4`) so both consume the same
  source, and **AA-verify the text color** (`text-on-earthy` currently) against every stop in both themes —
  switch text to white or near-black per stop as needed to clear 4.5:1 (small `%` labels). Load the
  `dataviz` skill guidance before finalizing the ramp colors.

## Celebration wiring (exactly two call sites)
1. **Thai unit unlock** — `components/thai/drill/drill-session.tsx` summary phase (`~line 96`,
   `unlockedThisRound === true`). Wrap/trigger the existing "🎉 Unit N unlocked!" banner with
   `<Celebration>`. This is a clean, correct, one-time-per-round milestone — fire on the `unlockedThisRound`
   condition ONLY (it's already gated by `!nextUnitWasUnlocked`, so it won't re-fire on already-unlocked
   units). Keep the banner text/logic; add the burst.
2. **Mandarin deck cleared** — the tricky one. There is **no client-side session-completion event**:
   `app/page.tsx` renders `<EmptyState/>` (server) whenever no card is due. Firing confetti on every
   EmptyState render would violate constraint #4 (idle revisits aren't a fresh milestone).
   **Approach (recommended):** gate a one-shot in `EmptyState` (make it/​wrap it client): fire the
   celebration only on the *transition into* "all caught up" within a session, using a `sessionStorage`
   flag — e.g. only fire if the learner submitted ≥1 review this session (a flag `review-session:rated`
   set by the rating flow) AND the celebration hasn't fired yet this session (`mandarin:cleared-fired`).
   On idle revisits with no reviews done, show the existing quiet 🎉 EmptyState with NO confetti.
   - This needs a tiny client signal at the rating site: when a rating is submitted in `review-session.tsx`,
     set `sessionStorage['review-session:rated'] = '1'`. That is the only touch to the review flow and it
     changes no server logic. Confirm the exact rating handler while implementing.
   - **If this gate proves fragile or ambiguous during implementation, STOP and flag it** in the impl
     summary rather than firing confetti on every EmptyState. A wrong-firing celebration is worse than a
     missing one. (This is the one genuinely under-specified wiring point in Phase 3 — treat it carefully;
     the code-reviewer must scrutinize it.)
   - **Streak landmark** (the third named trigger) is OPTIONAL for this phase — only wire it if a clean,
     already-computed landmark signal exists without new logic; otherwise document it as deferred. Do not
     invent a query for it.

## AA audit (must pass BOTH themes; document in globals.css "Phase 3" block)
- Any chart series color used as a DATA ENCODING that carries meaning must be distinguishable and, where it
  sits behind small text (tooltips), clear 4.5:1. Accent-on-glass-tooltip text: verify.
- The intensity-ramp stops: text-on-cell (small `%`/count labels) must clear 4.5:1 at every stop, both
  themes. Graphical fills that encode magnitude need 3:1 adjacent-step separation for legibility.
- Metric-card accent value text (`text-accent` on glass): verify 4.5:1 both themes (the `--accent` hexes are
  vivid; on a translucent glass bg over the mesh this needs checking — if it misses, use `text-foreground`
  for the number and reserve accent for a small label/underline).
- Compute ratios with the same WCAG relative-luminance method Phase 1/2 used; add the block to globals.css.

## Verification (run and paste verbatim into the impl summary)
- `npm test` — Mandarin sandhi suite must stay **24/24** (you touch no Mandarin/lib logic).
- `npm run build` — exit 0, no new warnings.
- `npm run lint` — exit 0.
- `git diff --stat` — confirm `lib/**` and `seed/**` are UNTOUCHED.
- Grep-confirm no remaining `bg-sage|bg-peach|bg-clay|bg-highlight` (generic severity) in
  `components/thai/stats/{failure-heatmap,tone-confusion-matrix}.tsx`, and no hardcoded `#62736f`/`#1a7a40`
  series hexes left in the chart files (replaced by `var(--accent*)`).
- Report the AA table you computed (both themes) for the ramp stops + any new functional color.

## Out of scope (Phase 4)
Full AA re-audit sweep, reduced-motion device sweep, cross-device + hanzi legibility pass, bundle-size check,
Vercel preview cutover. Do NOT do a bundle audit here beyond confirming `build` is clean.

## Handoff
Write `.claude/plans/glass-redesign-phase3.impl.md` per the implementer-summary contract (completed work,
left undone, commands run + exit codes verbatim, issues discovered, spec deviations — especially the
Mandarin-celebration gate decision — and procedure compliance). Then the orchestrator runs `code-reviewer`.

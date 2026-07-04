# Review Summary — Glass Redesign Phase 3 (Stats + celebrations)

## Result
PASS (post-fix re-review). Original pass was BLOCKED (1 CRITICAL, 1 HIGH); all four findings — CRITICAL, HIGH, MEDIUM, LOW — were fixed and independently re-verified below. See "Re-review (post-fix)" section at the end for the final verdict and evidence.

## Files Reviewed
- `.claude/plans/glass-redesign-phase3.plan.md` (brief)
- `.claude/plans/glass-redesign-phase3.impl.md` (implementer handoff)
- `C:\Users\User\.claude\plans\act-like-a-designer-toasty-yao.md` (design spec — Stats/Celebrations + Accessibility sections)
- `app/globals.css` (Phase 3 diff block)
- `app/stats/page.tsx`, `app/thai/stats/page.tsx`
- `components/empty-state.tsx`, `components/review-session.tsx`
- `components/thai/drill/drill-session.tsx`
- `components/ui/count-up.tsx`, `components/ui/stat-card.tsx`, `components/ui/celebration.tsx`
- `components/stats/glass-tooltip.ts`, `components/thai/stats/heat-scale.ts`
- `components/stats/{reviews-chart,forecast-chart,rating-chart}.tsx`
- `components/thai/stats/{accuracy-by-unit-chart,drill-activity-chart,mastered-over-time-chart,streak-calendar,failure-heatmap,tone-confusion-matrix}.tsx`
- `lib/thai/stats.ts`, `lib/review/stats.ts`, `lib/review/actions.ts` (read-only, to verify no `lib/**` edits and to check streak-cap parity)
- `components/ui/theme-toggle.tsx` (referenced pattern precedent)
- Compiled build output `.next/static/chunks/113lof_ouh-ig.css` (to empirically verify Tailwind cascade order — see CRITICAL finding)

## Findings

### CRITICAL
- **`components/thai/stats/tone-confusion-matrix.tsx:83`** — the `<td>`'s hardcoded `text-foreground` class silently wins the CSS cascade over the intended `text-[var(--heat-N-ink)]` class returned by `cellColor()`, defeating the AA-tuned heat-ramp ink entirely for every non-empty cell.
  - Verified empirically (not just theorized) by inspecting the actual compiled Tailwind output (`npm run build` → `.next/static/chunks/113lof_ouh-ig.css`): the five `.text-\[var\(--heat-N-ink\)\]{color:...}` rules appear at byte offsets 23687/23741/23795/23849/23903, and `.text-foreground{color:var(--foreground)}` appears at offset **23957** — i.e. strictly *after* all five. For two same-specificity single-class selectors targeting the same `color` property on the same element, the later rule in the stylesheet wins regardless of the order the classes are written in the `className` string. So `text-foreground` always overrides the per-stop ink token.
  - This is a **regression newly introduced by this diff**, not inherited: `git diff` shows the *previous* code used a single, non-conflicting `text-on-earthy` class with plain `bg-easy/bg-sage/bg-highlight/bg-clay` backgrounds (no competing text-color utility). Phase 3 changed the static class to `text-foreground` *and* added a second, competing text-color class from `cellColor()`/`heatCellClass()` — creating the two-utility clash for the first time.
  - Concrete AA impact (recomputed independently with the WCAG relative-luminance formula):
    - Stops 0-3: harmless by coincidence — `--foreground` (`#1a1a1a` light / `#ecefec` dark) happens to equal the intended per-stop ink at those stops.
    - **Stop 4 (highest intensity — the most important cells to read) does NOT get away with it:**
      - Light: rendered text is `#1a1a1a` on `#B30000` → **2.42:1 — FAILS AA** (globals.css claims 7.20:1 with `#FFFFFF` ink, which never actually renders).
      - Dark: rendered text is `#ecefec` on `#E67237` → **2.65:1 — FAILS AA** (globals.css claims 5.66:1 with `#1a1a1a` ink, which never actually renders).
  - This directly contradicts constraint #6 ("WCAG AA is a deliverable") and the Phase 3 AA table the implementer wrote in `globals.css`, which computed ratios assuming the ink override applies — it never checked whether the ink class actually wins the cascade against the co-present `text-foreground` class.
  - `components/thai/stats/failure-heatmap.tsx` is **not** affected — its cell `className` has no competing `text-*` class, so `heatCellClass()`'s ink applies cleanly there. This is a `tone-confusion-matrix.tsx`-only bug.
  - Fix direction: drop the hardcoded `text-foreground` from the `<td>` className (the `bg-background` zero-count branch already needs *some* text color, but `text-foreground` could be folded into `cellColor()`'s zero-count return, e.g. `"bg-background text-foreground"`, so the two branches never coexist on the same element).

### HIGH
- **`components/ui/celebration.tsx:96-112`** — the spring "pop" entrance animation (`motion.div` with `initial={{scale:0.85,opacity:0}}`/`animate={{scale:1,opacity:1}}`) wraps `children` **unconditionally** whenever `!reduceMotion`, with no dependency on the `show` prop at all — only the confetti (`ConfettiBurst`) is actually gated by `show`/`burstId`. The component's own docstring and the brief both describe "confetti burst + spring bounce" as the two halves of one celebration effect reserved for genuine milestones (constraint #4: "Do NOT fire on ... every EmptyState idle-revisit").
  - Concrete effect: because `components/empty-state.tsx` wraps its *entire* "All caught up" card in `<Celebration show={celebrate}>`, **every single idle EmptyState revisit** (no reviews done this session, `celebrate=false`) still gets the spring-in scale/opacity pop on the whole card — only the confetti particles are actually suppressed. Constraint #4's explicit example ("On idle revisits ... show the existing quiet EmptyState with NO confetti") reads as "no celebration effects at all", not "no confetti but still bounce."
  - This is not called out anywhere in the impl summary's "Spec Deviations" section (unlike the confetti over-fire nuance, which *was* flagged) — it reads as an oversight, not a considered judgment call.
  - `drill-session.tsx`'s unit-unlock usage (`<Celebration show>`) is unaffected in practice since that `<Celebration>` is only ever mounted inside `{unlockedThisRound && (...)}`, so it never renders with `show=false`.
  - Fix direction: gate the `motion.div` branch on `show` too (render a plain, un-animated wrapper when `!show`, matching the reduced-motion branch's fallback), or thread `show` into the spring block's `animate` prop so it only pops when transitioning true.

### MEDIUM
- **`app/thai/stats/page.tsx:18-30` (`currentStreakFromCalendar`)** — silently caps the displayed Thai streak at 84 days (the `streakCalendar` window size from `lib/thai/stats.ts`), whereas the Mandarin streak (`lib/review/stats.ts:194-224`) walks up to 365 days of all-time logs specifically to avoid this cap (its own comment: *"a streak of any length is counted correctly ... recentLogs would silently cap the streak at ~32 days"*). A Thai learner with a >84-day streak would see an inaccurate, truncated number (e.g. "84d" forever) rather than their true streak — this is a silently-wrong figure, not merely an omitted one. The brief's "derive cheaply from already-fetched data, no new queries" instruction explains *why* this constraint exists, but the resulting behavioral asymmetry between the two products' streak metrics isn't documented as a deviation anywhere in the impl summary. Low real-world likelihood (84-day unbroken Thai drill streak) but worth a one-line acknowledgment in the handoff so it isn't mistaken for parity with the Mandarin figure.

### LOW
- **`components/review-session.tsx:56-60`** — `sessionStorage.setItem("review-session:rated", "1")` runs *before* `submitReview` is awaited, so the "rated" flag is set even if the server action subsequently throws (network error, auth expiry, invalid rating). A failed rate() still contributes toward the "deck cleared" celebration gate. Extremely narrow edge case (would also require a genuinely empty queue right after the failure), not worth blocking on.
- **`components/ui/count-up.tsx` / `components/ui/celebration.tsx`** — `useReducedMotion()` (from `motion`) returns `null` (falsy) during SSR and on the very first client render pass before `initPrefersReducedMotion()`'s synchronous `matchMedia` read resolves within the same hook call; in practice this resolves synchronously before React's hydration commit, so no SSR/client markup mismatch occurs for the common case. For a user who **actually** has `prefers-reduced-motion: reduce` set at the OS level, SSR markup still assumes non-reduced motion (since server-side `prefersReducedMotion.current` is always `null`), producing a text-content mismatch for `CountUp` specifically (SSR renders "0", client's first render — pre-animation — could briefly want the final value). This is pre-existing `motion`-library behavior already present since Phase 1 (`review-session.tsx`'s own `useReducedMotion()` usage for the flip), not introduced by Phase 3, but Phase 3 is the first place it's applied to a *numeric* hero figure rather than a purely structural swap. Documenting as residual risk, not blocking.
- **`app/stats/page.tsx` / `app/thai/stats/page.tsx`** — `StatCard hero accent` is used for the one hero figure per page; per `stat-card.tsx`'s own documented AA finding, `accent` never colors the value text (only a decorative label rule), which is the brief's own anticipated fallback — correctly implemented, just noting for completeness since it was a named focus area.

## Assertions Checked
- **Mandarin "deck cleared" gate (focus area 1a, no confetti on idle EmptyState revisits with zero reviews)**: PASS — `getSnapshot()` requires both `ratedThisSession` (from `review-session:rated`) and `!alreadyFired`; a fresh/idle session with no rating ever sets `review-session:rated`, so `celebrate` is always `false` on a pure idle revisit. Verified by reading `rate()`'s write site and `EmptyState`'s read site together.
- **Two-flag logic across SSR hydration / useSyncExternalStore (focus area 1b)**: PASS — mirrors the existing `ui/theme-toggle.tsx` convention; `getServerSnapshot` returns `false` unconditionally (SSR never has sessionStorage), and the client's first real snapshot read happens safely post-hydration via the hook's documented mechanism. No double-fire: the "mark fired" write lives in a separate `useEffect` with no `setState` call, and `Celebration`'s lazy `useState` initializer captures the correct one-shot `burstId` at first render before the write happens. Confirmed no race between rate() (synchronous flag write) and the later `refresh()`-triggered remount.
- **try/catch storage guards (focus area 1c)**: PASS — every sessionStorage read/write in `empty-state.tsx` and `review-session.tsx` is wrapped, matching the established `theme-toggle.tsx` guard convention.
- **"Fires after any single rated review + empty queue" judgment call (focus area 1, final)**: ACCEPTABLE — this is exactly the heuristic the brief itself proposed (rated-this-session AND not-already-fired), faithfully implemented and explicitly flagged by the implementer as a documented Spec Deviation. Not a bug.
- **Reduced-motion fallbacks in count-up/celebration/charts (focus area 2)**: PASS overall, with the LOW residual SSR/hydration note above and the HIGH finding above (celebration's spring pop is gated on `reduceMotion` correctly, but not on `show` — a `show`-gating bug, not a reduced-motion bug). Every chart file reviewed passes `isAnimationActive={!reduceMotion}` correctly to its Bar/Area.
- **Constraint compliance — no `lib/**`/`seed/**` changes (focus area 3)**: PASS — re-ran `git --no-pager diff --stat -- lib seed` myself: empty output, exit 0.
- **Mandarin/Thai stay distinct systems (focus area 3)**: PASS — shared primitives (`StatCard`/`CountUp`/`Celebration`/chart treatments) per the brief's own explicit allowance, but each page's accent still resolves via `[data-lang]`; no flattening of the two products into one component.
- **Celebration reserved for genuine milestones (focus area 3)**: PARTIAL — see HIGH finding (confetti correctly gated on both call sites; the spring-pop half of the celebration effect is not gated on `show` in the EmptyState call site).
- **AA correctness — heat ramp + accent-as-text (focus area 4)**: heat-ramp *computed* ratios PASS (independently reverified, matched implementer's numbers exactly — see Commands Run). Accent-as-text ratios PASS (jade/saffron correctly kept off value text). **However the heat ramp is not actually AA-compliant as rendered in `tone-confusion-matrix.tsx`** — see CRITICAL finding; the ramp *is* correctly applied (classes are real, not silently dropped by the Tailwind scanner — the implementer's own flagged concern was handled correctly) but a *different*, unflagged bug (cascade collision) defeats it downstream.
- **Two flagged deviations — rating-chart retoken, StatCard accent (focus area 5)**: PASS — `--rate-*` tokens exist, preserve the Again/Hard/Good/Easy functional mapping unchanged (same four `RATING_COLORS` array positions map to the same semantic buttons), and were already AA-verified in the Phase 1 table (unchanged values, just reused). `StatCard accent` correctly never colors value text in either theme, consistent with the brief's own anticipated fallback.
- **General Recharts correctness (focus area 6)**: PASS — `mastered-over-time-chart.tsx`'s gradient/last-point-only `dot` function is correct (returns a zero-radius invisible circle for every non-last index, a real dot only at `lastIndex`); `glass-tooltip.ts` style objects reference real, existing CSS tokens (`--glass-bg-strong`, `--glass-blur`, `--glass-saturate`, `--glass-brd`, `--glass-shadow` all confirmed defined in `globals.css`); `heat-scale.ts`'s static `Record<HeatStop,string>` lookup avoids the Tailwind-scanner interpolation trap as claimed (confirmed all five classes present in compiled CSS).

## Commands Run
All re-run independently (fresh terminal, not the implementer's pasted output).

- `npm test` — exit 0
  ```
  ℹ tests 24
  ℹ suites 0
  ℹ pass 24
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 179.2966
  ```
  Matches the impl summary's claimed 24/24.

- `npm run build` — exit 0
  ```
  ✓ Compiled successfully in 5.0s
    Running TypeScript ...
    Finished TypeScript in 5.1s ...
    Collecting page data using 10 workers ...
  ✓ Generating static pages using 10 workers (6/6) in 621ms
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
  Same pre-existing two-lockfile Turbopack warning as the impl summary reported. No new warnings. Matches claim.

- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  No output/findings. Matches claim.

- `git --no-pager diff --stat -- lib seed` — exit 0, empty output (confirms zero touches to `lib/**`/`seed/**`).

- `grep -n -E "bg-sage|bg-peach|bg-clay|bg-highlight" components/thai/stats/failure-heatmap.tsx components/thai/stats/tone-confusion-matrix.tsx` — exit 1 (no matches, clean).

- `grep -rn -E "#62736f|#1a7a40" components/stats components/thai/stats` — exit 1 (no matches, clean).

- Independent WCAG contrast recomputation (Node script, relative-luminance formula) for every claimed Phase 3 ratio (heat ramp both themes, accent-on-white/dark-card) — all values matched the implementer's globals.css table exactly (see script output, e.g. `heat-3 light 4.66`, `heat-4 light black-ink-check 2.42`, `jade on dark card 5.74`, etc.).

- Compiled-CSS cascade-order inspection (the check that surfaced the CRITICAL finding):
  ```
  node -e "... indexOf('.text-\[var\(--heat-N-ink\)\]{color') ..."
  heat-0-ink 23687
  heat-1-ink 23741
  heat-2-ink 23795
  heat-3-ink 23849
  heat-4-ink 23903
  text-foreground 23957
  ```
  `.text-foreground` is emitted strictly after all five heat-ink rules in the actual production CSS bundle — confirms the cascade-collision bug is real in the shipped build, not theoretical.

- `git --no-pager diff components/thai/stats/tone-confusion-matrix.tsx` — confirmed the `text-foreground`/competing-ink-class collision is newly introduced by this diff (previous code used non-conflicting `text-on-earthy` + plain `bg-*` classes).

## Residual Risk
- The CRITICAL and HIGH findings above should be fixed before this phase is considered done; both are small, localized changes (drop one hardcoded class; gate one branch on a prop).
- The MEDIUM streak-cap finding is a real but low-likelihood data-accuracy gap; acceptable to ship with a documented caveat if the orchestrator prioritizes shipping, but should not be silently forgotten.
- The reduced-motion/SSR hydration mismatch (LOW) is inherited `motion`-library behavior spanning all phases since Phase 1, not something Phase 3 can unilaterally fix; flagging for awareness ahead of the Phase 4 "reduced-motion device sweep" that's already scoped as out-of-scope-for-this-phase.
- No live browser/Chrome DevTools pass was performed by this review (matches the implementer's own scoping — deferred to qa-engineer/Phase 4 per established phase convention). The CRITICAL finding was caught via direct inspection of the compiled CSS bundle rather than a visual pass; a visual/DevTools contrast-checker pass would have caught it too and should still be run in QA to catch anything a static-code review can't (e.g. this exact class of bug is easy to miss by code-reading alone without checking generated output).
- Did not audit the Phase 3 diff against `.claude/plans/glass-redesign.handoff.md` since the task instructions explicitly said to ignore that file for this review.

## Procedure Compliance
- Plan consulted before review: yes — read `glass-redesign-phase3.plan.md` in full before reading any changed file.
- Implementation summary read: yes — read `glass-redesign-phase3.impl.md` in full, including Issues Discovered and Spec Deviations sections, before forming findings.
- Design spec (`act-like-a-designer-toasty-yao.md`) read: yes — Stats/Celebrations, Accessibility, and Build order sections.
- Review summary written: yes (this file).

---

## Re-review (post-fix)

Targeted re-review only — scoped to the four files touched by the implementer's
"Post-review fixes" section in `glass-redesign-phase3.impl.md` (read in full
before starting this pass): `tone-confusion-matrix.tsx`, `celebration.tsx`,
`app/thai/stats/page.tsx`, `review-session.tsx`. Did not re-walk the rest of
Phase 3 (charts, stat-card, count-up, globals.css, drill-session unlock path)
since nothing else changed — confirmed via `git --no-pager diff --stat`
against the original review pass (see Commands Run below).

### Result
**PASS.** All four findings are correctly resolved; no new issues introduced.

### 1. CRITICAL (tone-confusion-matrix.tsx) — RESOLVED, verified
- Read the fixed file directly: the `<td>` className template (line 91) no
  longer contains a static `text-foreground` token anywhere —
  `` `h-10 w-10 rounded-[var(--r-sm)] text-center text-xs font-semibold ${cellColor(count, rowMax)}` ``.
  `grep -n "text-foreground" components/thai/stats/tone-confusion-matrix.tsx`
  shows exactly one code occurrence, inside `cellColor()`'s own zero-count
  return (`"bg-background text-foreground"`, line 33) — never co-present with
  a `heatCellClass()` return, since the function only ever returns ONE of the
  two branches.
- Since only one text-color utility class is ever applied to a given cell now
  (either the zero-count pairing or one `heatCellClass(1..4)` string), the
  compiled-CSS emission order can no longer matter — there's nothing left to
  arbitrate. Re-ran a fresh `npm run build` and re-inspected the newly
  compiled bundle (`.next/static/chunks/0q_ub61-55nfm.css`) anyway, to be
  thorough: all five `.text-[var(--heat-N-ink)]` rules and all five
  `.bg-[var(--heat-N)]` rules are still generated (Tailwind still discovers
  the static `HEAT_CELL_CLASS` strings correctly, unaffected by this fix), and
  `.text-foreground` is still present elsewhere in the app's CSS (used by
  many other components) — its continued existence in the bundle is
  irrelevant now since it's no longer co-applied with the heat-ink class on
  this element. Stop-4 cells will render `#FFFFFF` (light) / `#1a1a1a` (dark)
  ink as the globals.css table always claimed (7.20:1 / 5.66:1, both AA-pass) —
  confirmed by source inspection since the only remaining variable was the
  cascade collision, which is now structurally impossible.
- `components/thai/stats/failure-heatmap.tsx` — re-read, untouched by this
  round of fixes (not in the `git diff --stat` for this round), still has no
  competing `text-*` class on its cell. Unaffected, as expected.

### 2. HIGH (celebration.tsx) — RESOLVED, verified
- Read the fixed file: the ternary at line 107 now reads
  `{show && !reduceMotion ? (<motion.div>...spring pop...</motion.div>) : (<div>{children}</div>)}`.
  Confirmed both conditions are required for the animated branch — `show`
  now genuinely gates the spring pop, not just `reduceMotion`.
- Traced both call sites:
  - `components/empty-state.tsx` (`<Celebration show={celebrate}>`) — an idle
    revisit (`celebrate=false`) now renders the plain `<div>` branch: no
    spring pop AND (unchanged) `burstId` stays `0` so no confetti either.
    Full "no celebration effect at all" on idle revisits, matching
    constraint #4's literal example.
  - `components/thai/drill/drill-session.tsx` (`<Celebration show>`, i.e.
    `show={true}` shorthand) — re-read: this call site is still only mounted
    inside `{unlockedThisRound && (...)}`, so `show` is always `true` whenever
    this component renders at all. `show && !reduceMotion` reduces to the
    same `!reduceMotion` behavior as before for this call site — the pop
    still fires correctly on genuine unit unlock, unaffected by the fix.
- No regression: the `burstId`/`prevShow` render-time-state-adjustment logic
  (the part that avoids `react-hooks/set-state-in-effect`) is untouched by
  this diff — only the JSX ternary's condition changed.

### 3. MEDIUM (app/thai/stats/page.tsx) — RESOLVED, verified
- Read the fixed file: a "CAVEAT (post-review, MEDIUM)" comment block now
  sits directly above `currentStreakFromCalendar`, explaining the 84-day cap,
  why it can't be widened without a new query/lib change in this phase, and
  explicitly stating it is NOT parity with the Mandarin streak figure.
- Confirmed comment-only: `git --no-pager diff --stat -- lib seed` (this
  round) is empty, and `currentStreakFromCalendar`'s function body (loop
  logic, return value) is byte-for-byte unchanged from the original
  pass — only the comment block above it grew. No new query, no behavior
  change, exactly as the impl summary claims.
- Confirmed the new Spec Deviation entry exists in the impl handoff's
  "Post-review fixes" §3 (read above), retroactively documenting the
  Mandarin/Thai streak asymmetry.

### 4. LOW (review-session.tsx) — RESOLVED, verified
- Read the fixed file: `rate()`'s body is now just
  `startTransition(async () => { await submitReview(card.id, rating); try { sessionStorage.setItem(...) } catch {...} })`
  — the sessionStorage write is the last statement in the async callback,
  strictly after the `await`, still wrapped in its own try/catch.
- Confirmed the ordering actually fixes the claimed defect: if
  `submitReview` throws (network error, expired auth, invalid rating), the
  throw propagates out of the `await` expression before execution ever
  reaches the `try` block below it, so the sessionStorage write is skipped
  entirely on a failed submit. Only a genuinely-resolved (successful) review
  now arms the "deck cleared" gate.
- No new race introduced: the write still happens synchronously within the
  same async transition callback that also triggers the server-side
  `refresh()` (via the now-awaited `submitReview`), so by the time the
  transition settles and `<EmptyState/>` potentially mounts, the flag is
  already durably set — same ordering guarantee as before, just moved to
  after a confirmed-successful call instead of an optimistic one.

### Commands Run (re-review)
- `npm test` — exit 0
  ```
  ℹ tests 24
  ℹ suites 0
  ℹ pass 24
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 202.3487
  ```
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  No output/findings.
- `npm run build` — exit 0 (ran after `rm -rf .next` for a fully fresh
  compile, not an incremental one)
  ```
  ✓ Compiled successfully in 5.6s
    Running TypeScript ...
    Finished TypeScript in 6.7s ...
    Collecting page data using 10 workers ...
  ✓ Generating static pages using 10 workers (6/6) in 846ms
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
  Same pre-existing two-lockfile warning only, no new warnings.
- `git --no-pager diff --stat -- lib seed` — exit 0, empty output (still zero
  `lib/**`/`seed/**` touches across the whole phase, including this fix
  round).
- `git --no-pager diff --stat` (whole tree, this round) — confirmed only the
  four targeted files (plus the impl/review handoff docs and this
  agent-memory update) changed since the original review pass; nothing else
  in the Phase 3 diff was touched.
- Compiled-CSS re-check (fresh build, new hash
  `.next/static/chunks/0q_ub61-55nfm.css`): re-confirmed all five
  `.text-[var(--heat-N-ink)]` and `.bg-[var(--heat-N)]` rules still exist
  (Tailwind still generates them — the fix didn't accidentally remove the
  classes, it removed the competing one). `.text-foreground` still exists
  in the bundle (used elsewhere in the app) but no longer co-occurs with a
  heat-ink class on any single element, per the source-level check above.
- `grep -n "text-foreground" components/thai/stats/tone-confusion-matrix.tsx`
  — exactly one code-level match, confirmed to be inside `cellColor()`'s
  zero-count branch only (not on the `<td>` itself).

### Final Verdict
**PASS.** All four post-review fixes are correctly implemented, independently
verified against source and (for the CRITICAL finding) the compiled CSS
output, and introduce no new regressions. Tests/build/lint all green,
`lib/**`/`seed/**` still untouched. Phase 3 is clear to proceed (Phase 4
polish sweep — full AA re-audit, reduced-motion device sweep, cross-device
pass — remains separately scoped as before and was not re-litigated here).

### Procedure Compliance (re-review)
- Read the "Post-review fixes" section of `glass-redesign-phase3.impl.md`
  in full before starting: yes.
- Re-ran commands myself rather than trusting pasted output: yes (fresh
  terminal, `rm -rf .next` before the build to force a non-incremental
  compile).
- Scope respected (targeted re-review of only the four fixed files, not a
  full re-walk of Phase 3): yes.
- Review summary updated: yes (this section).

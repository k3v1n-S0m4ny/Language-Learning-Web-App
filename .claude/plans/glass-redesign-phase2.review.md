# Review Summary — Glass Redesign Phase 2 (Read-Thai)

## Result
PASS-WITH-NITS

## Files Reviewed
- `app/globals.css` (full diff + surrounding token/AA-table context)
- `app/thai/[unit]/drill/page.tsx`, `app/thai/[unit]/lesson/page.tsx`, `app/thai/stats/page.tsx`
- `components/top-bar.tsx` (full file + diff)
- `components/thai/thai-home.tsx`, `components/thai/unit-row.tsx` (full files + diff)
- `components/thai/progress-ring.tsx`
- `components/thai/drill/drill-session.tsx` (full file), `phrase-split-question.tsx`, `tone-assembly-question.tsx`
- `components/thai/audio-play-button.tsx`
- `components/thai/lessons/class-badge.tsx` (full file), `tone-sparkline.tsx` (full file), `consonant-table.tsx`, `vowel-table.tsx`, `finals-table.tsx`, `numerals-lesson.tsx`, `special-signs-lesson.tsx`, `syllable-decode-lesson.tsx`, `tone-ear-lesson.tsx`, `tone-rules-lesson.tsx`, `unit1-lesson.tsx`, `spaceless-reading-lesson.tsx`
- `components/thai/stats/tone-confusion-matrix.tsx` (full diff), `components/thai/stats/failure-heatmap.tsx` (spot-checked, untouched)
- `.claude/plans/glass-redesign-phase2.plan.md`, `.claude/plans/glass-redesign-phase2.impl.md`
- `C:\Users\User\.claude\plans\act-like-a-designer-toasty-yao.md`
- `git diff --stat` (full, and scoped to `lib/thai` / `seed/thai`)

## Findings

### CRITICAL
None.

### HIGH
None.

### MEDIUM
- **`npm run build` emits a genuine (implementer-unreported) CSS warning, sourced from the
  `.claude/plans/glass-redesign-phase2.impl.md` handoff doc itself, not from any component.**
  My own build run shows:
  ```
  Found 1 warning while optimizing generated CSS:
  .rounded-\[var\(--r-lg\/md\/pill\)\] {
    border-radius: var(--r-lg/md/pill);
                              ^-- Unexpected token Delim('/')
  }
  ```
  I confirmed via repo-wide grep that the literal string `rounded-[var(--r-lg/md/pill)]` exists
  **only** in `.claude/plans/glass-redesign-phase2.impl.md:49` (shorthand prose summarizing three
  separate real classes used in `drill-session.tsx`) and nowhere in any `.tsx`/`.css` file. Tailwind
  v4's default content auto-detection scans the whole repo (respecting `.gitignore`); `.claude/plans/`
  is **not** gitignored (only `.claude/worktrees/` is — checked `.gitignore`), so Tailwind picked up
  this doc-prose string as a candidate utility class and tried to generate broken CSS for it.
  Practically harmless (no real DOM node carries this class, so nothing renders incorrectly), and
  `npm run build` still exits 0 — but it is a **verifiable discrepancy** against the implementer's
  pasted "✓ Compiled successfully in 2.7s" output, which shows no such warning. It also means any
  future prose anywhere in `.claude/plans/*.md` that resembles bracket-arbitrary Tailwind syntax can
  leak spurious (and, in an unlucky case, non-harmless) generated CSS into every build. Recommend
  adding a Tailwind `@source not "../.claude"` exclusion in `globals.css`, or gitignoring
  `.claude/plans/`, rather than relying on handoff-doc prose staying accidentally Tailwind-safe.

### LOW
- **Phase 0's pre-existing AA-table entry for the unlock banner is arithmetically wrong, and Phase 2
  propagated it uncritically.** The impl handoff states the unlock banner "`bg-highlight
  text-on-earthy` (already AA-passing per the Phase 0 table, 7.9:1 — no change needed)." I
  independently recomputed `#1A1A1A` on `#F5A623` via the standard WCAG relative-luminance formula
  and got **8.59:1**, not 7.9:1 (manual channel-by-channel check confirms 8.59). This doesn't change
  the pass/fail verdict (both clear 4.5:1 comfortably) so it's not a shipping blocker, but the
  implementer cited a stale/incorrect Phase 0 number instead of recomputing it, which is exactly the
  kind of AA-table arithmetic error worth catching before it compounds across phases.
- **The ~1.6x Thai-glyph a11y bump is not applied with perfectly consistent math across every
  surface** — e.g. `vowel-table.tsx`'s `text-xl` (1.25rem) → `text-3xl` (1.875rem) is a 1.5x bump, not
  1.6x (elsewhere, e.g. `drill-session.tsx`'s `text-5xl`→`text-[4.8rem]`, the ratio is exact). This is
  a nit — the brief says "~1.6x" and "judiciously," and 1.5x vs 1.6x at these sizes is not a real
  legibility regression — but flagging for consistency awareness, not a blocker.

### NIT
- No live browser/Chrome-DevTools screenshot pass was performed by me either (no browser-automation
  tool available in this environment) to visually confirm assertion 6 ("unit-row `.glass` rows still
  separate from the mesh in dark mode"). I verified this by reasoning from the CSS recipe instead
  (`.glass` = translucent bg + 1px border + inset specular top-edge + drop shadow, composited over
  `--background: #15191b` in dark), which is the same primitive already shipped and presumably
  validated in Phase 0/1's own `TopBar`. This is unverified by direct observation — flag as residual
  risk for QA/browser-based validation, consistent with the plan's own "Verification (end-to-end)"
  step 3 (chrome-devtools MCP) being explicitly out of scope for the implementer per Phase 1's
  precedent.

## Assertions Checked
1. **No behavior/mechanic regressions** — PASS. Read `drill-session.tsx`, `phrase-split-question.tsx`,
   `tone-assembly-question.tsx` in full (not just diff). `isPhraseSplit`, `hideAudioUntilRevealed`,
   `optionFont` per drillType, tone-assembly step branching (`phase === "answering"` vs revealed),
   pending/transition (`useTransition`), and the exact `submitThaiAttempt(question.itemId,
   question.drillType, value)` call signature are byte-for-byte unchanged — only `className` strings
   and comments changed. Confirmed line-by-line against the diff.
2. **Scope containment** — PASS. `git diff --stat -- lib/thai seed/thai` and `git status --porcelain
   -- lib/thai seed/thai` both produced zero output (re-ran myself, matches implementer's claim). No
   Mandarin component appears in the changed-file list (25 files, all under `app/globals.css`,
   `app/thai/*`, `components/thai/*`, plus `components/top-bar.tsx`). `top-bar.tsx`'s diff is a
   comment-only change (verified via full diff — only the leading block comment text changed; the
   function body, props, and JSX are byte-identical).
3. **WCAG AA** — PASS (with one LOW note above). Independently recomputed contrast for all
   Phase-2-tuned tokens using a standalone Node script (WCAG relative-luminance formula, not copied
   from the implementer): ClassBadge chip backgrounds (light: 15.45/15.63/14.66:1; dark:
   9.35/10.43/6.40:1) and tone hues as text/stroke (light: 4.76/5.93/4.83/5.02/4.71:1; dark:
   5.71/6.84/5.30/8.41/5.95:1) **match the implementer's globals.css table to 2 decimal places on
   every entry**. Verified the actual rendering surface for tone hues is `bg-surface` (white
   light/`#232A28` dark) via `Section`/card wrapper components, not `bg-background` as I initially
   tested defensively (three of five tone hues would FAIL against `bg-background` in light mode —
   confirmed this is not the actual consumer surface, so no bug). CTA saffron-on-on-earthy (8.10:1)
   confirmed exact. Unlock banner recomputed at 8.59:1 (implementer/Phase-0-table said 7.9:1 — see
   LOW finding, does not change the pass verdict). `audio-play-button.tsx`'s deviation (saffron text
   ~2.06–2.15:1, correctly identified as a would-be AA failure) reproduced almost exactly by my script
   (2.06:1 light).
4. **a11y button-color note** — PASS. Grepped every `<button>`/interactive class definition in
   `drill-session.tsx`, `phrase-split-question.tsx`, `tone-assembly-question.tsx`,
   `audio-play-button.tsx`: every text-bearing button now carries an explicit `text-foreground` (or
   semantic `text-on-earthy`/`text-white` in revealed/correct states, pre-existing and unchanged).
   The one button without an explicit text class (`phrase-split-question.tsx`'s boundary-toggle bar)
   renders no text content — it's a colored indicator bar, not a label — so the rule doesn't apply.
5. **Token correctness** — PASS. `@theme inline` wiring (`--color-thai-class-*` / `--color-thai-tone-*`
   → `var(--thai-class-*)` / `var(--thai-tone-*)`) follows the exact same already-proven pattern as
   the pre-existing `--color-accent: var(--accent);` wiring (shipped and working since Phase 0/1).
   `tone-sparkline.tsx` confirmed to no longer contain any hardcoded hex (`grep -n
   "#[0-9a-fA-F]{6}"` → no matches, re-ran myself). `progress-ring.tsx` confirmed using `var(--accent)`.
   Build succeeds and the app compiles with these utility classes in use — no "unknown utility"
   failures.
6. **Mesh/legibility** — PASS (by static analysis; not visually screenshotted — see NIT). Confirmed
   `body { background: var(--background); }` plus a global `<AmbientMesh />` in `app/layout.tsx`
   underlie every page, so removing `bg-background` from Thai `<main>` wrappers matches the
   already-shipped Mandarin `app/page.tsx` pattern exactly. Every content card/prompt/option
   box/lesson tile retains `bg-surface` (solid) unchanged — only the outer page padding area now
   shows mesh, never the reading content itself.
7. **Flagged deviations are sound** — PASS. (a) Saffron CTA sweep: independently recomputed 8.10:1,
   confirmed no stray `bg-brand`/`text-white` left behind in Thai components except the pre-existing,
   intentionally-untouched `bg-success text-white` (correct-answer reveal state) and
   `streak-calendar.tsx`'s unrelated Phase-3-scoped `bg-brand`. (b) `·` separator →
   `text-foreground-muted`: reasonable, avoids the ~2.15:1 accent-swap failure the implementer
   identified; the pre-existing `text-brand` (2.93:1 on dark, per implementer) issue is correctly
   scoped out as pre-existing/out-of-phase. (c) `audio-play-button.tsx` label staying
   `text-foreground`: confirmed via my own recompute the accent-on-glass pairing genuinely fails
   (2.06:1), so keeping `text-foreground` is the correct call, not a cover for a missed sweep. (d) The
   two remaining `bg-sage`/`bg-peach` usages in `failure-heatmap.tsx`/`tone-confusion-matrix.tsx`'s
   `cellColor` are confirmed to be a generic 4-step severity ramp (not a consonant-class or tone hue),
   consistent with the brief's Phase-3 stats-chart carve-out — `tone-confusion-matrix.tsx`'s actual
   in-scope palette touch (the tone-label headers) was correctly retokened.

## Commands Run
- `git status --porcelain` / `git diff --stat` — exit 0. 25 files changed (234 insertions, 135
  deletions); every path under `app/globals.css`, `app/thai/*`, `components/thai/*`,
  `components/top-bar.tsx`. Matches implementer's claim.
- `git diff --stat -- lib/thai seed/thai` and `git status --porcelain -- lib/thai seed/thai` — exit 0,
  **zero output both times** — confirms byte-identical, matches implementer's claim.
- `npm test` — exit 0
  ```
  ℹ tests 24
  ℹ suites 0
  ℹ pass 24
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 164.3514
  ```
  Matches implementer's claimed 24/24.
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  (no output = clean). Matches implementer's claim.
- `npm run build` — exit 0, **but with a warning the implementer's pasted output does not show**:
  ```
  ⚠ Warning: Next.js inferred your workspace root, but it may not be correct. ...
  ▲ Next.js 16.2.6 (Turbopack)
  - Environments: .env.local

    Creating an optimized production build ...
  Found 1 warning while optimizing generated CSS:

  │   }
  │   .rounded-\[var\(--r-lg\/md\/pill\)\] {
  │     border-radius: var(--r-lg/md/pill);
  ┆                              ^-- Unexpected token Delim('/')
  │
  │   }
  │   .rounded-\[var\(--r-md\)\] {

  ✓ Compiled successfully in 2.9s
    Running TypeScript ...
    Finished TypeScript in 3.3s ...
  ✓ Generating static pages using 10 workers (6/6) in 409ms
  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ```
  See MEDIUM finding above — traced to `.claude/plans/glass-redesign-phase2.impl.md:49`, not to any
  component. Exit code still 0, matching the implementer's claimed exit code, but the "clean" output
  claim does not match what I observe now.
- `grep -rn "r-lg/md/pill" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next` — only
  match: `./.claude/plans/glass-redesign-phase2.impl.md`. Confirms the build warning's source.
- `grep -n "#[0-9a-fA-F]\{6\}" components/thai/lessons/tone-sparkline.tsx` — no matches, matches
  implementer's claim of a clean hex-free file.
- `grep -rn "bg-brand|text-white\b" components/thai app/thai` — 3 matches, all pre-existing/correctly
  out-of-scope (`bg-success text-white` reveal states x2, `streak-calendar.tsx`'s unrelated
  Phase-3-scoped `bg-brand`). No missed Thai CTA sweep.
- Standalone Node contrast-recompute script (WCAG relative-luminance formula, throwaway, not
  committed) — see numbers cross-checked against the implementer's table under "Assertions Checked
  → 3" and the LOW finding above.

## Residual Risk
- No live browser/visual/reduced-motion/keyboard-tab pass was performed by either the implementer or
  this review (no browser-automation tool available to me) — the plan's own "Verification
  (end-to-end)" chrome-devtools/Lighthouse step is still outstanding and should be QA's job before
  merge, per the established Phase 1 precedent.
- The Tailwind content-scanning-of-`.claude/plans` behavior (MEDIUM finding) is a repo-wide config gap
  that predates this phase; it happened to manifest here because of this phase's own handoff-doc
  wording. It will keep firing on any future doc that contains bracket-arbitrary-value-shaped prose
  until the content-scan scope is fixed at the Tailwind config level — worth a follow-up outside this
  phase's scope.
- The Phase-0 AA-table's stale 7.9:1 figure for the unlock banner (LOW finding) should be corrected in
  a follow-up pass over the Phase 0 table, since it's now been cited twice without correction.

## Procedure Compliance
- Plan consulted before review: yes — read `glass-redesign-phase2.plan.md` in full.
- Implementation summary read: yes — read `glass-redesign-phase2.impl.md` in full.
- Locked design spec read: yes — read `act-like-a-designer-toasty-yao.md` in full.
- Review summary written: yes (this file).

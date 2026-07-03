# Review Summary — Glass Redesign, Phase 0 (Foundation)

## Result
PASS-WITH-NITS — both prior blocking findings (CRITICAL build break, MEDIUM `[data-lang]` gap) are re-verified fixed. One new LOW finding surfaced during re-verification (drill page's locked-unit branch still doesn't set `[data-lang]`). Remaining LOW nits (roving-tabindex, codepoint upper bound, theme-toggle server-snapshot flash) are accepted as non-blocking follow-ups for Phase 0, per coordinator direction.

## Re-verification pass (2026-07-04)
Coordinator reported two fixes applied on top of the original review. Re-checked adversarially — read the actual diffs myself, did not trust the message — before re-running gates.

1. **CRITICAL build break (theme-toggle.tsx) — RESOLVED, confirmed.**
   `components/ui/theme-toggle.tsx:28` now reads `useSyncExternalStore<Theme>(subscribe, getSnapshot, () => "light")` (explicit generic argument pins `T = Theme`, so the untyped `() => "light"` no longer widens the inference to `string`). Read the file directly to confirm the exact diff before re-running anything.
   Re-ran clean (`rm -rf .next && npm run build`) **twice is unnecessary this time since the fresh run itself is definitive** — ran once with a clean `.next`: **exit 0**, TypeScript step now reports `Finished TypeScript in 5.0s` (previously `Failed to type check`), 6/6 static pages generated, all 7 routes listed. Also ran a standalone `npx tsc --noEmit -p tsconfig.json`: **exit 0**, zero errors project-wide (previously reported the one theme-toggle error as the project's only error — now gone, nothing else appeared in its place).

2. **MEDIUM `[data-lang]` gap — RESOLVED for the primary render path of all four routes, one narrow sub-branch still missing it (new LOW finding).**
   Confirmed by reading each file directly (not the coordinator's list):
   - `app/stats/page.tsx:23` — `<LangSync activeMode="mandarin" />` — present, unconditional (single return path).
   - `app/thai/stats/page.tsx:23` — `<LangSync activeMode="thai" />` — present, unconditional (single return path).
   - `app/thai/[unit]/lesson/page.tsx:68` — `<LangSync activeMode="thai" />` — present, unconditional (single return path).
   - `app/thai/[unit]/drill/page.tsx:52` — `<LangSync activeMode="thai" />` — present, **but only in the main (unlocked-unit) return branch**. The early-return "locked unit" branch (lines 32–46, rendered when `!current?.unlocked`) has its own separate `<main>` and does **not** render `<LangSync>`. A learner who deep-links to a still-locked Thai unit's drill URL would see that page with whatever `[data-lang]` was last set (or the default Mandarin accent, on a fresh/hard-reload visit) instead of Thai. Same invisible-in-Phase-0 caveat as the original finding (mesh only, low opacity, no accents on content surfaces yet) — flagging as LOW, not blocking, since it's a narrow edge state (locked-unit view of one route) rather than the broad every-route gap originally found. Worth a one-line fix (hoist `<LangSync activeMode="thai" />` above the `if (!current?.unlocked)` branch) whenever this file is next touched.

Re-ran `npm run lint` fresh: **exit 0**, clean — unaffected by either fix (as expected, no lint-relevant code changed).

## Files Reviewed (cumulative, both passes)
- `app/globals.css`
- `app/layout.tsx`
- `components/ambient-mesh.tsx`
- `components/lang-sync.tsx`
- `components/ui/glass-panel.tsx`
- `components/ui/glass-button.tsx`
- `components/ui/segmented-control.tsx`
- `components/ui/theme-toggle.tsx` (re-read this pass — confirmed the `<Theme>` generic fix)
- `app/page.tsx`
- `components/thai/thai-home.tsx`
- `components/mode-toggle.tsx` (unchanged, read for consumer-safety cross-check)
- `scripts/subset-hanzi-font.ts`
- `.gitignore`, `package.json`
- `lib/db/schema.ts` (read to verify `words.hanzi`/`cards.headword` column names used by the subset script)
- `app/stats/page.tsx`, `app/thai/stats/page.tsx`, `app/thai/[unit]/drill/page.tsx`, `app/thai/[unit]/lesson/page.tsx` (new this pass — verify `<LangSync>` wiring)
- `.claude/plans/active-plan.md`, `.claude/plans/implementation-summary.md`, `C:\Users\User\.claude\plans\act-like-a-designer-toasty-yao.md`

## Findings

### CRITICAL
- None open. (Prior: `theme-toggle.tsx:43` build-breaking type error — RESOLVED, see re-verification pass above.)

### MEDIUM
- None open. (Prior: `[data-lang]` wired into only `/` — RESOLVED for the primary path of every mode-specific route; one narrow sub-branch remains, downgraded to LOW below.)

### LOW
- **`app/thai/[unit]/drill/page.tsx:32-46` — locked-unit branch doesn't set `[data-lang]`.** New finding from this re-verification pass; see detail above. Not blocking Phase 0 (invisible today), but should be fixed in the same pass that closes out the broader `[data-lang]` work, not deferred indefinitely.
- **`components/ui/segmented-control.tsx` — radiogroup lacks roving tabindex.** Every `role="radio"` `<button>` is independently focusable via Tab; the ARIA Authoring Practices pattern for `role="radiogroup"` expects a single roving tab stop with arrow-key navigation between options. Functionally reachable today (Tab + Enter/Space both work); not explicitly required by the spec's accessibility bullets. Accepted as a non-blocking follow-up per coordinator direction — revisit before this primitive is reused for the mode toggle in Phase 1.
- **`scripts/subset-hanzi-font.ts:63` — unbounded codepoint range.** `if (cp >= 0x3400) chars.add(ch);` has no upper bound; harmless today (`fontTools.subset` silently drops glyphs missing from the source TTF rather than erroring) but imprecise. Accepted as a non-blocking follow-up per coordinator direction.
- **Theme-toggle server-snapshot flash risk — still not visually verified.** `getServerSnapshot` remains hardcoded to `() => "light"` (only its *type* changed this pass, not its value/behavior). For a returning dark-theme learner, the toggle's active-pill indicator computes against `"light"` during the SSR-matching hydration pass, then corrects once `useSyncExternalStore` detects the DOM already says `"dark"`. This is the React-recommended pattern and the correction typically lands pre-paint (no hydration-mismatch warning), but was not observed in a live browser this session either time (no persistent `next dev`/`next start` was started, per instructions both times). Carried forward as residual risk, not re-tested.

## Assertions Checked
- **`npm run build` passes (Phase 0 exit criterion):** PASS (re-verified this session, clean `.next`, exit 0) — previously FAIL, now resolved.
- **TypeScript project-wide clean:** PASS (`npx tsc --noEmit` exit 0, zero errors) — previously exactly one error (theme-toggle.tsx), now zero.
- **`[data-lang]` driven on every mode-specific route's primary render path:** PASS for `/`, `/stats`, `/thai/stats`, `/thai/[unit]/lesson`, and the unlocked-unit path of `/thai/[unit]/drill`. Not yet PASS for the locked-unit sub-branch of `/thai/[unit]/drill` (see LOW finding above).
- **Migration safety (no semantic token removed, dark values preserved):** PASS — unchanged since original review pass, re-confirmed no further edits to `app/globals.css` this pass (`git diff` scope for this pass was limited to `theme-toggle.tsx` + the four route files).
- **`@theme inline` correctness (`--font-hanzi`, `--radius-pill`, `--color-accent`):** PASS — re-confirmed present and correct in the freshly generated `.next/static/chunks/*.css` from this pass's successful build (not just the prior failed-build's compile-phase artifact).
- **Explicit `color` on buttons, reduced-motion no-ops, focus states preserved, hanzi-subset read-only-ness:** unchanged since original pass (no relevant files touched this round) — still PASS, not re-derived from scratch this pass since nothing in scope changed.
- **`motion`/font bundle impact:** now measurable (build succeeds) but page/first-load JS size numbers were not captured this pass — see Residual Risk.

## Commands Run (this re-verification pass — fresh, not trusting the coordinator's claims)
- `rm -rf .next && npm run build` — exit 0:
  ```
  ▲ Next.js 16.2.6 (Turbopack)
  - Environments: .env.local

    Creating an optimized production build ...
  ✓ Compiled successfully in 4.0s
    Running TypeScript ...
    Finished TypeScript in 5.0s ...
    Collecting page data using 10 workers ...
    Generating static pages using 10 workers (0/6) ...
    Generating static pages using 10 workers (1/6)
    Generating static pages using 10 workers (2/6)
    Generating static pages using 10 workers (4/6)
  ✓ Generating static pages using 10 workers (6/6) in 464ms
    Finalizing page optimization ...

  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats

  ƒ Proxy (Middleware)
  ○  (Static)   prerendered as static content
  ƒ  (Dynamic)  server-rendered on demand
  ```
  **Agrees with the coordinator's claim** — build is genuinely green, confirmed independently with a clean `.next`.
- `npx tsc --noEmit -p tsconfig.json` — exit 0, no output (zero errors project-wide). Cross-check beyond just the build's own type-check phase.
- `npm run lint` — exit 0:
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  Clean, matches prior result — unaffected by either fix, as expected.
- Direct file reads (not the coordinator's summary) of `theme-toggle.tsx`, `app/stats/page.tsx`, `app/thai/stats/page.tsx`, `app/thai/[unit]/drill/page.tsx`, `app/thai/[unit]/lesson/page.tsx` — used to independently locate the exact line-level diff and discover the locked-unit-branch gap the coordinator's message didn't mention.
- `grep -n "LangSync" app/**` — used to enumerate every `<LangSync>` call site across the whole `app/` tree in one pass, to catch anything the coordinator's four-file list might have missed (it didn't miss any route, but the drill page's list of *branches* wasn't disclosed).

## Residual Risk
- Drill page locked-unit branch `[data-lang]` gap (new LOW finding) — cheap fix, should land before this becomes visible in Phase 2/3.
- Theme-toggle server-snapshot hydration-flash question remains unobserved in a live browser (no `next dev`/`next start` was run persistently, per instructions both review passes) — recommend QA do the dark-theme hard-reload check called out above.
- No live-browser / chrome-devtools MCP verification has been done in either pass (reduced-motion emulation, FOUC-on-load, contrast checks) — still purely code-verified. This was true of the original pass too and remains the single biggest gap before Phase 0 can be considered fully proven end-to-end; recommend QA cover this explicitly.
- AA re-verification of new functional colors remains correctly deferred to Phase 4 per the plan.
- `motion`/font bundle-size impact is now measurable (build succeeds) but numbers weren't captured this pass — worth a quick look before merging, not blocking.

## Procedure Compliance
- Plan consulted before review: yes (`active-plan.md` + locked design spec, both passes)
- Implementation summary read: yes (original pass); coordinator's fix-report treated as an unverified claim, not evidence, this pass — re-derived everything from source files and fresh command output
- Review summary written: yes (this file, updated in place for the re-verification pass)

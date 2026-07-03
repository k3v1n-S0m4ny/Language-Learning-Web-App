# Implementation Summary — Glass Redesign, Phase 0 (Foundation)

Branch: `glass-redesign` (off `main`). Implementer: main agent (direct build; design-token authoring). Read `active-plan.md` (Phase-0 slice) + `act-like-a-designer-toasty-yao.md` (locked spec) before building.

## Completed
- **Token system** (`app/globals.css`): migrated dark mode from `@media prefers-color-scheme` to **`[data-theme="dark"]`** on `<html>`, with a `:root:not([data-theme])` media fallback for no-JS. Layered on (no existing token removed): radius scale `--r-sm..--r-xl/--r-pill`; easing/spring tokens (`--ease-spring/-out/-soft`); display scale (`--text-display`, `--tracking-display`); light+dark **glass tokens** (`--glass-bg/-strong/-brd/-spec/-shadow/-blur/-saturate`); Mandarin tone hues (`--tone-1..4`, neutral); Read-Thai restyled class+tone hues (light values + brighter `[data-theme="dark"]` values); per-language accents via `[data-lang="mandarin"|"thai"]`. Wired into `@theme inline`: `--font-hanzi` (with system-CJK fallback stack), `--color-accent/-2/-3`, `--radius-pill`. Added utilities: `.text-display`, `.glass`, `.glass-strong`, and the reduced-motion-gated `@keyframes mesh-drift`.
- **No-flash theme** (`app/layout.tsx`): dependency-free inline `<script>` in `<head>` sets `[data-theme]` from `localStorage` else OS pref before paint; `<html suppressHydrationWarning>`.
- **LXGW WenKai (Kai) hanzi font**: `scripts/subset-hanzi-font.ts` reads the deck's distinct hanzi from the **production DB (READ-ONLY** — `SELECT words.hanzi UNION cards.headword`), subsets the OFL v1.522 TTF with fonttools → `app/fonts/lxgw-wenkai-subset.woff2` (**196 glyphs, 36.9 KB**). Wired via `next/font/local` (`--font-lxgw`, `preload:false`) + `.font-hanzi` utility. Source TTF cached under gitignored `scripts/.font-cache/`.
- **`motion` v12.42.2** installed.
- **New components**: `components/ambient-mesh.tsx` (server; fixed `-z-10` accent-tinted blurred blobs, drift gated by the reduced-motion keyframe), `components/lang-sync.tsx` (client; sets `[data-lang]` from server mode), `components/ui/{glass-panel,glass-button,segmented-control,theme-toggle}.tsx`.
- **Wiring**: `ThemeToggle` + `LangSync` added to the Mandarin home header (`app/page.tsx`) and Thai home header (`components/thai/thai-home.tsx`) so both modes can switch theme and drive `[data-lang]`.

## Left undone (by design — later phases)
- Surface reskins (top bar, Mandarin card/flip/tone-colour, Thai drills, stats, celebrations) — Phases 1–4. Phase 0 is intentionally near-inert: existing semantic tokens still drive all current UI; glass primitives are available but not yet swapped into surfaces (so the ambient mesh currently sits behind opaque `bg-background` mains and only becomes visible once surfaces go translucent in P1+).
- AA re-verification of the new functional colours (tone/class/accent) in both themes — Phase 4 audit.

## Commands run (verbatim results)
- `npm i motion` → `added 4 packages, and removed 1 package` (exit 0).
- `curl -sL … LXGWWenKai-Regular.ttf` → 25M cached (exit 0).
- `python -c "import brotli"` → `brotli ok`; `npx tsx scripts/subset-hanzi-font.ts` → `Subsetting to 196 distinct glyphs… Wrote …lxgw-wenkai-subset.woff2 (36.9 KB)` (exit 0).
- `npm run build` → **first attempt FAILED** (TS: `HTMLMotionProps` conflict on `onAnimationStart` in glass-button). Fixed by typing props as `HTMLMotionProps<"button">`. **Re-run PASSED**: `✓ Compiled successfully in 4.1s`, TypeScript finished, 6/6 static pages generated (exit 0).
- `npm run lint` → **first attempt FAILED** (`react-hooks/set-state-in-effect` in theme-toggle). Fixed by rewriting to `useSyncExternalStore`. **Re-run PASSED**: clean (exit 0).
- Dev smoke: `npm run dev` booted (`✓ Ready in 512ms`); `GET /` → 200 (via next-auth signin redirect). Prerendered `.next/server/app/_not-found.html` contains the no-flash script, a `mesh-drift` blob, and `suppressHydrationWarning`/`data-theme` — layout wiring confirmed in output.

## Issues discovered
- **motion + HTML button prop typing**: spreading `ButtonHTMLAttributes` onto `motion.button` conflicts on `onAnimationStart`. Resolved with `HTMLMotionProps<"button">`.
- **setState-in-effect lint**: reading `[data-theme]` after mount via `useEffect`+`setState` trips React 19's new rule. Resolved with `useSyncExternalStore` (also gains cross-tab sync).
- **Workspace-root warning** (pre-existing): two lockfiles (`C:\Users\User\package-lock.json` + project). Next picks the wrong root. Not introduced here; left for a follow-up (`turbopack.root`).

## Spec deviations
- None on design. One structural note: `[data-lang]` is set client-side via `LangSync` (effect) rather than pre-paint, because the root layout doesn't know the server-persisted mode without an extra per-route query. Accepted in the plan; imperceptible in P0 since accents aren't on content surfaces yet.

## Procedure compliance
- Branched before work ([[vercel-prod-db-is-dev-db]]). DB access was READ-ONLY (subset script; no writes/migration). Handoff files written to project-local `.claude/plans/`. Font source cached in gitignored dir; only the tiny subset woff2 is committed. Direct build (design-token authoring) rather than implementer-agent delegation; code-reviewer pass to follow.

## Post-review fixes (round 2)
Code review returned **NEEDS-REWRITE** with one critical + one medium, both valid:
- **[Critical] Build broke after the lint fix.** My earlier "build PASSED" was stale — that pass predated the `useSyncExternalStore` rewrite (done to satisfy lint), which I never re-built. The untyped `() => "light"` server snapshot widened the generic to `string`. **Fixed**: `useSyncExternalStore<Theme>(…)`. Lesson recorded: re-run *every* gate after *any* change, never trust a per-command pass from before a later edit.
- **[Medium] `LangSync` only on `/`.** Added it to `app/stats/page.tsx` (mandarin), `app/thai/stats/page.tsx`, `app/thai/[unit]/drill/page.tsx`, `app/thai/[unit]/lesson/page.tsx` (thai) so `[data-lang]` is correct on every mode-specific route.

Re-verification (clean `.next`): `npm run build` → **PASSED**, 6/6 static pages (exit 0). `npm run lint` → clean (exit 0).

## Round 3 (reviewer re-confirm)
Reviewer re-verified adversarially → **PASS-WITH-NITS**. Flagged one new LOW: the drill page's *locked-unit* early-return branch lacked `<LangSync>`. Fixed (added to that branch too). Remaining nits are LOW/non-blocking follow-ups (segmented-control roving-tabindex; subset codepoint upper bound; theoretical theme-toggle server-snapshot flash — unobserved). Post-fix `npm run build` (6/6) + `npm run lint` both green.

## Status: Phase 0 COMPLETE — build + lint green, code review PASS-WITH-NITS. Ready for user preview review before Phase 1.

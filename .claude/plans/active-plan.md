# Active Plan — Glass Redesign, Phase 0 (Foundation)

Branch: `glass-redesign` (off `main`, clean). Rollout per master plan: branch → Vercel preview → whole cutover. Pure frontend, **no schema/data change**.

**Authoritative design spec:** `C:\Users\User\.claude\plans\act-like-a-designer-toasty-yao.md` (locked, do not re-open). This file is the Phase-0 execution slice only.

## Goal of Phase 0
Lay the token-first foundation so every later phase cascades: extended `globals.css` token system (radius / glass / spring / per-language accents / per-mode / display scale), `[data-theme]` + `[data-lang]` wiring, no-flash theme script + toggle, ambient mesh, `motion` installed, LXGW WenKai (subset) + display scale. **No surface reskin yet** — Phase 0 must be visually near-inert (existing semantic tokens still drive all current UI); it only makes new tooling available. Ship it so the app looks essentially unchanged but the plumbing is live.

## Deliverables (files)
1. **`app/globals.css`** — extend, do NOT remove any existing semantic token (migration-safe layering):
   - Radius scale: `--r-sm:8px --r-md:14px --r-lg:22px --r-xl:30px --r-pill:999px` (concentric).
   - Glass tokens, light + dark (see values below): `--glass-bg --glass-bg-strong --glass-brd --glass-spec --glass-shadow --glass-blur(20px) --glass-saturate(180%)`.
   - Easing/spring tokens: `--ease-spring:cubic-bezier(.34,1.56,.64,1) --ease-out:cubic-bezier(.16,1,.3,1) --ease-soft:cubic-bezier(.4,0,.2,1)`.
   - Display type scale: `--text-display:clamp(2.5rem,6vw,4rem) --tracking-display:-.03em` (+ `.text-display` utility).
   - Convert dark mode from `@media (prefers-color-scheme:dark)` to **`[data-theme="dark"]`** driven, keeping a `@media` fallback ONLY inside a `:root:not([data-theme])` guard so system default still works pre-hydration.
   - Per-language accent + mesh sets via `[data-lang="mandarin"]` / `[data-lang="thai"]` (accents from spec). Define tone hues (Mandarin pinyin T1–T4+neutral) and restyled Thai class/tone hues as tokens now (consumed in P1/P2).
   - Wire new tokens into `@theme inline` where they should surface as utilities.
2. **`app/layout.tsx`** — add inline no-flash `<script>` (sets `data-theme` on `<html>` from `localStorage` else `prefers-color-scheme`, before paint); add LXGW WenKai local font var + `.font-hanzi` utility; render `<AmbientMesh/>`. Keep existing font vars.
3. **`components/theme-provider` / no-flash** — inline script only (no context needed); theme state read/written by the toggle.
4. **`components/ui/segmented-control.tsx`** — reusable glass segmented control (used by theme toggle now, mode toggle later).
5. **`components/ui/theme-toggle.tsx`** — client; toggles `data-theme` + persists to `localStorage`; glass press.
6. **`components/ui/glass-panel.tsx`, `glass-button.tsx`** — primitives (className-driven, token-based). Not yet swapped into surfaces.
7. **`components/ambient-mesh.tsx`** — fixed `z-index:-2`, low-opacity blurred radial blobs tinted from active-lang accents; CSS drift gated behind `prefers-reduced-motion`.
8. **`components/lang-sync.tsx`** — tiny client component, prop `activeMode`, sets `document.documentElement.dataset.lang`; rendered by `page.tsx`/stats/thai pages (root layout can't know server-persisted mode without an extra query per route).
9. **`motion`** — `npm i motion` (feature branch).
10. **Hanzi subset** — `scripts/subset-hanzi-font.ts` (or build step) that reads the deck's distinct hanzi from DB (READ-ONLY) and produces a small `app/fonts/lxgw-wenkai-subset.woff2`. ⚠ Needs the LXGW WenKai source + a subsetter — see open fork below; may be split to Phase 0b.

## Concrete token values
Light glass: bg `rgba(255,255,255,.55)`, strong `.72`, brd `rgba(255,255,255,.6)`, spec `rgba(255,255,255,.9)`, shadow `0 8px 32px rgba(0,0,0,.12)`.
Dark glass: bg `rgba(32,40,42,.55)`, strong `.72`, brd `rgba(255,255,255,.12)`, spec `rgba(255,255,255,.16)`, shadow `0 8px 32px rgba(0,0,0,.44)`.
Mandarin accents: jade `#12B886`, vermilion `#F0453A`, gold `#F6B01E`. Thai accents: saffron `#F59E0B`, teal `#0EA5A4`, ruby `#E11D74`.
Mandarin tone hues: T1 `#E5484D` T2 `#E8890C` T3 `#2E9E63` T4 `#3B7DD8` neutral `var(--foreground-muted)`.
Thai (dark values; darken for light): classes mid `#2DD4BF` high `#FBBF24` low `#A78BFA`; tones mid `#94A3B8` low `#38BDF8` falling `#F87171` high `#4ADE80` rising `#E879F9`.

## Constraints / gotchas
- **`bg-background`/`bg-surface`/`bg-brand` consumers must keep working** through migration — layer glass on top, never delete semantic tokens.
- No-flash script must run before first paint and be dependency-free.
- Every animation (mesh drift, later flip/celebrations) ships a `prefers-reduced-motion` no-op fallback.
- Dark "flat" surfaces stay visible: surface lighten + specular top edge + real border (a11y note in spec).
- DB is **production** (see [[vercel-prod-db-is-dev-db]]); the hanzi-subset script is READ-ONLY (SELECT distinct hanzi). No writes, no migration.

## Verification (Phase 0 exit)
- `npm run build` passes; check `motion` + font bundle impact.
- `npm run dev`: app looks ~unchanged; theme toggle flips light/dark with **no FOUC**; `data-lang` flips mandarin↔thai with mode; ambient mesh renders behind content and freezes under reduced-motion.
- No regression to existing Mandarin review / Thai drill / stats.

## Status: IN PROGRESS — Phase 0 authoring.

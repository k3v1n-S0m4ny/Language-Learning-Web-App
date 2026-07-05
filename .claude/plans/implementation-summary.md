# Implementation Summary — Mobile-First UX-Polish Pass

Branch: `glass-redesign` (not committed — per plan's "do not commit unless the owner asks").
Plan: `C:\Users\User\.claude\plans\last-time-we-redesigned-cozy-codd.md` (source of truth). Built in phase order 0→4.
(Supersedes the earlier mobile-layout-balance-pass summary, which is committed as `e58cd38` and captured in `mobile-ux-polish.handoff.md`.)

## Completed work (all 5 phases)

### Phase 0 — foundation (`app/globals.css`)
- Global `:where(a,button,[role=button],[role=radio],[tabindex]):focus-visible` ring (2px `--accent`, offset 2px, `border-radius: inherit`) + opt-in `.focus-ring`. Closes the app's only-UA-default a11y gap.
- `--safe-bottom: env(safe-area-inset-bottom, 0px)`.
- Gated `@keyframes shake` (±6px translateX) + `correct-pulse` (scale 1→1.04→1) inside the existing `@media (prefers-reduced-motion: no-preference)` block; matching `--animate-shake` / `--animate-correct-pulse` in `@theme inline`.
- `.tap-press` utility (gated `transition: transform .1s var(--ease-soft)`; `:active{scale(.97)}`) for server-component press feedback.

### Phase 1 — affordances
- `.focus-ring` on drill MC option tiles (`drill-session.tsx`) and phrase-split boundary buttons (`phrase-split-question.tsx`).
- Press feedback: `whileTap` spring (500/30, scale 0.97) on client controls (drill option tiles, Next/Finish, phrase-split Check); `.tap-press` CSS on server controls (all 5 back-link pills across the 4 non-home pages, unit-row Lesson/Drill links, lesson "Next unit →"/"Start drilling", drill summary "Back to units").
- `unit-row.tsx`: hover-lift (`transition-shadow` + stronger `hover:shadow`) + `›` chevron with `group-hover:translate-x-0.5` on the CTAs.

### Phase 2 — `lib/ux/` (new module)
- `prefs.ts` — localStorage + `useSyncExternalStore` (theme-toggle pattern). Keys `ux:haptics` (default on), `ux:sound` (default off). Imperative getters/setters + `useHapticsEnabled()`/`useSoundEnabled()` hooks; same-tab custom events + storage event.
- `haptics.ts` — `haptic('tap'|'success'|'error'|'unlock')`, triple-gated (feature-detect + pref + reduced-motion), try/catch.
- `sfx.ts` — `playSfx('correct'|'incorrect'|'unlock')` via lazy module-singleton AudioContext, triangle oscillator + gain envelope, no asset files, gated on sound-pref only.
- `audio.ts` — the single `playAudio(url)` clip seam (returns the `HTMLAudioElement`). `audio-button.tsx` re-exports it (back-compat for `review-session`); `audio-play-button.tsx` refactored to call it while keeping its `playing` state.

### Phase 3 — animations (spring house-style, double-gated)
- Drill answer feedback (`drill-session.tsx`): correct → `animate-correct-pulse` on the chosen tile + `haptic('success')` + `playSfx('correct')`; incorrect → `animate-shake` + `haptic('error')` + `playSfx('incorrect')`; fired inside the gesture-initiated submit transition. Unit-unlock → `haptic('unlock')` + `playSfx('unlock')` fired in the Finish-round transition (gesture-safe AudioContext), same condition as the confetti.
- `progress-ring.tsx` → `"use client"` leaf animating `motion.circle` `strokeDashoffset` full→target (spring 120/20); reduced-motion → static final offset. `unit-row.tsx` stays a server component.
- List stagger (CSS `animation-delay`, entrance-only): `thai-home.tsx` unit rows (`Math.min(i,10)*40ms`) + both stats pages' metric tiles (0/40/80ms). Added a server-safe `style` passthrough to `StatCard`.
- New `app/template.tsx` (`"use client"`): route entrance fade+lift (spring 300/30); reduced-motion → plain wrapper. Entrance-only (no AnimatePresence).

### Phase 4 — persistent bottom nav + navigation
- New `components/bottom-nav.tsx` (`"use client"`, `sm:hidden`): floating `.glass` bar, `fixed inset-x-3 bottom-3`, `padding-bottom: calc(0.25rem + var(--safe-bottom))`, tap targets ≥48px. Tabs Study→`/`, Progress→`/stats`|`/thai/stats` by mode, Menu→glass popover (ModeToggle + ThemeToggle + Haptics/Sound toggles + SignOutButton). Active tab via `usePathname()`; `layoutId` spring indicator; mode read from `dataset.lang` via `useSyncExternalStore` on `langchange`. Recedes (opacity-50) during a session via `useSessionActive`.
- New `components/ux-toggles.tsx` — Haptics/Sound `SegmentedControl`s for the menu.
- New `lib/ux/session-focus.ts` — module-singleton store; `ReviewSession` (mount) + `DrillSession` (phase≠summary) set it active.
- `lang-sync.tsx` — dispatches `langchange` after setting `dataset.lang`.
- `layout.tsx` — mounts `<BottomNav signOut={<SignOutButton variant="ghost"/>}/>` globally (server passes the server-component SignOutButton as a prop).
- Content clearance `pb-[calc(5rem+var(--safe-bottom))] sm:pb-8` on all 6 `<main>`s.

## Commands run (verbatim results)
- `npx tsc --noEmit` after each phase → **exit 0** (all four checkpoints; `TSC_EXIT: 0`).
- `npm run lint` → **exit 0** (`LINT_EXIT: 0`).
- `npm run build` → **exit 0** (`BUILD_EXIT: 0`); `✓ Compiled successfully in 10.8s`, TypeScript passed, `✓ Generating static pages (6/6)`. (Pre-existing lockfile-root warning only — unrelated to this work.)

## Live verification (chrome-devtools MCP, 390×844×3 mobile + 1280 desktop, READ-ONLY on data)
Verified against a fresh dev server on :3000 (killed a stale pre-edit server that threw a Turbopack "Jest worker" compile error on the drill route — NOT a code bug; fresh server served `/thai/2/drill 200` and every route clean).
- **Home (Thai):** bottom nav renders (Study/Progress/Menu), Progress→`/thai/stats`; chevrons on CTAs; progress rings settle at correct offsets (100%→0, 11%→111.84/125.66, 0%→full); `scrollWidth==clientWidth` (no h-scroll); `data-lang=thai`.
- **Menu popover:** all 4 toggles + Sign out; **haptics default On, sound default Off** (confirmed `localStorage` null→defaults; toggling sound wrote `ux:sound=on`, reset to `off`); closes on tap-away.
- **Focus ring:** real keyboard Tab → first control `:focus-visible` matches, `2px solid rgb(245,158,11)` (= `--accent` saffron).
- **Desktop (1280):** bottom nav `display:none` (`sm:hidden`); no h-scroll; TopBar owns desktop (no duplication).
- **Drill (/thai/2/drill):** nav receded `opacity:0.5` (session-focus); 4 `.focus-ring` option tiles; clean console. Did NOT answer/press Check (DB writes).
- **Stats (/thai/stats):** nav `opacity:1` (not a session); Progress tab `aria-current="page"`; 3 staggered tiles; clean console.
- **Mode signal:** on `/stats`, `data-lang=mandarin` → nav Progress correctly re-points to `/stats` (proves langchange-driven mode read).
- **Lesson (/thai/2/lesson):** 3 `.tap-press` els; clean console; no h-scroll.
- Feature-detect confirmed: `navigator.vibrate` and `AudioContext` both present in test Chrome.

## Left undone / notes
- **Not committed** (per plan). Working tree has all phase edits on `glass-redesign` plus unrelated `.claude/` bookkeeping.
- Real haptic vibration and audible sfx require a physical device / speakers — verified the gating + pref plumbing + feature-detect, not the literal buzz/tone.
- Reduced-motion: verified via the code path (motion `animate` target == static offset; keyframes gated in CSS) — chrome-devtools `emulate` did not expose a reduced-motion toggle in this session, so it was validated by construction rather than a live media emulation.

## Spec deviations
None. Nav tap targets are `min-h-[3rem]` (48px), exceeding the ≥44px spec.

## Procedure compliance
Built in strict phase order 0→4 (each phase's deps satisfied before the next). Typecheck gate after every phase; lint + build gate at the end; live read-only verification of every route. No rating/Check/drill completion (no DB writes) per the prod-DB-is-dev-DB constraint.

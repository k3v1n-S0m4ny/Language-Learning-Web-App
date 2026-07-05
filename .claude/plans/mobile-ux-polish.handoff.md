---
feature: mobile-ux-polish
created: 2026-07-05T07:22:16.371717+00:00
source-session: cda98b16-f63e-4606-99df-2d98e742ac53
context-at-handoff: 228679 (red)
---

# Handoff: Mobile-First UX-Polish Pass (affordances, animations, navigation, haptics/sound)

## Goal
Make the glass-redesigned language-learning app *feel* alive and easy to navigate on a phone,
without regressing desktop or the glass aesthetic, honoring reduced-motion everywhere. The full
approved plan is at `C:\Users\User\.claude\plans\last-time-we-redesigned-cozy-codd.md` — READ IT
FIRST; it is the source of truth. This handoff exists because the planning session hit 229k tokens
(red) at a clean milestone: plan approved, build not yet started.

Repo: `c:\Users\User\Software Projects\Language-Learning-App`. Branch: `glass-redesign` (NOT main).
Stack: Next.js 16 (Turbopack) / React 19 / Tailwind v4 (no config; tokens in `app/globals.css`) /
`motion@^12.42.2` (`motion/react`). Dev: `npm run dev` → http://localhost:3000.

## Completed (this session — prerequisite work, already shipped)
- **Mobile layout-balance pass** — committed as `e58cd38` on `glass-redesign` (17 files). Fixed
  360px overflow (top bar), 2px→24x44px tap target (phrase-split), grid collapses, gutters. Verified
  live in Chrome DevTools at a true 360px viewport (no real horizontal scroll) + 1280px non-regression;
  `npm run build` and `npm run lint` clean. This is DONE — do not redo it.
- **The UX-polish plan itself** — written + approved. Not yet implemented.

## Remaining tasks (this is the whole job — build the plan, in phase order)
1. **Phase 0** — `app/globals.css`: global `:focus-visible` ring (`:where(...)` + `.focus-ring`),
   `--safe-bottom: env(safe-area-inset-bottom,0px)`, gated `shake` + `correct-pulse` keyframes (+
   `--animate-*` in `@theme inline`), `.tap-press` utility. Foundation — everything depends on it.
2. **Phase 1** — affordances: `.focus-ring` on drill option tiles; press feedback (motion `whileTap`
   spring 500/30 on client controls, `.tap-press` CSS on server controls); unit-row hover-lift + chevron.
3. **Phase 2** — new `lib/ux/`: `prefs.ts` (localStorage + useSyncExternalStore, keys `ux:haptics`=on,
   `ux:sound`=OFF), `haptics.ts` (`haptic()` triple-gated), `sfx.ts` (`playSfx()` WebAudio oscillator
   tones, no asset files, gated on sound-pref only). Unify the two audio impls onto one `playAudio` seam.
4. **Phase 3** — animations: drill correct/incorrect (pulse/shake + wire haptic()+playSfx()); animate
   `progress-ring.tsx` stroke fill (make it a `"use client"` leaf, keep `unit-row.tsx` server); list
   stagger via CSS `animation-delay` on `thai-home.tsx` + stats tiles; new `app/template.tsx` route fade.
5. **Phase 4** — `components/bottom-nav.tsx` (`"use client"`, mobile-only), mount in `app/layout.tsx`;
   `lang-sync.tsx` dispatch `langchange`; `lib/ux/session-focus.ts` recede store; `pb-[calc(5rem+var(--safe-bottom))]`
   on all 6 `<main>`s.

## Next steps (start here)
1. `git status` — confirm on `glass-redesign`, working tree clean except unrelated `.claude/` bookkeeping
   (agent-memory, settings.local.json, glass-redesign.handoff.md) which are NOT part of this work.
2. Read the plan file `C:\Users\User\.claude\plans\last-time-we-redesigned-cozy-codd.md` in full.
3. Start Phase 0: edit `app/globals.css` (focus ring after the existing utilities region; keyframes
   inside the existing `@media (prefers-reduced-motion: no-preference)` block; `--animate-*` in the
   `@theme inline` block ~line 429). Use the `implementer` agent for edits.
4. `npm run dev` (background) and verify each phase live with chrome-devtools MCP.

## Key decisions + rationale
- **Bottom nav on mobile, TopBar on desktop** (nav is mobile-only via responsive hide; TopBar unchanged
  on the two `/` home variants) — avoids duplicate Stats/mode/theme controls. Rejected: bottom nav
  everywhere (redundant on home), replace TopBar (biggest change, loses desktop top chrome).
- **Sound = WebAudio-generated tones, default OFF** — no audio asset files exist and licensing is out of
  scope; opt-in via a menu toggle. Rejected: shipping/ sourcing audio files, sound-on-by-default (annoying).
- **UX prefs in localStorage, NOT learner_settings** — the local DB IS production (see memory
  `vercel-prod-db-is-dev-db`); per-device UI prefs don't warrant a risky prod migration. Mirror
  `components/ui/theme-toggle.tsx`'s localStorage + useSyncExternalStore pattern.
- **Bottom nav reads mode from `document.documentElement.dataset.lang`** (already set by
  `components/lang-sync.tsx` on every page) via useSyncExternalStore on a new `langchange` event — so
  `app/layout.tsx` (a server component with no learnerId/activeMode) needs no new query/cookie/context.
- **List stagger + route transition use CSS/entrance-only, not AnimatePresence** — the codebase has zero
  AnimatePresence usage; entrance-only matches house conventions and avoids fighting App Router streaming.
- **Double-gate reduced motion** (JS `useReducedMotion()` AND CSS keyframe inside the `no-preference`
  media block) is the established codebase rule — apply to every animation. Haptics self-gate on
  reduced-motion (vibration=motion); sound gates on mute-pref only.

## Verification evidence (of the completed prerequisite, for confidence)
- `git log --oneline -1` → `e58cd38 Glass redesign: mobile layout balance pass`
- Mobile pass: DevTools at true 360px viewport → `scrollLeft` unmovable (no real h-scroll); phrase-split
  boundary measured `hitW:24 hitH:44 visibleStripeW:2 visibleStripeH:24`; 1280px top bar/stats non-regressed.
- `npm run build` → exit 0 (6/6 static pages); `npm run lint` → exit 0.

## Read before starting
1. `C:\Users\User\.claude\plans\last-time-we-redesigned-cozy-codd.md` — the full approved plan (source of truth).
2. `app/globals.css` — tokens, `@theme inline`, the `@media (prefers-reduced-motion: no-preference)` block, `page-gutter`, `.rate-press`.
3. `components/ui/theme-toggle.tsx` (prefs pattern to mirror), `components/ui/glass-button.tsx` + `components/ui/segmented-control.tsx` (motion house-style + layoutId indicator), `components/lang-sync.tsx` (mode signal seam), `app/layout.tsx` (where bottom nav mounts), `components/thai/drill/drill-session.tsx` (drill feedback surface), `components/thai/progress-ring.tsx` (ring to animate).

## Verification constraints
- Local DB IS production — verification is READ-ONLY: navigate + screenshot only; never click a rating,
  press Check, or complete a drill (all are DB writes). Emulate a true mobile viewport with chrome-devtools
  `emulate` (`390x844x3,mobile,touch`), and emulate reduced-motion both ways. Gate at the end with
  `npm run build` + `npm run lint`. Do not commit unless the owner asks.

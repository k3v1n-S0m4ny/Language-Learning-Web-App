---
feature: glass-redesign
created: 2026-07-04T10:13:05.245960+00:00
source-session: 75783099-0709-4dbd-88d4-9d7fb151307f
context-at-handoff: 152k (red)
---

# Handoff: Apple-glassmorphic redesign — Phases 0–3 done, Phase 4 (Polish + cutover) next

## Goal
Redesign the whole language app around an Apple "Liquid Glass" aesthetic, token-first, on branch
`glass-redesign` (off `main`). Design is 100% locked — do NOT re-open decisions. Phases 0/1/2/3 are
complete, reviewed PASS, verified green, and COMMITTED. Final milestone: **Phase 4 — Polish + Vercel
preview → whole-app cutover merge to `main`.** This is the owner-involved phase (live browser audits +
a preview deploy he signs off on before the cutover), unlike 0–3.

## Completed (committed on `glass-redesign`)
- **446cf39 Phase 0** — token foundation (`app/globals.css` themes/radius/glass/spring/display tokens,
  Mandarin+Thai palettes, `[data-lang]` accents; no-flash theme script + `ThemeToggle`; `motion` v12;
  `AmbientMesh`; glass primitives in `components/ui/`; `LangSync`; LXGW WenKai Kai subset).
- **1cdf332 Phase 1** — Mandarin study flow (tone-sandhi engine + 24 tests, floating `TopBar`,
  reskinned card/flip/rating/word-chip). Mechanics preserved.
- **28dd313 Phase 2** — Read-Thai glass-native retoken (Thai class+tone palettes, TopBar, glass unit map,
  flat-retokened drills, lessons; `@source not "../.claude"` in globals.css). Reviewed PASS.
- **45b5b40 Phase 3** — Stats + celebrations (THIS session). Hero count-up + glass metric cards on both
  stats pages; restyled Recharts (area fills, per-language accent series, glass tooltips, reduced-motion
  gating); two intensity ramps → glass-native heat scale (`components/thai/stats/heat-scale.ts` +
  `--heat-0..4`/`--heat-N-ink` tokens); milestone `Celebration` (confetti+spring) wired into Thai
  unit-unlock + Mandarin deck-cleared (sessionStorage one-shot gate). New primitives:
  `components/ui/{count-up,stat-card,celebration}.tsx`, `components/stats/glass-tooltip.ts`. Phase 3 AA
  block in globals.css. Reviewed **PASS after 2 blockers fixed** (heat-ramp CSS cascade collision failing
  AA on worst cells; celebration spring-pop mis-gated on idle empty-state) — see phase3.review.md.

## Verified state (as of handoff)
- `git branch --show-current` → `glass-redesign`; HEAD **45b5b40**; Phase 3 fully committed.
- Working tree has ONLY: uncommitted agent-memory (`.claude/agent-memory/code-reviewer/*`) + THIS
  handoff file. No source is uncommitted. `lib/**`/`seed/**` untouched across all 4 phases.
- `npm test` → 24/24. `npm run build` → exit 0 (only the pre-existing two-lockfile Turbopack
  workspace-root warning — harmless, present every phase). `npm run lint` → exit 0.

## Remaining tasks — Phase 4 (Polish + cutover)
Per the spec's "Build order → Phase 4", "Accessibility", "Verification (end-to-end)":
1. **Vercel preview FIRST** (owner wants a live URL before the cutover). Vercel CLI is NOT installed
   (`npm i -g vercel`). Determine how this project deploys: check if the repo is Git-linked to a Vercel
   project (pushing `glass-redesign` would auto-build a preview) vs. needing the CLI. Ask the owner /
   confirm before deploying. ⚠ Pure frontend, no env/DB change — the preview hits the SAME prod DB
   ([[vercel-prod-db-is-dev-db]]); it's read-mostly but be aware.
2. **Full AA audit** (the reviewer explicitly deferred the LIVE contrast pass to QA/Phase 4; static-code
   review + computed ratios are done and documented in globals.css Phase 0–3 blocks). Use chrome-devtools
   MCP: script contrast checks on rating ramp, 5 Mandarin tone hues, 5 Thai tone hues, 3 Thai class
   chips, and the new `--heat-*` ramp — in BOTH themes. Target AA (4.5:1 small text / 3:1 graphical).
3. **Reduced-motion sweep** — emulate `prefers-reduced-motion: reduce`; confirm fallbacks on: card flip,
   ambient mesh, celebrations (confetti+spring both suppressed), count-ups (instant final value), chart
   entry animations (`isAnimationActive` off). Known LOW residual: `motion`'s `useReducedMotion()`
   returns null on SSR/first render — a numeric CountUp hero could briefly SSR "0" for a reduced-motion
   user (inherited lib behavior since Phase 1, flagged in phase3.review.md — decide if worth fixing now).
4. **Cross-device + hanzi/Thai-glyph legibility** — mobile viewport; hanzi (LXGW WenKai) at small sizes;
   Thai glyphs sized ~1.6× (a Thai consonant fills only ~50% of its font-size). Screenshot every screen
   in light+dark+both languages.
5. **Bundle check** — confirm `motion` + LXGW WenKai subset impact is acceptable; hanzi subset stays small.
6. **Whole-app cohesive review on the preview**, then the **single cutover merge `glass-redesign` → `main`**
   (owner confirms the merge — never merge/push to main without explicit go).

## Next steps (start here)
1. `cd "C:/Users/User/Software Projects/Language-Learning-App"`; confirm branch `glass-redesign`,
   HEAD `45b5b40`. Read the spec's "Verification (end-to-end)" + "Accessibility" sections.
2. **Resolve the deploy path with the owner** (task 1) before anything else — it gates the live audits.
   Then stand up the Vercel preview.
3. Run the live audits (AA / reduced-motion / cross-device) against the preview using chrome-devtools MCP
   (or the qa-engineer agent). File findings; fix any AA/reduced-motion misses via the implementer
   (clean context) → code-reviewer, same chain as 0–3. Write `.claude/plans/glass-redesign-phase4.*` docs.
4. On owner sign-off: merge to `main`. Owner decides commit/merge timing.

## Key decisions + rationale
- All locked design lives in the spec (see Read before starting). **Mandarin ≠ Thai** — shared design
  language, each keeps a surface fitting its own pedagogy; reskins PRESERVE mechanics, never remove
  interactions ([[mandarin-thai-distinct-card-design]]).
- **Pure frontend across all phases** — no schema/data change. Keep Phase 4 that way (the preview will
  hit prod DB read-mostly; don't run migrations/seeds).
- Handoff chain is the local `.claude/plans/` (project-local), NOT `~/.claude/plans/`.
- Two reviewer-memory notes from Phase 3 are uncommitted in the tree (Tailwind same-property class
  cascade collisions; partial gating in multi-effect celebration components) — leave for the owner.

## Dead ends — do not retry
- Do NOT gitignore `.claude/plans/` to silence the old Tailwind scan warning — fixed properly via
  `@source not "../.claude"` (Phase 2); handoff docs are intentionally committed.
- Do NOT debug Thai glyph rendering in HTML mocks — the mock's squished ก is a mock-only system-font
  fallback artifact; the real app bundles Noto Sans Thai.
- The two-lockfile Turbopack workspace-root build warning is pre-existing + harmless — not a Phase 4 task.
- `text-foreground` + `text-[var(--heat-N-ink)]` on the SAME element = cascade collision that silently
  defeated AA (Phase 3 CRITICAL). When two same-property Tailwind utilities co-exist, the later one in
  the compiled bundle wins regardless of className order — never rely on className order.

## Read before starting
1. `C:\Users\User\.claude\plans\act-like-a-designer-toasty-yao.md` — authoritative design spec
   (Verification end-to-end, Accessibility, Rollout rows).
2. `C:\Users\User\Software Projects\Language-Learning-App\.claude\plans\glass-redesign-phase3.review.md`
   — the deferred-to-QA items + LOW residual risks (reduced-motion SSR, streak 84-day cap) to verify live.
3. `...\.claude\plans\glass-redesign-phase3.impl.md` — full Phase 3 detail incl. Post-review fixes.
4. Project memory: `glass-redesign-design-complete.md`, `mandarin-thai-distinct-card-design.md`,
   `vercel-prod-db-is-dev-db.md`.

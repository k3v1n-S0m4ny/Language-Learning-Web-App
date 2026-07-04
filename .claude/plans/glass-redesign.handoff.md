---
feature: glass-redesign
created: 2026-07-03T22:57:37.575697+00:00
source-session: e511518b-0f97-4df0-8f89-ad04ebb60013
context-at-handoff: 477k (red)
---

# Handoff: Apple-glassmorphic redesign — Phase 1 done, Phase 2 (Thai) next

## Goal
Redesign the whole language app around an Apple "Liquid Glass" aesthetic, token-first, on branch `glass-redesign` (off `main`). Design is 100% locked (do NOT re-open decisions). Phase 0 (foundation) and Phase 1 (Mandarin study flow) are complete & verified. Next milestone: **Phase 2 — Read-Thai**.

## Completed (this session)
- **Design: fully locked & validated** (3 HTML bake-offs + 2 working north-stars, Mandarin & Thai, light+dark). All decisions in the spec + memory below.
- **Phase 0 (committed `446cf39`):** `app/globals.css` token system (`[data-theme]` dark migration + no-JS fallback; radius/glass/spring/display tokens; Mandarin tone hues; restyled Thai class+tone palettes; `[data-lang]` accents); no-flash theme script + `ThemeToggle`; `motion` v12; `AmbientMesh`; glass primitives in `components/ui/`; `LangSync`; LXGW WenKai Kai hanzi subset (`app/fonts/lxgw-wenkai-subset.woff2`, `scripts/subset-hanzi-font.ts`). Verified green.
- **Phase 1 (COMPLETE, code-reviewed PASS-WITH-NITS, all findings fixed, UNCOMMITTED):**
  - `lib/mandarin/pinyin-tone.ts` + `tone-sandhi.ts` (+ `.test.ts`, 24 tests) — SPOKEN-tone sandhi derived from citation pinyin at render time, NO DB change.
  - New `components/top-bar.tsx` (floating glass, recedes in-session), `components/pinyin-syllables.tsx`.
  - Reskinned (Mandarin only): `card-front.tsx`, `card-back.tsx` (tone-coloured pinyin + tone-colour toggle), `word-chip.tsx` (per-word gloss-reveal + audio PRESERVED, context-sliced tone colour), `rating-buttons.tsx` (solid vivid + glass press), `review-session.tsx` (real 3D `motion` flip + reduced-motion instant-swap + `inert` hidden face), `mode-toggle.tsx` → glass segmented control (with pending affordance), `session-header.tsx`, `empty-state.tsx`, `audio-button.tsx`, `sign-out-button.tsx`, `app/page.tsx` (Mandarin branch only — Thai branch untouched).
  - `globals.css`: rating-ramp tokens + AA-retuned tone hues (all ≥4.5:1 both themes).
  - VERIFIED first-hand: `npm test` 24/24, `npm run build` exit 0, `npm run lint` exit 0. No DB/Thai/stats touches.

## Remaining tasks
1. **Commit Phase 1** (13 modified + new `lib/mandarin/`, `components/top-bar.tsx`, `components/pinyin-syllables.tsx`) — owner commits when he chooses.
2. **Phase 2 — Read-Thai:** reskin `components/thai/thai-home.tsx`, `unit-row.tsx`, `progress-ring.tsx` (glass unit map + saffron rings); `components/thai/drill/*` = **flat, retokened**; `components/thai/lessons/*` + `lib/thai/tone.ts` `TONE_STROKE` + `class-badge.tsx` + tone-confusion-matrix → **restyled glass-native class + 5-tone palettes** (values in the spec). Wire the Thai branch of `top-bar.tsx`/`app/page.tsx`.
3. Phase 3 (stats hero count-up + glass cards + rich milestone celebrations). Phase 4 (a11y audit, cross-device, Vercel preview cutover).

## Next steps (start here)
1. `cd "C:/Users/User/Software Projects/Language-Learning-App"` — confirm branch `glass-redesign`, `git status` (Phase 1 changes present, uncommitted).
2. Ask owner whether to commit Phase 1 now (he wanted to eyeball a Vercel preview first). If yes: `git add -A && git commit` (Phase 1 message; end with the required Co-Authored-By/Claude-Session trailers).
3. Begin Phase 2: read the spec's "Per-surface specs" (Read-Thai) + the Thai north-star mock as the visual target, then delegate to `implementer` (clean context), scoped Thai-only, preserving all drill mechanics. Code-review after.

## Key decisions + rationale
- All locked design decisions live in the spec + memory (below). Highlights: Liquid-Glass floating chrome over SOLID legible content; per-language quiet mesh; both light/dark + manual toggle; vivid per-language accents; Mandarin = Kai hanzi + tone-coloured pinyin (SANDHI-applied, citation mark kept + recoloured + dotted cue) + 3D flip; Thai = restyled glass-native colours + FLAT drills; stats hero + rich milestone-only celebrations; branch→preview→whole cutover.
- **★ Hard principle:** Mandarin and Thai are DIFFERENT systems — shared design language, each keeps a surface fitting its own pedagogy; reskin must PRESERVE existing mechanics (per-word gloss reveal + per-word audio + global pinyin toggle).

## Dead ends — do not retry
- **The Thai north-star mock's squished ก is a MOCK-ONLY system-font-fallback artifact, NOT a design/build issue.** The real app bundles Noto Sans Thai (web font). Do NOT debug glyph rendering in mocks again — it consumed huge context this session for zero product value.
- Tone-sandhi 一-before-neutral-tone (e.g. 一个) intentionally uses the textbook-simplified rule (documented in `tone-sandhi.ts`); leave as-is unless owner asks.

## Verification evidence
- `npm test` → exit 0, `24 passed, 0 failed` (incl. fallback regression tests).
- `npm run build` → exit 0 (compiles clean, expected routes).
- `npm run lint` → exit 0 (no output).
- `git rev-parse --short HEAD` → `446cf39`; `git branch --show-current` → `glass-redesign`; Phase 1 changes uncommitted.

## Read before starting
1. `C:\Users\User\.claude\plans\act-like-a-designer-toasty-yao.md` — authoritative design spec (every decision, per-surface specs, build order, critical files, verification, Thai palette hexes).
2. `C:\Users\User\Software Projects\Language-Learning-App\.claude\plans\glass-redesign-phase1.impl.md` — Phase 1 implementation detail.
3. `C:\Users\User\Software Projects\Language-Learning-App\.claude\plans\glass-redesign-phase1.review.md` — Phase 1 review (findings + fixes).
4. Project memory: `C:\Users\User\.claude\projects\C--Users-User-Software-Projects-Language-Learning-App\memory\glass-redesign-design-complete.md` (+ `mandarin-thai-distinct-card-design.md`, `vercel-prod-db-is-dev-db.md`).

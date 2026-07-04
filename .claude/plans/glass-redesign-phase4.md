# Glass Redesign — Phase 4 (Polish + cutover) report

Branch: `glass-redesign` · Audit surface: **localhost:3000** (owner's authenticated dev
server, real prod DB, read-mostly). Vercel preview was pushed but 500s (Preview env lacks
`AUTH_SECRET`; Auth.js `MissingSecret`) — owner chose localhost for audits (see handoff).

## Result: PASS — ready for cutover pending owner sign-off

### 1. AA contrast audit (both themes) — PASS
Independent WCAG relative-luminance computation over **live** token values (read from the
running app), plus a rendered-element cascade sweep on every screen.
- **44/44 documented token pairs pass AA** (22 light + 22 dark): rating ramp, 5 Mandarin
  tone hues, 5 Thai tone hues, 3 Thai class chips, `--heat-0..4` + inks, tone-neutral.
  Every live ratio matched the value documented in `globals.css` to the hundredth — no drift.
- **0 rendered-element failures** across Mandarin study, Mandarin stats, Thai home, Thai
  lesson, Thai drill, Thai stats — in BOTH themes. The Phase 3 heat-ink cascade locus
  (failure-heatmap / tone-confusion-matrix) measured clean (9 heat cells on Thai stats, all
  legible near-black/light ink on their heat tint).

### 2. Reduced-motion sweep — PASS
- CSS gates **all** animation behind `@media (prefers-reduced-motion: no-preference)` (2
  blocks) — reduced-motion users get the static state by construction, not via a fragile
  override.
- `useReducedMotion` used across every animated component (ambient mesh, all 6 charts,
  celebration, count-up, rating buttons, glass/segmented controls).
- Live: under forced reduced-motion, count-up heroes settle on final values (Kevin 81,
  Arisa 0) — no animate-from-0, no persistent SSR "0".

### 3. Cross-device + glyph legibility — PASS
- Desktop (1280) + mobile (390, DPR 3) captured. Hanzi (LXGW WenKai) and Thai glyphs
  (Noto Sans Thai, ~1.6× sized) are crisp and large at both sizes, both themes; complex
  Thai glyphs (ฎ/ฏ, combining vowels on ◌) render correctly.
- Charts render with data at mobile width (no Recharts ResponsiveContainer collapse).

### 4. Bundle — acceptable
- Hanzi subset `lxgw-wenkai-subset.woff2` = **36.9 KB** (next/font/local). Noto Thai + Geist
  via next/font/google (auto-subset, self-hosted). `motion` v12 = intended animation
  foundation, tree-shakes. Production build passes (exit 0) across all phases + Phase-4 work.

### Non-issues investigated and cleared
- Desktop Mandarin `/stats` shows **two** "CARDS SEEN" hero cards — this is the deliberate
  **two-learner layout** (Kevin 81 / Arisa Chaiyapalakul 0, the 2nd `ALLOWED_EMAILS`
  learner with 0 Mandarin activity → legit "0" + "No reviews yet" empty states). Not a bug.
- Earlier flat-looking reviews chart at 901px was a one-off render-timing artifact; charts
  populate at 390px and 1280px.
- Segmented theme toggle showing the "wrong" active pill in some screenshots was a
  test-method artifact (I flipped `data-theme` directly, bypassing the toggle's React state);
  real click-driven toggling stays in sync.

## Added this phase (owner-requested, committed 49a3710)
Email-gated QA unlock: `k3v1n@arisadesiam.com` gets all built Read-Thai units unlocked
(bypasses the 90%-mastery gate) at the single `getUnitSummaries` chokepoint. Scoped to
exactly one email; mastery numbers untouched. Reviewed PASS, live-verified (all 14 units
unlock; previously-locked Unit 7 drill renders). Docs:
`glass-redesign-phase4-qa-unlock.{impl,review}.md`. Ships with the cutover per owner choice.

## Evidence
Screenshot gallery: `.artifacts/phase4-audit/` (01–13, gitignored).

## Remaining
- **Owner sign-off** on the gallery, then the single **cutover merge `glass-redesign` → `main`**
  (owner confirms; never merge to main without explicit go). Note: cutover now carries
  Phases 0–3 + the QA-unlock commit.

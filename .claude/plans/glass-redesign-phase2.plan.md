# Glass redesign — Phase 2 (Read-Thai) — implementation brief

Branch `glass-redesign`. Phase 0 (foundation) + Phase 1 (Mandarin) are committed (`1cdf332`).
This phase reskins the **Read-Thai** product to the locked Liquid-Glass system.
**Thai-only. No DB / schema / Mandarin / lib-query / stats-logic changes.** Pure frontend retoken + wiring.

Authoritative design: `C:\Users\User\.claude\plans\act-like-a-designer-toasty-yao.md`
(read "Per-surface specs → Read-Thai", "Accessibility", "Locked design decisions → Thai rows").
North-star visual target: bake-off artifact #Read-Thai (unit map + flat drill, glass-native class/tone systems).

## Hard constraints (do not violate)
1. **Preserve every existing learning mechanic.** The reskin restyles surfaces; it NEVER removes or
   alters an interaction or its logic:
   - Drill MC option grid; **tone-assembly** multi-step widget; **phrase-split** tap-boundary widget.
   - `word-ipa` drill: gloss + audio stay hidden until after the learner answers (anti-peek). Keep.
   - Per-question audio hints ("Hear it" / "Play clip"), reveal→next flow, summary tiles, unlock banner.
   - The server re-derives the expected answer (`submitThaiAttempt(itemId, drillType, value)`) — do not
     change any call signature, action, query, or `lib/thai/*` logic.
2. **No changes to `lib/thai/*.ts` logic or `seed/thai/*`.** `lib/thai/tone.ts` holds DATA
   (TONE_ORDER/LABELS/GRID/CONTOUR_POINTS) — leave it. (The spec's mention of a `TONE_STROKE` in
   `lib/thai/tone.ts` is stale: the real `TONE_STROKE` map is hardcoded in `tone-sparkline.tsx`.)
3. **"Flat" ≠ invisible (a11y).** In dark mode every retokened surface must keep real value separation:
   lighter surface + specular top edge + visible border. Never let a card melt into the mesh.
4. **Always set an explicit `color` on `<button>`s** — UA default black is invisible on dark. The drill
   option buttons currently rely on inherited color in their default state; add an explicit
   `text-foreground`.
5. **WCAG AA is a deliverable, not an afterthought** — see "AA audit" below. Same rigor & documentation
   as Phase 1 (extend the table in `globals.css`).

## Token wiring (globals.css) — do FIRST
Phase 0 already defined, in both light `:root` and `:root[data-theme="dark"]`:
`--thai-class-{mid,high,low}` and `--thai-tone-{mid,low,falling,high,rising}`.
They are NOT yet exposed as Tailwind utilities.

- In the `@theme inline` block, wire the ones you'll consume as text/bg utilities, e.g.
  `--color-thai-class-mid: var(--thai-class-mid);` … and the five `--color-thai-tone-*`.
  This yields `text-thai-tone-falling`, `bg-thai-class-mid`, `border-thai-tone-high`, etc.
- For SVG `stroke`/`fill` (sparkline, matrix) consume the raw var directly:
  `stroke="var(--thai-tone-falling)"` — no @theme entry needed for those.

## AA audit (must pass BOTH themes, document computed ratios in the globals.css table)
Small text (badge labels ~10px bold, tone labels ~12px) needs **4.5:1**. Graphical strokes
(sparkline polylines, matrix cell borders) need **3:1**.

Starting observations (I computed these — verify with your own script, don't trust blindly):
- Light-mode class hexes as small text on white FAIL 4.5:1: teal `#0d9488` ≈ 3.75:1,
  amber `#d97706` ≈ 3.2:1 (violet `#7c3aed` ≈ 6.5:1 passes). So a "saturated text on faint tint"
  badge does NOT pass in light with the raw hexes.
- **ClassBadge treatment (keep it a filled chip, like today):** background = the class hue,
  text = near-black `--color-on-earthy` OR white — whichever clears 4.5:1 for that hue+theme.
  You will likely need to LIGHTEN the light-mode chip backgrounds (pastel) so near-black text passes,
  and can keep the bright dark-mode north-star values (`#2dd4bf/#fbbf24/#a78bfa`) with near-black text
  (that already passes — it's how the badge works today). Tune the `--thai-class-*` hexes as needed and
  document every pairing (both themes) in the AA table. Same hue family; small shifts only.
- Tone hues used as TEXT (tone labels, matrix headers) must clear 4.5:1 in both themes; as STROKE 3:1.
  Verify the Phase-0 `--thai-tone-*` values and nudge any that miss, documenting results.

Model the AA table exactly on the "Phase 1" block already in `globals.css` (add a "Phase 2 — Read-Thai"
block). If you tune any hex, update BOTH the `:root` and `:root[data-theme="dark"]` token value.

## Per-surface work

### Home / unit map
- `components/thai/thai-home.tsx`: **replace the inline header** (the ModeToggle/ThemeToggle/Stats/
  SignOut row) with the floating glass **`<TopBar activeMode="thai" learnerName={learnerName}
  statsHref="/thai/stats" />`** (TopBar already renders the Thai `สวัสดี` greeting). Drop the opaque
  `bg-background` from the `<main>` so the global ambient mesh shows through (match Mandarin `page.tsx`,
  whose main has no bg). Give "Read Thai" the display treatment (`text-display` or a large tightly-
  tracked heading) consistent with the system. Keep `max-w-2xl`, 8pt spacing rhythm.
- `components/thai/unit-row.tsx`: glass unit-map rows. Use the `.glass` chrome recipe (or a solid
  elevated `bg-surface` card with concentric radius + specular edge) — pick the one matching the
  north-star; rows are the "unit map" so glass is sanctioned. Concentric capsule radius
  (`rounded-[var(--r-lg)]`). Locked/coming-soon states keep their affordances. The **Drill CTA** uses
  the Thai accent (`bg-accent` = saffron via `[data-lang="thai"]`) with AA-correct text; the **Lesson**
  link stays a quiet glass/ghost button. Preserve links, `lessonOnly`, `unlocked`, Repractice logic.
- `components/thai/progress-ring.tsx`: swap the active stroke from `var(--color-brand)` to
  `var(--accent)` (saffron in Thai context). Keep size/geometry/percent text.

### Drills (FLAT retoken — least change to the engine)
- `components/thai/drill/drill-session.tsx`, `phrase-split-question.tsx`, `tone-assembly-question.tsx`:
  retoken `border-border-base bg-surface`, the option buttons, prompt box, summary tiles, unlock banner
  to the glass-native palette. Keep the FLAT structure (no glass chrome behind reading content — drills
  stay solid/legible). Concentric radius. **Add explicit `text-foreground` to the default-state option
  buttons** (a11y #4). Correct/incorrect reveal colors: keep semantic (success/clay) but ensure AA in
  both themes. Summary "Unit N unlocked" banner may keep `bg-highlight` (AA-verify) or move to accent.
- **Thai glyph sizing (a11y):** where large Thai script is shown as prominent ink (drill prompt at
  `text-5xl`, tone-mark cards, decode glyphs), bump ~1.6× so consonants don't look squat (a Thai
  consonant fills only ~50% of its font-size). Apply judiciously to the prominent-ink glyphs, not body.
- Preserve EVERY branch: `isPhraseSplit`, `tone-assembly` step flow, `hideAudioUntilRevealed`,
  `optionFont` per drillType, pending/transition states.

### Lessons + tone/class systems
- `components/thai/lessons/class-badge.tsx`: consume the tuned `--thai-class-*` (see AA audit).
- `components/thai/lessons/tone-sparkline.tsx`: replace the hardcoded `TONE_STROKE` hex map with the
  `--thai-tone-*` tokens (`stroke={\`var(--thai-tone-${tone})\`}` or a small map to the var strings).
- Retoken all lesson surfaces to the system (borders/surfaces/radius/spacing), consuming the new
  palette wherever class/tone color appears: `tone-rules-lesson.tsx`, `consonant-table.tsx`,
  `vowel-table.tsx`, `finals-table.tsx`, `tone-ear-lesson.tsx`, `syllable-decode-lesson.tsx`,
  `unit1-lesson.tsx`, `numerals-lesson.tsx`, `special-signs-lesson.tsx`, `spaceless-reading-lesson.tsx`,
  `tone-assembly` etc. Keep ALL content verbatim (it's transcribed from the research doc) — restyle only.
- `components/thai/audio-play-button.tsx`: retoken to a glass/accent button; keep behavior.
- `components/thai/stats/tone-confusion-matrix.tsx`: retoken its tone colors to `--thai-tone-*`
  (the palette-consumer part is Phase-2 scope; the stats HERO/count-up/glass-card treatment is Phase 3
  — do NOT build the hero here, just make the matrix consume the new tone hues + AA-verify).
  Other `components/thai/stats/*` charts: leave for Phase 3 UNLESS they directly hardcode the old tone
  hexes — if so, point them at the tokens too (minimal), else leave.

### Route `<main>` wrappers (let the mesh through)
These Thai route files set opaque `bg-background` on `<main>`, occluding the global mesh. Remove
`bg-background` from the `<main>` (body already paints the base bg; content cards stay solid):
- `app/thai/[unit]/lesson/page.tsx`, `app/thai/[unit]/drill/page.tsx`, `app/thai/stats/page.tsx`.
  (`app/page.tsx`'s Thai branch renders `<ThaiHome>` which owns its own `<main>` — handled above.)
  Do NOT touch `app/stats/page.tsx` (Mandarin stats — Phase 3).

## Out of scope (Phase 3 / later)
Stats hero count-up + glass metric cards + Recharts restyle; milestone celebrations; Mandarin stats.
Only the tone-confusion-matrix's *palette consumption* is pulled forward (above).

## Verification (run and paste verbatim into the impl summary)
- `npm test` (Mandarin sandhi suite must stay 24/24 — you touched no Mandarin/lib code).
- `npm run build` (exit 0).
- `npm run lint` (exit 0).
- Grep-confirm no remaining `bg-sage|bg-peach|bg-sand` in `components/thai`, no hardcoded tone hex in
  `tone-sparkline.tsx`, and that `lib/thai/*` + `seed/thai/*` are untouched (`git diff --stat`).
- Report the AA table you computed (both themes) for class chips + tone hues.

## Handoff
Write `.claude/plans/glass-redesign-phase2.impl.md` (completed work, left undone, commands+exit codes,
issues, spec deviations, procedure compliance) per the required implementer-summary contract.

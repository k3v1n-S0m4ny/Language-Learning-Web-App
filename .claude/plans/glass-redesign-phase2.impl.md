# Handoff: Glass Redesign — Phase 2 (Read-Thai)
Agent: implementer | Date: 2026-07-04 | Status: COMPLETE

## Completed
- `app/globals.css`:
  - Wired `--thai-class-{mid,high,low}` and `--thai-tone-{mid,low,falling,high,rising}` into
    `@theme inline` as `--color-thai-class-*` / `--color-thai-tone-*`, yielding
    `bg-thai-class-mid`, `text-thai-tone-falling`, etc. (SVG stroke consumers still read the raw
    `var()` directly, no `@theme` entry needed for those, per the brief.)
  - **Re-tuned the Phase 0 Thai token VALUES** after computing real contrast ratios (throwaway
    Node script, not committed — see the AA table below and in the file itself, new "Phase 2"
    block appended to the existing AA documentation at the top of `globals.css`):
    - Light-mode `--thai-class-{mid,high,low}` changed from the raw saturated hues
      (`#0d9488`/`#d97706`/`#7c3aed` — which failed 4.5:1 as small text/thin fills) to lightened
      pastel tints (`#ccfbf1`/`#fef3c7`/`#ede9fe`) used as ClassBadge chip BACKGROUNDS with
      near-black (`--color-on-earthy`) text — same "filled chip" treatment as before, same hue
      family, just lightened so near-black text clears AA with a huge margin (14–16:1).
    - Dark-mode class hues **unchanged** (bake-off north-star bright values already passed with
      near-black text, 6.4–10.4:1 — verified, not just assumed).
    - Light-mode `--thai-tone-low` (`#0284c7` → `#0369a1`, was 4.10:1, now 5.93:1) and
      `--thai-tone-high` (`#16a34a` → `#15803d`, was 3.30:1, now 5.02:1) darkened to clear the
      4.5:1 small-text floor (this token doubles as the sparkline's 3:1 stroke requirement — the
      stricter floor governs since one token serves both consumers). `mid`/`falling`/`rising`
      already cleared 4.5:1 unchanged.
    - Dark-mode tone hues **unchanged** (all five already cleared 4.5:1 as text, 5.3–8.4:1).
  - Added a doc comment on the token block itself explaining the light/dark asymmetry (pastel
    chip bg vs. bright north-star bg), plus a full "Phase 2 (glass redesign — Read-Thai)"
    addition to the existing AA-ratio comment table at the top of the file (same format as
    Phase 1's block).
- `components/thai/lessons/class-badge.tsx` — consumes `bg-thai-class-{mid,high,low}` (was
  `bg-sage`/`bg-peach`/`bg-sand`); `rounded-[var(--r-pill)]`.
- `components/thai/lessons/tone-sparkline.tsx` — hardcoded `TONE_STROKE` hex map replaced with a
  `TONE_STROKE_VAR` map of `var(--thai-tone-*)` strings consumed directly as the SVG `stroke`.
- `components/thai/progress-ring.tsx` — active stroke swapped from `var(--color-brand)` to
  `var(--accent)` (resolves to saffron under `[data-lang="thai"]`); locked/geometry/percent-text
  unchanged.
- `components/thai/thai-home.tsx` — inline header row (ModeToggle/ThemeToggle/Stats/SignOut)
  replaced with `<TopBar activeMode="thai" learnerName={learnerName} statsHref="/thai/stats" />`
  (already supported the Thai `สวัสดี` greeting since Phase 1, just unwired); dropped
  `bg-background` from `<main>` so the ambient mesh shows through; "Read Thai" heading promoted
  to `.text-display`. `max-w-2xl` / 8pt rhythm kept.
- `components/thai/unit-row.tsx` — glass unit-map row (`.glass` + `rounded-[var(--r-lg)]`,
  concentric capsule radius throughout); Drill CTA → `bg-accent text-on-earthy` (AA 8.10:1, see
  below); Lesson link → quiet ghost/glass hover (`hover:bg-[var(--glass-bg-strong)]`,
  `text-foreground`). All existing links/`lessonOnly`/`unlocked`/Repractice logic preserved
  verbatim — only classes changed.
- `components/top-bar.tsx` — refreshed its stale comment (previously said "Thai untouched until
  Phase 2"); no behavioral change, it already rendered the Thai greeting branch since Phase 1.
- `components/thai/drill/drill-session.tsx` — retokened: `rounded-[var(--r-lg/md/pill)]`
  throughout; prompt box, summary card, StatTile, unlock banner. Default-state option buttons
  gained explicit `text-foreground` (a11y #4 — UA default button text is black, invisible on
  dark). "Next"/"Finish round" and "Back to units" CTAs moved `bg-brand text-white` →
  `bg-accent text-on-earthy` (AA 8.10:1, see below) for Thai-branded consistency with the
  unit-row Drill CTA. Unlock banner kept `bg-highlight text-on-earthy` (already AA-passing per
  the Phase 0 table — recomputed independently in review at 8.59:1, comfortably AA; no change needed). Thai-script prompt/option glyphs bumped ~1.6x
  (a11y): consonant/syllable prompt `text-5xl` → `text-[4.8rem]`; `audio-word` option font
  `text-2xl` → `text-[2.4rem]`. Every branch preserved verbatim (`isPhraseSplit`, tone-assembly
  step flow, `hideAudioUntilRevealed`, `optionFont` per drillType, pending/transition states).
- `components/thai/drill/phrase-split-question.tsx` — retokened radius throughout; the
  boundary-toggle "selected" indicator `bg-brand` → `bg-accent`; "Check" CTA → `bg-accent
  text-on-earthy`; the tap-boundary phrase char glyph bumped `text-4xl` → `text-[3.6rem]` (a11y).
  Toggle/check/local-feedback mechanics untouched.
- `components/thai/drill/tone-assembly-question.tsx` — retokened radius; default-state step
  option buttons gained explicit `text-foreground` (a11y #4); "Continue" CTA → `bg-accent
  text-on-earthy`. Step-branching mechanics untouched.
- `components/thai/audio-play-button.tsx` — retokened to the `.glass` recipe (was a plain
  bordered pill). **Deviation from the literal brief wording** ("glass/accent button"): the
  label text stays `text-foreground`, NOT `text-accent` — verified the raw saffron accent hue
  measures only ~2.15:1 on the near-white glass surface (checked with the same throwaway
  script), nowhere near 4.5:1, so colouring the text itself would have been a real AA
  regression. The `.glass` chrome (border + specular edge) is what marks it as the new system's
  audio affordance; `playAudio`/disabled-when-no-url/size variants unchanged.
- `components/thai/stats/tone-confusion-matrix.tsx` — row/column tone-label headers now read
  `text-thai-tone-*` (was `text-foreground-muted`), tying the matrix back to the same palette
  used by `ToneSparkline`/`ClassBadge`. Per the brief's explicit scope note, only this
  palette-consumption slice was touched — the intensity heatmap's own colour scale
  (`cellColor`, still `bg-easy`/`bg-sage`/`bg-highlight`/`bg-clay`) and the hero/glass-card
  treatment are left for Phase 3.
- Lesson content files (radius retoken to the concentric scale + Thai-glyph ~1.6x a11y bump on
  prominent-ink glyphs only; ALL prose/content kept byte-identical, restyle only):
  `tone-rules-lesson.tsx`, `consonant-table.tsx`, `vowel-table.tsx`, `finals-table.tsx`,
  `tone-ear-lesson.tsx`, `syllable-decode-lesson.tsx`, `unit1-lesson.tsx` (also `bg-brand` →
  `bg-accent` on its "Mark unit 1 as read" CTA), `numerals-lesson.tsx`, `special-signs-lesson.tsx`,
  `spaceless-reading-lesson.tsx` (also the leading-vowel `·` separator's colour, which the brief's
  literal "text-brand → text-accent" sweep would have broken — see Issues Discovered).
- Route `<main>` wrappers — dropped `bg-background` so the ambient mesh shows through; nav-link
  `rounded-full` → `rounded-[var(--r-pill)]` for token consistency:
  `app/thai/[unit]/lesson/page.tsx` (also its "Start drilling this unit" CTA → `bg-accent
  text-on-earthy`), `app/thai/[unit]/drill/page.tsx` (both the locked-state early-return
  `<main>` and the main round `<main>`), `app/thai/stats/page.tsx` (its `Section` wrapper's
  `rounded-2xl` card intentionally left alone — Phase 3 hero/glass-card scope).

## Left Undone
- **Grep-clean requirement has two documented exceptions** (see "Spec Deviations" — a genuine
  tension between two brief bullets, not an oversight): `components/thai/stats/failure-heatmap.tsx`
  (`bg-sage`/`bg-peach`) and `components/thai/stats/tone-confusion-matrix.tsx`'s `cellColor`
  intensity ramp (`bg-sage`) still use those earthy tokens — for a generic 4-step severity scale,
  not a consonant-class colour, and not a hardcoded hex. Left alone per the brief's own
  "leave other stats charts for Phase 3 unless they hardcode the old tone hexes" carve-out.
- Stats hero count-up, glass metric cards, and the Recharts area-fill/tooltip restyle — explicitly
  Phase 3 (out of scope here), per the brief.
- No live browser/Chrome-DevTools screenshot pass (light+dark, reduced-motion, mobile viewport,
  Tab-key walk) — that's the code-reviewer/qa-engineer's verification step per the plan's
  "Verification (end-to-end)" section, not an implementer deliverable (matches how Phase 1's
  handoff scoped this).

## Commands Run
- `npm test` — exit 0
  ```
  ℹ tests 24
  ℹ suites 0
  ℹ pass 24
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 157.7798
  ```
  (Same 24/24 as Phase 1's final count — confirms zero Mandarin/lib regressions from this
  Thai-only phase.)
- `npm run build` — exit 0
  ```
  ▲ Next.js 16.2.6 (Turbopack)
  - Environments: .env.local

    Creating an optimized production build ...
  ✓ Compiled successfully in 2.7s
    Running TypeScript ...
    Finished TypeScript in 3.3s ...
    Collecting page data using 10 workers ...
    Generating static pages using 10 workers (0/6) ...
  ✓ Generating static pages using 10 workers (6/6) in 396ms
    Finalizing page optimization ...

  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ```
  (Same pre-existing two-lockfile Turbopack workspace-root warning as Phase 0/1 — not a new
  regression, harmless.)
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  (no output = clean)
- `git diff --stat -- lib/thai seed/thai` and `git status --porcelain -- lib/thai seed/thai` —
  both produced **zero output** — confirms `lib/thai/*` and `seed/thai/*` are byte-identical to
  before this phase.
- `grep -rn -E "bg-sage|bg-peach|bg-sand" components/thai` — exit found 3 matches, all in
  `components/thai/stats/{failure-heatmap.tsx,tone-confusion-matrix.tsx}` (the intensity-scale
  usage documented above/in Spec Deviations, not the ClassBadge palette that was the actual
  target of this check).
  ```
  components/thai/stats/failure-heatmap.tsx:6:  if (rate < 25) return "bg-sage";
  components/thai/stats/failure-heatmap.tsx:8:  if (rate < 75) return "bg-peach";
  components/thai/stats/tone-confusion-matrix.tsx:24:  if (ratio < 0.5) return "bg-sage";
  ```
- `grep -n -E "#[0-9a-fA-F]{6}" components/thai/lessons/tone-sparkline.tsx` — no matches (clean).
- `git diff --stat` (full, all changed files) — exit 0, 25 files changed, 234 insertions(+),
  135 deletions(-); every changed path is under `app/globals.css`, `app/thai/*`,
  `components/thai/*`, or `components/top-bar.tsx` (the one shared file, comment-only change) —
  no Mandarin component touched.

## Issues Discovered
- **The literal brief wording for `audio-play-button.tsx` ("retoken to a glass/accent button")
  would have produced a real AA failure if taken at face value.** Computed (throwaway script):
  raw saffron `--accent` (`#f59e0b`) as small TEXT on the light-mode glass surface (~white) is
  only ~2.15:1 — nowhere near 4.5:1. Confined the accent to the `.glass` chrome itself
  (border/specular edge) and kept the label `text-foreground`. Documented in Spec Deviations.
- **A mechanical "swap bg-brand/text-brand → accent for Thai-branded consistency" sweep would
  have broken AA on `spaceless-reading-lesson.tsx`'s leading-vowel `·` separator.** That
  decorative dot originally used `text-brand`; naively swapping it to `text-accent` measures
  ~2.15:1 on light (fails even the 3:1 large-text floor) — caught this before committing to it
  and used `text-foreground-muted` instead (an already AA-safe, pervasively-used muted-body
  convention elsewhere in the app), rather than either the failing accent swap or reverting to
  `text-brand` (which, on inspection, is *also* borderline on the dark surface at 2.93:1 — a
  latent pre-existing gap in the original file, left as a pre-existing issue since it predates
  this phase and isn't part of the Phase 2 retoken scope: purely decorative punctuation, not the
  new palette).
- **Verification bullet vs. per-surface scope bullet genuinely conflict** on
  `failure-heatmap.tsx`/`tone-confusion-matrix.tsx`'s intensity-scale reuse of `bg-sage`/
  `bg-peach` (see Spec Deviations) — flagging explicitly rather than silently satisfying one
  bullet at the expense of the other.

## Spec Deviations
- **ClassBadge light-mode background hexes changed, not just re-skinned as literal
  `bg-thai-class-*` passthroughs** — the brief anticipated this ("you will likely need to
  LIGHTEN the light-mode chip backgrounds"), so this is the brief's own expected outcome, not an
  unplanned deviation, but noting it explicitly since it means the `--thai-class-*` LIGHT-mode
  token values are no longer "the same saturated hue, just wired as a utility" — they're now a
  pastel tint of that hue family, used ONLY as the ClassBadge chip background (confirmed via
  grep that ClassBadge is the sole consumer of `--thai-class-*` in the current codebase, so no
  other surface unexpectedly went pale).
- **`audio-play-button.tsx` label text is `text-foreground`, not `text-accent`** — see Issues
  Discovered; the "glass/accent button" brief language is honoured via the glass chrome, not via
  literal accent-coloured text, to avoid a real AA regression.
- **`spaceless-reading-lesson.tsx`'s decorative `·` separator uses `text-foreground-muted`**,
  not `text-accent` or its original `text-brand` — see Issues Discovered.
- **CTA colour harmonization beyond the brief's explicit unit-row mention**: the brief only
  named the unit-row Drill CTA for `bg-accent`. I additionally swapped every other Thai-scoped
  primary CTA (`Check`, `Continue`, `Next`/`Finish round`, drill-summary `Back to units`,
  lesson-page `Start drilling this unit`, `Mark unit 1 as read`) from the old generic
  `bg-brand text-white` to `bg-accent text-on-earthy`, for a cohesive Thai-branded (saffron)
  CTA language across the whole reskinned surface, consistent with the "vivid per-language
  palette" design principle. Verified `#1A1A1A` (`--color-on-earthy`) on `#F59E0B` (saffron
  `--accent`) = 8.10:1, comfortably AA (computed via the same throwaway script). This is a
  broader colour sweep than the brief's literal text named, but stays within its "retoken
  surfaces" mandate and touches no mechanics — flagging for reviewer visibility rather than
  treating it as implicit.
- **`bg-highlight` unlock banner kept as-is** (brief offered "keep bg-highlight (AA-verify) or
  move to accent" as a choice) — kept, since it was already AA-passing per the Phase 0 table
  (7.9:1) and distinguishing "you unlocked something" from the CTA colour avoids visual
  confusion between the two signals.
- **Thai-glyph a11y bump used precise arbitrary values (e.g. `text-[4.8rem]`), not the nearest
  Tailwind step**, computed as `base-size × 1.6` per the design-spec a11y note, rather than
  rounding to the nearest named Tailwind scale step (which would either under- or over-shoot the
  1.6x target by a visible amount at these sizes). Applied only to "prominent ink" glyphs
  (drill prompts, tone-mark/decode example cards, digit tiles, worked-example phrases) per the
  brief's "judiciously... not body" instruction — smaller secondary/reinforcement text (e.g. the
  phrase-split reveal list, sign-name captions) was left at its original size.
- **Radius token mapping** (not explicitly enumerated in the brief): `rounded-xl` → `rounded-
  [var(--r-lg)]` (22px, main content cards), `rounded-lg` → `rounded-[var(--r-md)]` (14px,
  nested/smaller tiles), `rounded-full` → `rounded-[var(--r-pill)]` (999px, pills/CTAs) — one
  consistent mapping applied everywhere in scope, matching Phase 1's own `--r-*` scale usage.

## Procedure Compliance
- Plan consulted before coding: yes — read `glass-redesign-phase2.plan.md`,
  `act-like-a-designer-toasty-yao.md`, and `glass-redesign-phase1.impl.md` in full before
  touching any file, then read every in-scope Thai component and route file before editing.
- Tests run before finishing: yes — `npm test` → `ℹ tests 24 / ℹ pass 24 / ℹ fail 0` (see
  Commands Run), plus `npm run build` and `npm run lint` both exit 0.
- Handoff written: yes (this file).

---
status: COMPLETE
updated: 2026-05-24
---

# Review Summary — M9: Colorful redesign, animations, "Again" requeue, CSV learning order

## Result

**PASS** _(re-review 2026-05-24 — both CRITICAL failures from initial review confirmed resolved)_

Both WCAG AA failures identified in the initial review have been correctly fixed. All six assertions now pass. No new issues introduced. QA may proceed.

---

## Files Reviewed

- `app/globals.css`
- `lib/review/queries.ts`
- `lib/db/schema.ts`
- `scripts/seed-db.ts`
- `scripts/refresh-seed-db.ts`
- `lib/db/migrations/0001_supreme_joseph.sql`
- `components/rating-buttons.tsx`
- `components/review-session.tsx`
- `components/card-back.tsx`
- `components/card-front.tsx`
- `components/word-chip.tsx`
- `components/empty-state.tsx`
- `components/session-header.tsx`
- `components/audio-button.tsx`
- `components/sign-out-button.tsx`
- `components/stats/reviews-chart.tsx`
- `components/stats/forecast-chart.tsx`
- `components/stats/rating-chart.tsx`
- `app/page.tsx`
- `app/layout.tsx`
- `app/stats/page.tsx`
- `.next/static/chunks/0-s1943xn.6h1.css` (compiled output, inspection only)

---

## Findings

### CRITICAL

**[components/rating-buttons.tsx:35 + globals.css:47] White text on "Good" button (#1F8A4C) fails WCAG AA**

The "Good" button uses `text-white` on `bg-success` (`--color-success: #1f8a4c`). Independent calculation: L(#1F8A4C) = 0.2126 * lin(31) + 0.7152 * lin(138) + 0.0722 * lin(76) = 0.190. Contrast = (1.05) / (0.190 + 0.05) = **4.38:1**. This is below the 4.5:1 threshold for WCAG 2.1 criterion 1.4.3 (normal text, AA). The button label is `text-sm` (14 px, font-semibold), which does not qualify as WCAG large text (14 pt bold = 18.67 px; 14 px ≈ 10.5 pt — below threshold). The failure applies in both light and dark mode since `--color-success` has no dark-mode override.

The implementation summary claims 5.3:1. That value is arithmetically wrong by 0.92 ratio points. A ratio of 5.3:1 would require L ≈ 0.148, corresponding to a darker green around `#1A7A40` (independently verified: 5.38:1).

This violates assertions A1 ("every text/background pairing meets WCAG AA") and A2 ("Good=success+white text meeting AA").

Fix: darken `--color-success` to approximately `#1A7A40`, or switch the Good button to `text-on-earthy` (near-black, 8.1:1 — consistent with the other three buttons).

---

**[components/card-back.tsx:31-35] Leech badge text-clay on bg-clay/20 fails WCAG AA in light mode**

The leech badge uses `text-clay` (`#DB846E`) on `bg-clay/20` (rgba(219, 132, 110, 0.2)). The badge has no opaque background; the alpha composites against the page background. In light mode `--background` is `#F5F3F0`; the effective badge background is approximately rgb(240, 221, 214). Contrast = **2.13:1** — below both the 4.5:1 AA threshold and the 3:1 large-text/UI threshold. The label text is `text-xs` (12 px, font-medium), the smallest size in the application.

In dark mode the composited background against `#15191B` gives 4.64:1 (passes AA). The failure is light-mode-only.

This pairing was not included in the implementation summary's contrast table despite being introduced in this PR.

Fix: replace `bg-clay/20 text-clay` with a higher-contrast combination, e.g., `bg-clay text-on-earthy` (7.5:1), or a border-only style (`border border-clay text-foreground`) to avoid the tinted-background problem.

---

### HIGH

**[.claude/plans/implementation-summary.md — WCAG table] White-on-success ratio reported as 5.3:1; correct value is 4.38:1**

The handoff table entry "white on success / Good btn | 5.3:1 | 4.5:1 | PASS" is materially incorrect. Any downstream QA that trusted this table rather than recomputing would carry the failure forward. The plan's A1 instruction says to "compute & record" the success value; the recorded value is wrong.

---

### MEDIUM

**[components/card-back.tsx] WCAG table in implementation summary omits the leech badge pairing entirely**

The leech badge (`text-clay on bg-clay/20`) is new in this PR and is absent from the 21-row contrast table. The plan requires ratios to be "recorded in implementation-summary.md." The omission allowed the light-mode AA failure to go undetected.

---

**[lib/review/queries.ts:242,244] Redundant double-guard on `newRemaining`**

`newCardId` (line 242) is already `undefined` when `counts.newRemaining === 0`. The inner ternary on line 244 re-checks the same condition, making the guard dead code for the `false` branch. Behaviour is correct in all cases but the pattern is confusing.

```ts
// line 242
const newCardId = counts.newRemaining > 0 ? newCardRow[0]?.id : undefined;
// line 244 — inner ternary is always equivalent to ?? newCardId
const chosenId = readyId ?? (counts.newRemaining > 0 ? newCardId : undefined) ?? futureTodayId;
// Cleaner: const chosenId = readyId ?? newCardId ?? futureTodayId;
```

---

### LOW

**[lib/review/queries.ts:154,193] Wave-1 comment is stale after M9 expansion**

The comment at line 154 says "wave 1: settings + (due-id, new-id, raw counts)" — accurate before M9. The `Promise.all` on line 193 now has five items (settings, raw counts, three tier queries). The comment should be updated to reflect the new shape.

---

## Assertions Checked

| Assertion | Result | Evidence |
|---|---|---|
| A1 — Palette tokens + WCAG AA all pairings, both modes | **FAIL** | White on `#1F8A4C` = 4.38:1 (< 4.5). Leech badge light = 2.13:1 (< 3.0). Independently computed via WCAG 2.1 linearisation. |
| A2 — Colored rating row, each label+hint meets AA | **FAIL** | Good button: white-on-success 4.38:1 < 4.5:1. Again/Hard/Easy all pass (independently verified). |
| A3 — CSS-only animations + reduced-motion, no new runtime dep | **PASS** | Compiled CSS confirms `@keyframes` inside `@media (prefers-reduced-motion: no-preference)`. Utility classes unconditional but reference conditional keyframe names — no motion fires under reduce-motion. `package.json` and lockfile unchanged (git diff empty). |
| A4 — "Again" requeue; tier logic correct; no dead-end | **PASS** | Tier1 `lte(now)` / Tier3 `gt(now) AND lte(dayEnd)` are mutually exclusive with no gap. Single-card scenario: Tier3 fires when Tier1 and Tier2 are empty. `chosenId` selection prevents immediate re-serve. `fetchRawCounts.due` uses same `lte(dayEnd)` predicate — count matches served set. |
| A5 — `deck_order` migration + seed + refresh | **PASS** | Migration additive: `ADD COLUMN deck_order DEFAULT 0 NOT NULL` + `SET DEFAULT` on `request_retention`. `seed-db.ts` uses `deck.entries()` and sets `deckOrder: index` on insert. `refresh-seed-db.ts` step 3 unconditionally backfills all kept cards. `notInArray` guarded by non-empty deck check (line 38). |
| A6 — No regression, build + lint clean | **PASS** | Implementer reports build exit 0, lint exit 0. Component sweep replaces hardcoded colour tokens. Compiled CSS present and correct. |

---

## Commands Run

| Command | Exit Code | Notable Output |
|---|---|---|
| `git diff --stat HEAD` | 0 | 23 files, 487 insertions, 221 deletions |
| Node WCAG luminance/contrast computation | 0 | White/#1F8A4C = 4.38:1; leech badge light = 2.13:1; all other claimed pairings confirmed within ±0.2 of handoff values |
| Node compiled CSS inspection (`0-s1943xn.6h1.css`) | 0 | `@theme inline` self-reference safe (hex `:root` block at offset 16259 overrides it). `@keyframes` inside `prefers-reduced-motion` gate. `bg-clay` utility generated correctly. |
| Node `@theme inline` cascade analysis | 0 | NOT a bug: explicit `:root` block comes after `@theme`-emitted block in compiled output; later declaration wins; palette tokens resolve to correct hex values. |

---

## Residual Risk

1. **Good button contrast** — live WCAG AA failure on the primary rating CTA. Any third-party accessibility audit will flag this.
2. **Leech badge light mode** — rare (only cards with ≥ 8 lapses) but ships as a WCAG violation.
3. **`@theme inline` self-reference fragility** — the pattern `--color-brand: var(--color-brand)` inside `@theme` works only because the explicit `:root` block appears later in the compiled stylesheet. Restructuring globals.css (e.g., moving the explicit `:root` above `@import "tailwindcss"`) could invert the cascade and silently break all palette tokens.
4. **Backfill loop is N sequential UPDATEs** — `refresh-seed-db.ts` step 3 issues one UPDATE per card (204 for the current deck). Not a correctness concern, but will degrade linearly as the deck grows.

---

## Procedure Compliance

- Plan (`active-plan.md`) consulted before review: **yes**
- Implementation summary (`implementation-summary.md`) read before review: **yes**
- All files listed in the diff reviewed in full: **yes**
- Source files not modified: **yes**
- Review summary written: **yes**

---

## Re-Review (2026-05-24) — CRITICAL Fixes Verified

### Fix 1 — Good button: `--color-success` darkened to `#1A7A40`

**`app/globals.css` line 50:** `--color-success: #1a7a40` confirmed in source. The old value `#1F8A4C` is absent.

**Independent computation (WCAG 2.1 linearisation):**
- L(#1A7A40) = 0.2126·lin(26) + 0.7152·lin(122) + 0.0722·lin(64) = **0.1451**
- Contrast = (1.05) / (0.1451 + 0.05) = **5.38:1**
- Requirement: 4.5:1 (normal text, AA). Result: **PASS** (margin: +0.88)

The implementer table claims 5.4:1 (rounded). Independently verified as 5.38:1 — the rounding is correct and the ratio genuinely clears the threshold.

**Chart files updated:**
- `components/stats/forecast-chart.tsx` line 23: `BAR_FILL = "#1a7a40"` — confirmed.
- `components/stats/rating-chart.tsx` line 24: `RATING_COLORS[2] = "#1a7a40"` — confirmed.

Both match `--color-success`. No stale `#1f8a4c` hex remains in any of the three files.

### Fix 2 — Leech badge: `bg-clay text-on-earthy` (opaque)

**`components/card-back.tsx` line 30:** `className="rounded-full bg-clay px-2 py-0.5 text-xs font-medium text-on-earthy"` — confirmed. The old `bg-clay/20 text-clay` classes are gone.

**Independent computation (WCAG 2.1 linearisation):**
- L(#DB846E) = 0.2126·lin(219) + 0.7152·lin(132) + 0.0722·lin(110) = **0.3269**
- L(#1A1A1A) = 0.2126·lin(26) + 0.7152·lin(26) + 0.0722·lin(26) = **0.0109**
- Contrast = (0.3269 + 0.05) / (0.0109 + 0.05) = **6.25:1**
- Requirement: 4.5:1 (normal text, AA; applies in both modes — clay has no dark-mode override). Result: **PASS** (margin: +1.75)

No alpha compositing; background is fully opaque clay. Light-mode AA failure (formerly 2.13:1) is eliminated.

### Contrast table in implementation-summary.md

The review-fix section of `implementation-summary.md` records 5.38:1 for white-on-success and 6.25:1 for near-black-on-clay. Both match independent computation. The table corrections summary is accurate.

### No new issues introduced

- `globals.css`: no other token values changed relative to the M9 baseline.
- `card-back.tsx`: no other class or logic changes; leech span is the only edit.
- `forecast-chart.tsx` / `rating-chart.tsx`: hex-only changes, no logic change.
- `git diff` output confirms scope is limited to the documented fix lines.

### Assertions re-checked

| Assertion | Re-review Result | Evidence |
|---|---|---|
| A1 — All pairings WCAG AA, both modes | **PASS** | White/#1A7A40 = 5.38:1; #1A1A1A/#DB846E = 6.25:1; both independently computed above. |
| A2 — Good button label+hint meets AA | **PASS** | `text-white` on `bg-success` (#1A7A40) = 5.38:1 ≥ 4.5:1. |

### Commands run (re-review)

| Command | Exit code | Notable output |
|---|---|---|
| `git diff HEAD~1 -- app/globals.css components/card-back.tsx components/stats/forecast-chart.tsx components/stats/rating-chart.tsx` | 0 | Confirms `#1a7a40` in globals/forecast/rating; `bg-clay text-on-earthy` in card-back; no other palette changes |
| Node WCAG luminance/contrast computation | 0 | White/#1A7A40 = 5.3822:1; #1A1A1A/#DB846E = 6.2471:1; old #1F8A4C verified at 4.3768:1 (confirms original failure was real) |

### Residual risk (unchanged from initial review)

1. `@theme inline` self-reference fragility — still present; not a fix regression, was pre-existing.
2. N sequential UPDATEs in `refresh-seed-db.ts` — pre-existing, not a fix regression.
3. Redundant double-guard on `newRemaining` (MEDIUM, queries.ts:242,244) — pre-existing, not introduced by the fix.

All residual items are LOW/MEDIUM and carry over from the initial review unchanged.

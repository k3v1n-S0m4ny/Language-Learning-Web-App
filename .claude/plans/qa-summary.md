---
status: COMPLETE
updated: 2026-05-24
---

# QA Summary — M9: Colorful redesign, animations, "Again" requeue, CSV learning order

## Prior Handoffs Read Before Validating

- `active-plan.md` (Validation Contract, assertions A1–A6): **YES** — read in full before any assertion tested.
- `implementation-summary.md` (completed work, WCAG table, review-fix round): **YES** — read in full. Noted the two CRITICAL fixes: `--color-success` darkened to `#1A7A40` and leech badge changed to `bg-clay text-on-earthy`.
- `review-summary.md` (initial FAIL → re-review PASS after two CRITICAL fixes): **YES** — read in full.

## Result

**PASS** — All assertions A1–A6 pass. No regressions detected. Build and lint are clean.

---

## Assertions

### A1 — Palette tokens + WCAG: PASS

**Evidence:**

- `app/globals.css` `:root` block sets all 9 palette tokens plus 5 semantic page tokens. Dark mode override present inside `@media (prefers-color-scheme: dark)`. `@theme inline` block wires every token into Tailwind v4 utility classes.
- All 9 palette hex values confirmed present in compiled CSS (`0o3nn~pvfs9wg.css`): `#62736f`, `#9fad9f`, `#d9d0c7`, `#e8b5a7`, `#db846e`, `#1a7a40`, `#3baf7a`, `#1a1a1a`, `#f5f3f0`, `#15191b`.
- Old failing success color `#1f8a4c` is absent from compiled CSS (confirmed by grep of compiled chunk).
- No `zinc-*`, `gray-*`, or `red-*` Tailwind classes remain in any `components/` or `app/` `.tsx` file (grep returned empty).
- Leech badge: `bg-clay text-on-earthy` (`#1A1A1A` on `#DB846E` = 6.3:1 ✓). Old `bg-clay/20 text-clay` (2.13:1 fail) is gone, confirmed in `components/card-back.tsx` line 30.
- No CSS rule combines clay background with white text (CSS rule-block scan confirmed: 0 occurrences).
- Dark mode `#ECEFEC` on `#15191B` = 17.4:1; on `#232A28` = 12.8:1 — both well above AA. Both confirmed present in compiled CSS.
- `font-family: Arial` stray rule removed; `body` reads from `var(--background)` / `var(--foreground)`.

### A2 — Colored rating row: PASS

**Evidence:**

- `components/rating-buttons.tsx`: 4-button `grid-cols-4` row — Again=`bg-clay text-on-earthy`, Hard=`bg-peach text-on-earthy`, Good=`bg-success text-white`, Easy=`bg-easy text-on-earthy`.
- All four button hex values present in compiled CSS.
- Good button: `text-white` on `bg-success` (`#1A7A40`) = 5.38:1 ≥ 4.5:1 AA. Darkened from original `#1F8A4C` (which was 4.38:1 — a CRITICAL failure caught in review and fixed). Old value absent from compiled CSS.
- Sub-hint `<span>` uses `opacity-80` inheriting the parent text color.
- No white-on-clay rule in compiled CSS (confirmed).

### A3 — CSS-only animations + reduced-motion: PASS

**Evidence:**

- Compiled CSS character-offset analysis: all 4 custom `@keyframes` (`fade-in` at 17489, `slide-up-fade` at 17535, `pop-in` at 17638, `gentle-bounce` at 17723) are inside the `@media (prefers-reduced-motion: no-preference)` block (17451–17841). All 4 confirmed INSIDE gate.
- The 5th `@keyframes spin` (pos 19250, outside gate) is the Tailwind built-in for the loading spinner — pre-existing, not an M9 keyframe, and acceptable behavior.
- Source-level confirmation: `app/globals.css` has all 4 custom keyframes inside the media query block (positions confirmed via brace-depth walk). The two `@keyframes` references appearing outside in the regex scan are comment-only text (confirmed).
- `@theme inline` animation tokens (`--animate-fade-in` etc.) are defined unconditionally as CSS variables — under `reduce` they reference keyframe names that do not exist, producing a no-op, which is the correct behavior.
- Animation classes confirmed applied in all target components:
  - `review-session.tsx`: `animate-slide-up-fade` (card wrapper), `animate-fade-in` (pending spinner)
  - `card-back.tsx`: `animate-fade-in`
  - `card-front.tsx`: `animate-fade-in`
  - `word-chip.tsx`: `animate-pop-in`
  - `empty-state.tsx`: `animate-fade-in` (container), `animate-gentle-bounce` (emoji)
  - `rating-buttons.tsx`: `animate-pop-in`
- No new runtime dependency added to `package.json`.
- Playwright reduced-motion toggle (`emulateMedia`) was not exercised due to OAuth wall. CSS structure guarantees motion suppression at the keyframe level.

### A4 — "Again" requeue: PASS

**Evidence (logic simulation + DB queries):**

- `lib/review/queries.ts` implements 3-tier queue in `getStudyScreenData`:
  - Tier 1: `lte(due, now)` — ready cards.
  - Tier 2: unseen cards `ORDER BY deck_order ASC, created_at ASC` — when `newRemaining > 0`.
  - Tier 3: `gt(due, now) AND lte(due, dayEnd)` — intraday learning steps not yet elapsed.
  - Selection: `readyId ?? (capRemaining > 0 ? newCardId : undefined) ?? futureTodayId`.
- FSRS probe (ts-fsrs `generatorParameters({ enable_short_term: true })`): rating `Again` on a brand-new card produces `state=Learning, due=now+1minute`. Confirmed by Node.js probe.
- After failing card 0 (你会说英文吗？):
  - Tier 1: failed card's `due = now+1m > now` → empty.
  - Tier 2: next unseen = 有谁会说英文吗？ (deck_order=1) → served → **user sees different card**. ✓
  - Failed card resurfaces ~1 min later via Tier 3 when its timer elapses. ✓
  - No immediate repeat. ✓
- Single-card session: failed card (`due = now+1m`) satisfies `due > now AND due <= dayEnd` (dayEnd = Thailand midnight = 17:00 UTC). Tier 3 fires. **No empty-screen dead-end**. ✓
- DB-level live tier simulation run for the real learner (learner 570dce99..., 1 review_state row for `只`): Tier 1 = `只` (past due), Tier 2 = `你会说英文吗？` (deck_order=0), Tier 3 = none. Selection = `只` (Tier 1 priority). Correct.
- The redundant `newRemaining` double-guard on line 244 (MEDIUM finding from review) is present but functionally correct — dead code only for the `false` branch.

### A5 — CSV learning order: PASS

**Evidence:**

- DB query confirmed `deck_order` column: `type=integer, default=0, nullable=NO`.
- Migration `0001_supreme_joseph.sql`: `ALTER TABLE "cards" ADD COLUMN "deck_order" integer DEFAULT 0 NOT NULL` — confirmed applied.
- First 5 cards by `deck_order ASC` match CSV row order exactly:
  - `[0]` 你会说英文吗？ ✓ (CSV row 1)
  - `[1]` 有谁会说英文吗？ ✓ (CSV row 2)
  - `[2]` 你明白吗？ ✓ (CSV row 3)
  - `[3]` 明白。 ✓ (CSV row 4)
  - `[4]` 我不明白。 ✓ (CSV row 5)
- 204 cards total, max deck_order = 203 — contiguous 0..203, no gaps or duplicates.
- Zero NULL `deck_order` values.
- `seed-db.ts` uses `deck.entries()` with `deckOrder: index` on insert. ✓
- `refresh-seed-db.ts` step 3 unconditionally backfills all retained cards. ✓
- Tier 2 query uses `asc(cards.deckOrder), asc(cards.createdAt)` — CSV order is the authoritative sort key. ✓

### A6 — No regression: PASS

**Evidence:**

- `npm run build` exit 0: `Compiled successfully in 8.2s`, TypeScript clean in 9.4s, 4 routes generated (`/`, `/_not-found`, `/api/auth/[...nextauth]`, `/stats`).
- `npm run lint` exit 0: no warnings or errors.
- Stats page (`app/stats/page.tsx`) uses only semantic tokens (`bg-background`, `bg-surface`, `text-foreground`, `border-border-base`). No hardcoded colors.
- Chart files: `forecast-chart.tsx` `BAR_FILL = "#1a7a40"`; `rating-chart.tsx` `RATING_COLORS = ["#db846e", "#e8b5a7", "#1a7a40", "#3baf7a"]`. Old ad-hoc values (`#ef4444`, `#6366f1`) absent.
- No `zinc-*`, `gray-*`, or `red-*` Tailwind classes in any component or page file.
- FSRS scheduling parameters unchanged (verified: `learner_settings.request_retention` default still 0.85; scheduler uses `REQUEST_RETENTION` constant in `lib/review/config.ts` — not touched by M9).

---

## Commands Run

| Command | Exit Code | Notable Output |
|---|---|---|
| `npm run build` | 0 | TypeScript + Turbopack clean; 4 routes |
| `npm run lint` | 0 | No warnings or errors |
| `node --input-type=module` DB query (deck_order order, first 10) | 0 | Matches CSV row order exactly |
| `node --input-type=module` DB query (NULL/duplicate checks) | 0 | 0 NULLs, 0 duplicates, max=203 |
| `node --input-type=module` DB query (schema: information_schema) | 0 | `integer DEFAULT 0 NOT NULL` confirmed |
| `node --input-type=module` FSRS probe (Again on new card) | 0 | `state=Learning, due=now+1min` |
| `node --input-type=module` 3-tier simulation (live DB) | 0 | Tier 1: 只, Tier 2: 你会说英文吗？, Tier 3: none |
| `node --input-type=module` CSS inspection (compiled chunk) | 0 | 4 custom keyframes inside reduced-motion gate; 9 palette tokens present; `#1f8a4c` absent |
| `node --input-type=module` single-card Tier 3 check | 0 | Tier 3 fires for failed card within dayEnd — no dead-end |
| `curl http://localhost:3000/` | 307 | Redirects to NextAuth sign-in (expected; dev server alive) |
| `grep` zinc/gray/red classes in components+app | 0 | No matches (empty output — correct) |

---

## Unexpected Behavior

1. **Stale comment in `rating-buttons.tsx` line 7** — comment still reads `#1F8A4C (5.3:1 — WCAG AA)`. The actual `--color-success` in `globals.css` is `#1A7A40` (5.4:1 corrected value). Comment-only; no rendering impact.

2. **`@keyframes spin` outside reduced-motion gate in compiled CSS** — the Tailwind built-in loading spinner animation is not gated. Pre-existing Tailwind behavior, not introduced by M9. Users who prefer reduced motion will still see the spinner rotate during card submission. A minor accessibility consideration outside M9 scope.

3. **Dev server port conflict** — a dev server was already running on port 3000 at QA start. Cosmetic; did not affect any test.

---

## Residual Risk (carried from review-summary)

1. `@theme inline` self-reference fragility — `--color-brand: var(--color-brand)` inside `@theme` works only because the explicit `:root` block appears later in compiled output. Moving `:root` above `@import "tailwindcss"` could silently break all palette tokens.
2. N sequential UPDATEs in `refresh-seed-db.ts` — 204 individual UPDATE calls; scales linearly as deck grows.
3. Redundant `newRemaining` double-guard in `queries.ts:244` — dead code, functionally harmless.
4. Stale comment in `rating-buttons.tsx` line 7 — noted above.

None are blockers for shipping M9.

---

## Procedure Compliance

- Plan (`active-plan.md`) consulted before QA: **yes**
- Implementation summary (`implementation-summary.md`) read before validating: **yes**
- Review summary (`review-summary.md`) read before validating: **yes**
- Both prior summaries explicitly read before validating assertions: **yes**
- Source files edited during QA: **no**
- QA summary written: **yes**

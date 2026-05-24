---
status: COMPLETE
updated: 2026-05-24
---

> **Cycle outcome (2026-05-24):** All 6 assertions PASS. implementer → code-reviewer
> (BLOCKED: 2 CRITICAL WCAG failures — Good-button white-on-success 4.38:1 and leech-badge
> clay-on-translucent 2.13:1) → implementer fix (success → #1A7A40 = 5.38:1; leech badge →
> opaque `bg-clay text-on-earthy` = 6.25:1) → code-reviewer re-review PASS → qa-engineer PASS
> (`npm run build` + `lint` exit 0; deck_order 0..203 matches CSV; 3-tier requeue serves a
> different card on Again). Stale comment in rating-buttons.tsx corrected post-QA.
> **Not committed** — awaiting user approval + message.

# Active Plan — M9: Colorful redesign, light animations, "Again" requeue, CSV learning order

Full design + decision record (approved): `C:\Users\User\.claude\plans\so-some-things-we-snoopy-goblet.md`
Plan root for this cycle: `C:\Users\User\Software Projects\Language-Learning-App\.claude\plans\`

## Validation Contract (assertions first)

- **A1 — Palette tokens + WCAG.** A semantic color-token layer (light + dark) exists in `app/globals.css`; components stop hardcoding `zinc-*`/`red-*` for primary UI. Every text/background and UI-component pairing meets WCAG AA in **both** light and dark mode (≥4.5:1 normal text, ≥3:1 large text & UI components). Computed ratios are recorded in `implementation-summary.md`. **No white text on `#DB846E`.**
- **A2 — Colored rating row.** The four rating buttons render as a Duolingo-style colored row (Again=clay+dark text, Hard=peach+dark text, Good=success+white text, Easy=easy), each label+hint meeting AA against its button.
- **A3 — CSS-only animations + reduced-motion.** No new runtime dependency added to `package.json`. Card advance, front→back reveal, button press, and empty-state animate. All motion is suppressed under `prefers-reduced-motion: reduce`.
- **A4 — "Again" requeue.** Failing a brand-new card advances to a *different* card on the next render; the failed card does not appear on the immediately-following render when another ready or new card is available, and resurfaces a few cards later. A session with only one remaining card still serves it (tier-3 fallback) — no empty-screen dead-end.
- **A5 — CSV learning order.** `cards.deck_order` column exists (migration generated + applied). `seed-db.ts` sets it from CSV/JSON index; `refresh-seed-db.ts` backfills it unconditionally. New-card selection orders by `deck_order ASC` (`created_at` tiebreak). New cards are introduced in CSV row order.
- **A6 — No regression.** `npm run build` and `npm run lint` pass clean. Existing review and stats flows are unaffected; FSRS scheduling parameters are unchanged.

**Feature→assertion map:** Color→A1,A2; Animations→A3; Again requeue→A4; CSV order→A5; all→A6.
**Done when:** A1–A6 all PASS.
**Out of scope:** committing (await explicit approval + message); changing FSRS request_retention/steps; adding runtime deps; features beyond the four. DB operations (migrate, backfill) are in scope and pre-approved as part of the plan.

## Goal
Four user-requested improvements:
1. **Animations (CSS-only)** — light, modern motion (card advance, reveal, button press, empty-state), gated behind `prefers-reduced-motion`.
2. **Color** — adopt the user's 5-color earthy palette as a semantic token layer + a few bright WCAG-checked accent greens for the rating CTAs; full light + dark variants. Must remain WCAG AA.
3. **"Again" requeue** — failing a card advances to the next card; the failed card resurfaces a few cards later via its natural FSRS learning step (no immediate repeat, no dead-end).
4. **CSV learning order** — introduce new cards in CSV row order via an explicit `cards.deck_order` column.

## Palette (verified contrasts)
| Token | Hex | Role | WCAG |
|---|---|---|---|
| `--color-brand` | `#62736F` | primary btn (white text), text-on-light | white-on-brand 5.0:1 ✓ |
| `--color-sage` | `#9FAD9F` | surfaces, borders, chips (dark text) | 8.95:1 ✓ |
| `--color-sand` | `#D9D0C7` | light page/section bg (dark text) | ✓ |
| `--color-peach` | `#E8B5A7` | soft accent / "Hard" btn (dark text) | 11.6:1 ✓ |
| `--color-clay` | `#DB846E` | terracotta / "Again" btn — **DARK TEXT ONLY** | 7.5:1 ✓ (white 2.8:1 ✗) |
| `--color-success` | ~`#1F8A4C` (verify) | "Good" CTA (white text ≥4.5:1) | compute & record |
| `--color-easy` | lighter/teal green (verify) | "Easy" btn | compute & record |

Dark mode: bg ~`#15191B`, surface ~`#232A28`, fg ~`#ECEFEC`; re-verify every accent pairing (≥3:1 UI, ≥4.5:1 text).

## Implementation steps
1. **`app/globals.css`** — add `@theme` color tokens (light + dark), `@keyframes` (`fade-in`, `slide-up-fade`, `pop-in`, `gentle-bounce`) + animation tokens wrapped in `@media (prefers-reduced-motion: no-preference)`; set `body` bg/fg to new tokens; remove the stray `font-family: Arial` so Geist applies.
2. **`lib/db/schema.ts`** — add `deckOrder: integer("deck_order").notNull().default(0)` to `cards`.
3. **Migration** — `npm run db:generate` then `npm run db:migrate` (Neon, us-east-1).
4. **`scripts/seed-db.ts`** — set `deckOrder: index` on insert (`deck.entries()`).
5. **`scripts/refresh-seed-db.ts`** — unconditionally backfill `deck_order = <index>` for every kept card.
6. **`lib/review/queries.ts`** — replace single due-sorted selection with 3-tier priority: (1) ready `due<=now` ASC, (2) new card (cap allows) `ORDER BY deck_order ASC`, (3) future-today fallback `due>now AND <=dayEnd` ASC. `chosenId = readyId ?? newId ?? futureTodayId`. Document with an A-series comment block.
7. **Component sweep** — replace `zinc-*`/`red-*` with semantic tokens + add animation classes: `components/rating-buttons.tsx` (colored Duolingo-style row), `card-back.tsx`, `card-front.tsx`, `review-session.tsx`, `word-chip.tsx`, `session-header.tsx`, `empty-state.tsx`, `audio-button.tsx`, `sign-out-button.tsx`; `app/page.tsx`, `app/layout.tsx`, `app/stats/page.tsx`; `components/stats/*-chart.tsx` hardcoded hex → palette.

> `AGENTS.md`: this Next.js 16.2.6 has breaking changes — consult `node_modules/next/dist/docs/` before any Next-specific change.

## Verification
- WCAG: every text/bg + UI pairing (light+dark) ≥4.5:1 text / ≥3:1 large+UI; record ratios.
- `npm run db:generate && npm run db:migrate` succeed; `cards.deck_order` exists.
- `tsx scripts/refresh-seed-db.ts` backfills; new cards introduced in CSV order.
- Fail a new card → next card is a different (new) card; failed card returns a few cards later; single-card session ends cleanly.
- Animations fire; with OS reduce-motion on, motion is suppressed.
- `npm run build` + `npm run lint` clean.

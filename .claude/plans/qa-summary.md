---
status: COMPLETE
updated: 2026-05-22
---

# QA Summary — Milestone 4: Review UI

Date: 2026-05-22 · QA: Claude (dev-cycle Phase 4, main thread).
**Read both `implementation-summary.md` and `review-summary.md` before validating** — yes, both were
read; this summary checks their assertions rather than re-deriving them.

## Result: CONDITIONAL PASS — all machine-verifiable assertions PASS; live-session assertions DEFERRED to user

The build, type, lint, and route-protection checks pass. The behavioral assertions that require a
signed-in Learner could not be exercised in this environment for two independent reasons, both
pre-existing constraints (not implementation gaps):
1. **Google OAuth needs a real browser + Workspace account** — cannot be automated here.
2. **No live Neon database is reachable via MCP.** The only project in the org is `merci-j`
   (unrelated); per M3, this app's DB is provisioned through the Vercel Marketplace Neon integration,
   which is not visible to the Neon MCP in this session. I did **not** touch `merci-j`.

## Assertions — status

| ID | Assertion | Status | Evidence |
|----|-----------|--------|----------|
| A1 | Front shows only Headword | PASS (static) | CardFront pre-reveal branch renders `headword` only |
| A2 | Reveal shows whole gloss + audio | PASS (static) | card-back.tsx |
| A3 | Phrase word row; gloss tap-reveal; single-word row suppressed | PASS (static) | card-back gates on `isPhrase`; word-chip |
| A4 | One "Show pinyin" reveals all pinyin | PASS (static) | state lifted to card-back |
| A5 | Four ratings w/ interval hints | PASS (static+build) | rating-buttons + previewIntervals |
| A6 | Persist via db.batch; log rating | PASS (build/type) | actions.ts; `next build` typechecks db.batch |
| A7 | Advances to next card / empty state | PASS (static) | refresh() + page re-fetch + EmptyState |
| A8 | Due-first ordering | PASS (static) | getNextDueCard orderBy asc(due) before unseen |
| A9 | New-card cap, UTC day | PASS (static) | countNewIntroducedToday startOfUtcDay |
| A10 | Lazy settings bootstrap | PASS (static) | ensureLearnerSettings onConflictDoNothing |
| A11 | Audio disabled (not hidden) when null | PASS (static) | AudioButton disabled={!url} |
| A12 | tsc + lint clean | **PASS (executed)** | tsc 0, eslint 0, next build 0 |
| Q1 | fsrs_card never crosses to client | PASS (static) | only hints + display data passed |
| Q2 | double-submit guarded | PASS (static) | useTransition pending disables buttons |
| Q3 | glossary terms | PASS (static) | code/UI use Card/Word/Gloss/Pinyin/Review State |

"static" = verified by reading the implementation + a clean production build; "executed" = a command
was run and its exit code observed.

## Executed checks
- `npx tsc --noEmit` → exit 0.
- `npx eslint .` → exit 0.
- `npx next build` → exit 0; route `/` is dynamic (ƒ), proxy middleware present, no RSC boundary errors.
- `npx next dev` + `curl`: `GET /` → **307** (unauthenticated redirect to sign-in works), `GET
  /api/auth/providers` → **200**.

## DEFERRED to the user (runtime walkthrough required)
On the user's machine, signed in as an allowlisted Learner:
1. **A1–A7, A11 happy path:** front shows only Chinese → Show answer → tap a Word gloss → Show pinyin →
   play whole + per-word audio → click each of the 4 ratings on different Cards → confirm the next Card
   loads and Due/New counts decrement.
2. **A6 persistence:** after a rating, confirm a `review_states` row exists/updated (`due`, `fsrs_card`,
   `last_review`) and a `review_logs` row with the chosen `rating`, via `npm run db:studio`.
3. **A8 due branch:** rate a card, then `npm run dev:fast-forward -- <learner-email>`, reload, confirm a
   due Card is served before any new Card.
4. **A9 cap:** introduce 10 new Cards; confirm the 11th is not offered until a Card is due or the UTC
   day rolls.
5. **Two-learner isolation:** sign in as the second Learner; confirm independent counts/schedule.

## Recommendation
Ship M4 to local testing. The data and UI layers are type-sound and build-clean; the only open items
are runtime confirmations that inherently need a browser session and the live (Vercel-provisioned) DB.
Once the user completes the deferred walkthrough, mark all required assertions PASS in `active-plan.md`.

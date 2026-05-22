---
status: BLOCKED
updated: 2026-05-22
---

> **Blocker:** M4 code is complete and build/type/lint-clean. Required behavioral assertions
> A1–A11 await a runtime walkthrough by the user — they need real Google OAuth (browser +
> Workspace account) and the Vercel-provisioned Neon DB, neither reachable in this session.
> Once the user completes the deferred walkthrough in `qa-summary.md`, flip status to COMPLETE.
> A12 (tsc/lint/build) already PASSES (executed).

# Active Plan — Milestone 4: Review UI (Validation Contract)

Chinese spaced-repetition flashcards ("I Hate My 9-5"). M1–M3 complete (see
`m1-3-archive--*.md`). This contract covers M4: the FSRS-driven study screen — the core of
the product. Source plan: `C:\Users\User\.claude\plans\next-step-recommendation-kind-orbit.md`.

**Plan root:** `c:\Users\User\Software Projects\Language-Learning-App\.claude\plans\`
**Project-context:** `CONTEXT.md` (ubiquitous language), `docs/adr/0001-*` (storage), `m1-3-archive--*`.

---

## Validation Contract — assertions

Required (must PASS for M4 to be complete):

- **A1** Signing in as an allowlisted Learner with no review history shows a Card front displaying ONLY the Chinese headword (no gloss/pinyin/English visible).
- **A2** Activating "Show answer" reveals the whole-Phrase Gloss and a whole-Phrase audio control.
- **A3** For a Phrase Card (`isPhrase=true`), a word-by-word row renders; each Word's Gloss is hidden until that Word is tapped; each Word has its own audio control. For a single-Word Card (`isPhrase=false`), the word-by-word row is suppressed.
- **A4** A single "Show pinyin" control reveals whole-Phrase pinyin and per-Word pinyin together; pinyin is hidden until then.
- **A5** Four rating controls (Again/Hard/Good/Easy) are shown after reveal, each labelled with its next-interval hint computed from `ts-fsrs`.
- **A6** Submitting a rating persists state: a `review_states` row for `(learnerId, cardId)` is created or updated with new `fsrs_card`, `due`, `last_review`; and a `review_logs` row is inserted with the chosen `rating` (1–4). The two writes happen via `db.batch` (neon-http has no interactive transactions).
- **A7** After a rating, the screen advances to the next due/new Card (or an all-caught-up empty state), and the session counts reflect the change.
- **A8** "Due first" ordering: a Card whose `review_states.due <= now()` is served before any new (unseen) Card.
- **A9** New-card daily cap: at most `learnerSettings.newCardsPerDay` (default 10) unseen Cards are introduced per Learner per UTC day; introduced-today is counted by `review_states.createdAt >= startOfUtcDay`.
- **A10** `learner_settings` is lazily bootstrapped (newCardsPerDay=10, requestRetention=0.9) on first read so a Card can always be served.
- **A11** Audio controls are disabled (not hidden) when a Card's/Word's `audio_url` is null; layout stays stable.
- **A12** `npx tsc --noEmit` is clean and `npm run lint` passes.

Quality gates:
- **Q1** The `fsrs_card` jsonb never crosses to the client; scheduling math stays server-side. Only serializable display data (headword, words, glosses, pinyin, audio URLs, hint strings, counts) is passed to client components.
- **Q2** Double-submit is guarded (rating controls disabled while the action is pending).
- **Q3** Glossary terms (Learner, Card, Headword, Phrase, Word, Gloss, Pinyin, Audio Clip, Tag, Review State) used consistently in code/UI per `CONTEXT.md`.

Out of scope (M4): `/library`, `/stats`, in-app authoring, deployment (M5), bidirectional study, named decks, audio autoplay.

---

## Feature → assertion mapping

| Feature | File(s) | Assertions |
|---|---|---|
| Shared types | `lib/review/types.ts` | (supports all) |
| ts-fsrs wrapper | `lib/review/scheduler.ts` | A5, A6 |
| Queries + bootstrap | `lib/review/queries.ts` | A8, A9, A10 |
| submitReview action | `lib/review/actions.ts` | A6, A7, Q1, Q2 |
| Study screen | `app/page.tsx` | A1, A7, A8 |
| Card front | `components/card-front.tsx` | A1, A2 |
| Card back + word row | `components/card-back.tsx`, `components/word-chip.tsx` | A2, A3, A4, A11 |
| Audio control | `components/audio-button.tsx` | A2, A3, A11 |
| Rating controls | `components/rating-buttons.tsx` | A5, A7, Q2 |
| Session shell | `components/review-session.tsx`, `session-header.tsx`, `empty-state.tsx`, `sign-out-button.tsx` | A7, Q1, Q3 |
| Dev helper | `scripts/fast-forward-due.ts` (+ `dev:fast-forward`) | A8 (testability) |

---

## Verified technical constraints (checked against installed code)

- **neon-http: no `db.transaction()`** (it throws) → use **`db.batch([...])`** for the atomic A6 write.
- **`refresh()` from `next/cache`** in Next 16.2.6 (not `router.refresh()`).
- **ts-fsrs 5.4.0:** `fsrs(generatorParameters({ request_retention }))`; `createEmptyCard(now)`;
  `.repeat(card, now)` → preview indexable by `Rating` (`{card,log}` each); `.next(card, now, grade)` →
  `{card,log}`. `Rating` Again=1/Hard=2/Good=3/Easy=4. jsonb rehydrates dates as ISO strings → coerce to `Date`.

## Done criteria
All required assertions A1–A12 PASS; quality gates Q1–Q3 satisfied; handoff chain written
(`implementation-summary.md` → `review-summary.md` → `qa-summary.md`); status set to COMPLETE.

## Build order
1. `lib/review/{types,scheduler,queries,actions}.ts`
2. `components/*.tsx` (server: session-header, empty-state, sign-out-button; client: review-session, card-front, card-back, word-chip, audio-button, rating-buttons)
3. `app/page.tsx` rewrite
4. `scripts/fast-forward-due.ts` + `dev:fast-forward` npm script
5. Verify (A12) + manual walkthrough (A1–A11)

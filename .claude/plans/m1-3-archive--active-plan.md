---
status: SUPERSEDED
updated: 2026-05-22
---

# Active Plan — Chinese Spaced-Repetition Flashcards ("I Hate My 9-5")

> SUPERSEDED by `active-plan.md` (M4 Validation Contract). M1–M3 are complete; this is the archived M1–M3 plan.

M1 (scaffold+DB) ✅, M2 (auth) ✅, M3 (seed: 100 cards/155 words/110 audio clips) ✅ as of 2026-05-22; next: M4 (Review UI). Author: Claude · Date: 2026-05-21

A private, two-person Chinese flashcard app. Front shows only Chinese; reveal shows
English, per-word breakdown, on-demand pinyin, and pre-generated pronunciation audio.
See `CONTEXT.md` for the ubiquitous language and `docs/adr/0001-*` for the storage decision.

---

## 1. Decisions locked in this session

| # | Decision | Choice |
|---|----------|--------|
| 1 | Learner & progress model | Two Learners, one shared Card Library, **separate per-Learner Review State** |
| 2 | Scheduling algorithm | **FSRS** via `ts-fsrs` (v6), 4 ratings: Again/Hard/Good/Easy |
| 3 | Card breakdown depth | **Word-level** (我 / 喜欢 / 喝 / 茶), not per-character |
| 4 | Card creation | **No in-app authoring** — cards built during development, seeded into DB |
| 5 | Authoring workflow | LLM **content script → reviewable seed file → edit → seed DB** |
| 6 | Audio generation timing | **Pre-generated at seed time** (no OpenAI key in production) |
| 7 | Audio storage | **Public Vercel Blob**, URL+metadata in Postgres (ADR 0001) |
| 8 | Study direction | **Chinese → English only** (one Review State per Card per Learner) |
| 9 | Auth | **Auth.js (NextAuth v5) Google sign-in**, restricted to two emails |
| 10 | Deck organization | **Free-form Tags** (no named decks) |
| 11 | TTS | `gpt-4o-mini-tts`, voice **Nova**, mp3, instructed slow/clear Mandarin |
| 12 | ORM | **Drizzle ORM** over Neon (`neon-http` driver) |
| 13 | Back reveal flow | Whole gloss+audio on reveal; **each word's gloss hidden until tapped**; pinyin behind its own button |
| 14 | Platform | **Online-only, mobile-first** responsive web on Vercel |

### Defaults I'm assuming (tell me to change any)
- **New cards/day per Learner:** 10 (configurable); FSRS `request_retention` 0.9 (default).
- **Content-generation script LLM:** OpenAI (you already use it for audio); pinyin produced
  in-context (handles 多音字), proofread by us in the seed file.
- **Pinyin reveal:** one "Show pinyin" button reveals whole-phrase + per-word pinyin together.
- **Audio dedup:** identical words across phrases may share one clip (hash by hanzi+pinyin).

---

## 2. Tech stack

- **Next.js (App Router) + TypeScript**, Tailwind CSS for mobile-first UI.
- **Neon Postgres** (Vercel Marketplace) + **Drizzle ORM** (`drizzle-orm/neon-http`).
- **Vercel Blob** (public store) for audio MP3s.
- **Auth.js v5** (`next-auth@beta`) with Google provider + email allowlist.
- **ts-fsrs** for scheduling.
- **OpenAI `gpt-4o-mini-tts`** (Nova) — dev/seed time only.
- Cached vendor docs in `docs/vendor-cache/` (Blob, storage, OpenAI TTS, Drizzle/Neon,
  Auth.js, ts-fsrs, Neon driver).

---

## 3. Data model (Drizzle / Postgres)

- **users / accounts / sessions / verificationTokens** — Auth.js Drizzle adapter. A
  *Learner* is a `user`, gated by the email allowlist.
- **cards** — `id`, `headword` (Chinese), `is_phrase`, `whole_gloss` (English),
  `whole_pinyin`, `whole_audio_url`, `created_at`.
- **words** — `id`, `card_id`→cards, `position`, `hanzi`, `gloss`, `pinyin`,
  `audio_url`. (1 row for single-word cards; N ordered rows for phrases.)
- **tags** — `id`, `name`; **card_tags** — (`card_id`, `tag_id`) join.
- **review_states** — `id`, `learner_id`→users, `card_id`→cards, FSRS columns
  (`due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `reps`,
  `lapses`, `state`, `last_review`), UNIQUE(`learner_id`,`card_id`). This *is* Review State.
- **review_logs** (optional) — per-review history for stats.
- **learner_settings** (optional) — `new_cards_per_day`, `request_retention`.

"Cards due for a Learner" = `review_states` where `due <= now()` for that learner,
plus up to N new (unseen) cards/day.

---

## 4. Seed pipeline (`/scripts`, dev-only)

1. **`seed/source-phrases.yaml`** — you/I list Chinese headwords (+ optional tags).
2. **`scripts/generate-content.ts`** — OpenAI segments into words, writes per-word +
   whole glosses and pinyin → **`seed/cards.generated.json`** (human-readable, committed).
3. **Manual review/edit** of that file — the proofreading step.
4. **`scripts/generate-audio.ts`** — for each unique word + whole phrase, call
   `gpt-4o-mini-tts` (Nova) → mp3 → upload to Vercel Blob (immutable pathname) →
   record URLs back into the seed file.
5. **`scripts/seed-db.ts`** — load cards/words/tags into Neon via Drizzle.

Idempotent and re-runnable; audio dedup avoids regenerating shared words.

---

## 5. App structure

- `app/page.tsx` — the **study screen** (the whole product): shows next due card.
- `app/api/auth/[...nextauth]/route.ts`, `auth.ts`, `proxy.ts` — Auth.js.
- Server actions / route handlers: `getNextDueCard(learner)`, `submitReview(cardId, rating)`.
- Components: `CardFront` (Chinese only), `CardBack` (whole gloss + whole audio button;
  word row with per-word audio + tap-to-reveal gloss; "Show pinyin" button),
  `RatingButtons` (FSRS, with next-interval hints from `scheduler.repeat`).
- Optional later: `/library` (browse + filter by Tag), `/stats`.

---

## 6. Milestones (proposed build order)

1. **Scaffold** — Next.js+TS+Tailwind, Drizzle, env wiring, app shell.
2. **DB** — provision Neon (via MCP), schema + migrations, Auth.js adapter tables.
3. **Auth** — Google sign-in + email allowlist; protect all routes.
4. **Seed pipeline** — content gen + audio gen + Blob + db seed; load a small starter deck.
5. **Review UI** — FSRS loop, front/back, per-word reveal, audio, pinyin reveal.
6. **Deploy** — Vercel project, env vars, Blob + Neon connected; add to home screen.

---

## 7. Conventions (project rule: maximum affordance & consistency)

- **Files/folders:** lowercase kebab-case. Scripts named by verb-noun
  (`generate-content.ts`). Seed artifacts under `seed/`. One concern per file.
- **Glossary:** `CONTEXT.md` (terms only, no implementation). Code, UI, and docs use the
  exact glossary terms (Learner, Card, Headword, Phrase, Word, Gloss, Pinyin, Audio Clip,
  Tag, Review State).
- **Decisions:** hard-to-reverse trade-offs → `docs/adr/NNNN-*.md`.
- **External docs:** cached in `docs/vendor-cache/` with source+date frontmatter.
- **Handoffs (your session protocol):** active-plan.md → implementation-summary.md →
  review-summary.md → qa-summary.md, in `.claude/plans/`.

---

## 8. Open questions before build
- Confirm the four assumed defaults in §1.
- Provide (or let me draft) the **starter list of Chinese phrases/words** for the first seed.
- Confirm you can create a **Google OAuth client** + give me the **two allowlisted emails**,
  and that you'll connect **Neon** and a **Vercel Blob** store (or let me drive via MCP/CLI).

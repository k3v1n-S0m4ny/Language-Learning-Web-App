# Next-Session Prompt — Language Learning Web App (Chinese SRS flashcards)

> Paste everything below into a fresh Claude Code session opened in
> `C:\Users\User\Software Projects\I-Hate-My-95`. It assumes ZERO prior context.

---

You are picking up a **Chinese spaced-repetition flashcard web app** for a couple (the
user and his girlfriend) to study together. Milestones 1–3 are DONE and verified;
your job is **Milestone 4 (the Review UI)** and then **Milestone 5 (deploy)**.

## 0. Read these first (durable context in the repo)
- `CONTEXT.md` — the glossary (ubiquitous language). Use these exact terms in code/UI:
  Learner, Card Library, Card, Headword, Phrase, Word, Gloss, Pinyin, Audio Clip, Tag,
  Review State.
- `.claude/plans/active-plan.md` — full design, stack, data model, milestones.
- `.claude/plans/implementation-summary.md` — exactly what's been built (M1–M3).
- `docs/adr/0001-*.md` — why Neon + public Vercel Blob.
- `docs/vendor-cache/*.md` — cached, version-correct docs (Next 16, Auth.js v5, Drizzle+Neon,
  ts-fsrs, OpenAI TTS, Vercel Blob). Prefer these over memory.
- Project memory at `C:\Users\User\.claude\projects\C--Users-User-Software-Projects-I-Hate-My-95\memory\`.

## 1. Hard rules (the user cares a lot)
- **No placeholders, stubs, mocks, or fake data** unless the user explicitly allows. If
  blocked on a credential/decision, STOP and ask — don't fake it.
- **Never drop/filter the user's data** without being asked. Keep every item; transform, don't delete.
- **Session protocol:** keep `.claude/plans/` handoffs current (active-plan →
  implementation-summary → review-summary → qa-summary). Prefer the `implementer` /
  `code-reviewer` / `qa-engineer` agents (or `/dev-cycle`) for the feature work.
- Ask clarifying questions before complex work; simple > clever code.

## 2. Stack & current state (all REAL and working)
- **Next.js 16.2.6** (App Router, TypeScript, Tailwind v4, Turbopack), React 19. No `src/` dir.
- **Neon Postgres** (project `neon-cyan-forest`, region **us-east-1**) via **Drizzle ORM**
  (`drizzle-orm/neon-http`). Client: `lib/db/index.ts`; schema: `lib/db/schema.ts`;
  migrations applied (`lib/db/migrations/`). 11 tables exist.
- **Auth.js v5** Google sign-in restricted to two emails. `auth.ts` (root), route at
  `app/api/auth/[...nextauth]/route.ts`, route protection in `proxy.ts` (Next 16 uses
  `proxy.ts`, NOT `middleware.ts`). Verified: `/api/auth/providers` returns Google; `/`
  redirects (307) when logged out. The signIn callback enforces `ALLOWED_EMAILS`.
- **Seeded deck:** 100 cards, 155 words, 2 tags (`languages difficulties`,
  `numbers & amounts`), 110 audio clips in a PUBLIC Vercel Blob store. Source of truth
  `seed/deck.generated.json`; scripts in `scripts/` (`seed:generate`, `seed:audio`, `seed:db`).
- **Secrets:** all in `.env.local` (gitignored): `DATABASE_URL`, `AUTH_SECRET`,
  `AUTH_GOOGLE_ID/SECRET`, `ALLOWED_EMAILS`, `OPENAI_API_KEY` (seed-only),
  `BLOB_READ_WRITE_TOKEN` (seed-only). **Do NOT run `vercel env pull .env.local`** — it
  clobbers this file.
- **Git:** remote `origin` = https://github.com/k3v1n-S0m4ny/Language-Learning-Web-App
  (the `afk-9to5` remote was stale). **Nothing is committed yet** — the whole tree is
  uncommitted. Make an initial commit early (ask the user first; don't commit secrets —
  `.env*` is already gitignored).
- **Vercel:** project `language-learning-web-app` (scope `k3v1n-s0m4nys-projects`) is
  linked (`.vercel/` present). CLI 54.3.0, logged in as `k3v1n-s0m4ny`.

## 3. Data model you'll use (already migrated)
- `cards`(id uuid, headword, is_phrase, whole_gloss, whole_pinyin, whole_audio_url, created_at)
- `words`(id, card_id→cards, position, hanzi, gloss, pinyin, audio_url) — 1 row for single
  words, N ordered rows for phrases.
- `tags`(id, name unique), `card_tags`(card_id, tag_id).
- `review_states`(id, learner_id→user.id, card_id→cards, **due** timestamptz indexed,
  **fsrs_card** jsonb [the full ts-fsrs Card], last_review, created_at, updated_at;
  UNIQUE(learner_id, card_id)). This is per-Learner FSRS state.
- `review_logs`(id, learner_id, card_id, rating int, log jsonb, reviewed_at).
- `learner_settings`(learner_id pk, new_cards_per_day int default 10, request_retention real default 0.9).
- Auth.js tables: `user` (a Learner is a user row), `account`, `session`, `verificationToken`.

## 4. BUILD THIS — Milestone 4: the Review screen
The whole product is one study screen. Direction is **Chinese → English only**. Mobile-first,
Tailwind, online-only. Use `ts-fsrs` (already installed) for scheduling.

**Interaction (settled with the user):**
1. **Front:** show ONLY the Chinese `headword`. No audio, no pinyin.
2. **Reveal** (tap/click): show the **whole-phrase English gloss** + a **play button for
   the whole-phrase audio** (`whole_audio_url`).
3. Show the **row of words** (each word's Chinese + its own **play button** for `audio_url`).
   **Each word's English gloss is HIDDEN until you tap that specific word** (per-word
   individual reveal). For single-word cards there's effectively just the one word.
4. A **"Show pinyin"** button (hidden until pressed) reveals pinyin for the whole phrase
   AND per word (`whole_pinyin` / `words.pinyin`).
5. **FSRS grading:** Again / Hard / Good / Easy buttons. On grade, run ts-fsrs `next()`,
   persist the updated `fsrs_card` + `due` + `last_review` to `review_states`, append a
   `review_logs` row, advance to the next due card. Optionally show next-interval hints
   from `scheduler.repeat()` on the buttons.

**Scheduling logic (server side):**
- Identify the current Learner via `auth()` (the `user.id`).
- "Due today" = `review_states` rows for this learner with `due <= now()`, PLUS up to
  `new_cards_per_day` NEW cards (cards with no `review_states` row for this learner). New
  cards get `createEmptyCard()` state on first review.
- Use `fsrs({ request_retention })` from `learner_settings` (default 0.9 / 10 new/day; create
  a settings row lazily if missing).
- Implement as **server actions** (e.g. `getNextDueCard()`, `submitReview(cardId, rating)`)
  using `db` from `lib/db`. ts-fsrs `Rating` enum: Again/Hard/Good/Easy.
- Audio: plain `<audio>`/`new Audio(url)` against the public Blob URLs.
- Optional nice-to-have: filter the session by Tag; a tiny "X due / Y new" header; a
  "no cards due" empty state.

Replace the placeholder `app/page.tsx` (currently a protected "你好" landing) with the
review screen. Verify with `npm run dev` + the `webapp-testing`/Playwright skill if useful;
typecheck with `npx tsc --noEmit`.

## 5. THEN — Milestone 5: deploy
- Set the **Vercel function region to `iad1`** (us-east-1) to colocate with the DB.
- Ensure Vercel project env has the runtime vars: `AUTH_SECRET`, `AUTH_GOOGLE_ID`,
  `AUTH_GOOGLE_SECRET`, `ALLOWED_EMAILS` (DATABASE_URL is already injected by the Neon
  integration). OPENAI/BLOB tokens are seed-only and NOT needed at runtime (audio URLs are
  public and already stored).
- Add the **production redirect URI** to the Google OAuth client:
  `https://<prod-domain>/api/auth/callback/google`, and set the Google consent screen to
  **Internal** (same Workspace).
- Deploy via `vercel deploy --prod` (or push to GitHub if the user wants Git deploys — then
  set the production branch). Smoke-test sign-in on the deployed URL with both emails.

## 6. Gotchas (learned this build)
- Next 16 → `proxy.ts`, not `middleware.ts`.
- `drizzle.config.ts` and the seed scripts load `.env.local` via `dotenv`; seed scripts
  build their own Neon client AFTER `config()` (don't import `lib/db` before env is loaded).
- `seed:db` is idempotent **by headword** — editing a gloss in `seed/deck.generated.json`
  and re-running will NOT update an already-inserted card.
- `gpt-4o` was used for content gen, `gpt-4o-mini-tts` (voice **nova**) for audio.
- DB is in us-east-1 by the user's explicit choice (they're in Singapore but chose USA).

## 7. First actions for you
1. Read the files in §0. 2. Confirm the dev server runs and you can reach the seeded data.
3. Write/update `.claude/plans/active-plan.md` for the M4 work, then implement the Review UI.
4. Keep handoff docs current; ask the user before committing/deploying.

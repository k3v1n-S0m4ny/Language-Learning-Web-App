---
status: SUPERSEDED
updated: 2026-05-22
---

# Implementation Summary — Milestones 1–3

Date: 2026-05-22 · Author: Claude · Source plan: `.claude/plans/active-plan.md`

## Milestone 3 — Seed pipeline + starter deck — DONE

Source: user's `Reborn Chinese System - Sheet1.csv` (100 rows), copied to
`seed/reborn-chinese-system.csv`. All 100 rows kept as cards (per user — nothing dropped).

- `scripts/generate-deck.ts` — parses CSV, keeps the CSV English as whole gloss, uses
  OpenAI (`gpt-4o`, strict JSON schema) for pinyin + word segmentation + per-word
  gloss/pinyin. Tags: rows 1–57 `languages difficulties`, rows 58–100 `numbers & amounts`.
  Resumable (skips cached headwords). → `seed/deck.generated.json`.
- `scripts/normalize-numbers.ts` — collapses true numeric headwords to a single word
  (13 changed); leaves 数字与数量 / 基数 / 序数 as proper vocab. (User choice.)
- `scripts/generate-audio.ts` — OpenAI `gpt-4o-mini-tts`, voice **Nova**, mp3, slow/clear
  instructions. Dedupes by text, immutable hashed paths, reuses existing blobs. Uploaded
  **110 unique clips** to the public Vercel Blob store; wrote URLs back into the deck.
- `scripts/seed-db.ts` — idempotent-by-headword load into Neon (builds its own client
  after dotenv so DATABASE_URL is read).
- `scripts/deck-types.ts` — shared `DeckCard`/`DeckWord` shape.
- npm scripts: `seed:generate`, `seed:audio`, `seed:db`.
- **Verified in Neon** (`neon-cyan-forest`, us-east-1): 100 cards, 155 words, 2 tags,
  100 card_tags; every card + word has audio. Sample phrase 我会说一点。 fully correct
  (ordered words, pinyin, glosses, real Blob URLs). `npx tsc --noEmit` clean.

Note: `seed:db` is idempotent by headword — editing a gloss in the JSON and re-running
will NOT update an already-inserted card (would need an explicit update path). Fine for
the initial load.

---

# (Earlier) Implementation Summary — Milestones 1–2

## Milestone 2 — Authentication (Google + email allowlist) — DONE

- `auth.ts` — NextAuth v5 with `DrizzleAdapter` (our schema tables), Google provider,
  `signIn` callback enforcing the `ALLOWED_EMAILS` allowlist (trim + lowercase, handles
  the space in the value), and `authorized` callback for route protection.
- `app/api/auth/[...nextauth]/route.ts` — exports `GET`/`POST` handlers.
- `proxy.ts` — Next 16 session/route gate; matcher excludes `api/auth` + static; redirects
  unauthenticated visitors to sign-in.
- `app/page.tsx` — replaced the scaffold page with a real protected landing (server
  component): greets the signed-in Learner and offers sign-out via a server action.
- **Verified at runtime:** `/api/auth/providers` returns the Google OIDC config with
  callback `http://localhost:3000/api/auth/callback/google`; `GET /` returns **307**
  (redirect to sign-in) when unauthenticated. `npx tsc --noEmit` clean.
- **Not machine-testable here:** the live Google OAuth login (needs a real browser +
  Workspace account). User to confirm sign-in works for both allowlisted emails.
- **Project wiring:** git `origin` re-pointed to `Language-Learning-Web-App` (afk-9to5 was
  stale); repo linked to Vercel project `k3v1n-s0m4nys-projects/language-learning-web-app`;
  `package.json` name → `language-learning-web-app`. Neon DB migrated in `us-east-1`
  (kept in USA by choice; deploy functions to `iad1` to colocate).

Google consent screen should be **Internal** (same Workspace); the allowlist restricts to
the two specific people.

---

## Milestone 1 — Scaffold + Database — DONE

## Completed work

- **Next.js 16.2.6 scaffold** at repo root (TypeScript, Tailwind v4, ESLint, App
  Router, Turbopack, import alias `@/*`, no `src/` dir). React 19.2.4. Our pre-existing
  `CONTEXT.md`, `docs/`, `.claude/` were preserved (moved aside during scaffold, restored).
- **Dependencies installed (real, pinned):** `drizzle-orm@^0.45.2`,
  `@neondatabase/serverless@^1.1.0`, `@auth/drizzle-adapter@^1.11.2`,
  `next-auth@^5.0.0-beta.31`, `ts-fsrs@^5.4.0`; dev: `drizzle-kit@^0.31.10`,
  `dotenv@^17.4.2`, `tsx@^4.22.3`.
- **Neon Postgres provisioned** via MCP: project `i-hate-my-95` (org "Kevin",
  id `fancy-queen-56601380`), Postgres 17, db `neondb`. Real `DATABASE_URL` written to
  `.env.local` (gitignored via `.env*`).
- **Data layer written:**
  - `lib/db/schema.ts` — full real schema: Auth.js adapter tables (`user`, `account`,
    `session`, `verificationToken`) + domain (`cards`, `words`, `tags`, `card_tags`,
    `review_states`, `review_logs`, `learner_settings`).
  - `lib/db/index.ts` — Drizzle client over Neon HTTP driver.
  - `drizzle.config.ts` — loads `.env.local`, postgres dialect, migrations in `lib/db/migrations`.
- **Migration generated + applied + verified:** `lib/db/migrations/0000_gray_sandman.sql`
  (11 tables). Confirmed all 11 tables present in Neon via `information_schema` query.
- **package.json scripts:** `db:generate`, `db:migrate`, `db:push`, `db:studio`.

## Commands run (all exit 0)

| Command | Result |
|---|---|
| `node --version` / `npm --version` | v25.6.0 / 11.8.0 (≥ required) |
| `npx create-next-app@latest . --yes ...` | exit 1 — folder name has capitals (npm rule) |
| `npx create-next-app@latest scaffoldtmp ...` | success (359 pkgs) — then lifted to root |
| `npm install drizzle-orm @neondatabase/serverless @auth/drizzle-adapter next-auth@beta ts-fsrs` | success |
| `npm install -D drizzle-kit dotenv tsx` | success |
| `npm run db:generate` | success — 11 tables, migration file written |
| `npm run db:migrate` | success — migrations applied |
| `SELECT table_name ... information_schema` (Neon MCP) | 11 tables confirmed |
| `npx tsc --noEmit` | success — no type errors |

## Left undone (blocked on credentials — no stubs per rule)

- **Milestone 2 (Auth):** needs `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ALLOWED_EMAILS`.
  Not started so it can be built real and testable. `AUTH_SECRET` will be generated then.
- **Milestone 3 (Seed pipeline):** needs `OPENAI_API_KEY`, `BLOB_READ_WRITE_TOKEN`, and
  the starter content list.
- **Milestone 4 (Review UI)** and **5 (Deploy)** follow.

## Issues / deviations from plan

1. **FSRS state stored as `jsonb` (`fsrs_card`) + indexed `due` column**, rather than one
   column per FSRS field (plan §3). Deliberate: robust to ts-fsrs field changes, keeps the
   "due for learner" query fast. No functional loss.
2. **Neon region — RESOLVED.** The MCP `create_project` has no region param and defaulted to
   `us-east-2`. User is in Singapore, so the empty Ohio project was **deleted** and Neon will
   be reprovisioned in `ap-southeast-1` via the Vercel Marketplace (`vercel install neon`),
   which also wires `DATABASE_URL` into the Vercel project. The migration files in
   `lib/db/migrations/` are unchanged and valid — they just need re-running (`npm run db:migrate`)
   against the new DB once its `DATABASE_URL` is in `.env.local`. So as of now there is no live
   DB; schema is captured in code + migration and will recreate identically.
3. **`ts-fsrs@5.4.0`** — package major 5 implements FSRS algorithm v6; naming is expected.
4. Scaffolded with **no `src/` dir**; app code at root (`app/`, `lib/`, future `components/`,
   `scripts/`, `seed/`).

## Procedure compliance

- Plan written and approved before coding (active-plan.md). Decisions captured in
  `CONTEXT.md` + ADR 0001. Vendor docs cached in `docs/vendor-cache/`. No placeholders or
  stubs used. Stopped at the first credential-blocked milestone rather than faking it.

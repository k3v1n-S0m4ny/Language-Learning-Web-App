# Setup Prerequisites (before scaffolding)

Per the no-placeholders rule, every credential below must be real before the milestone
that uses it. Nothing is stubbed.

## A. Only you can do these (need your accounts / are interactive)

### 1. Google OAuth — for sign-in  (needed for the Auth milestone)
- Google Cloud Console → create/select a project.
- Configure the **OAuth consent screen** (External). Add **both your Gmail addresses**
  as **Test users** (while in Testing status, only test users can sign in).
- Create **OAuth 2.0 Client ID** (type: Web application).
- Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://<your-domain>/api/auth/callback/google` (after we know the prod URL)
- Hand me: **`AUTH_GOOGLE_ID`**, **`AUTH_GOOGLE_SECRET`**, and the **two emails**
  to allowlist (`ALLOWED_EMAILS`).

### 2. OpenAI API key — for seed-time audio + content  (needed for the Seed milestone)
- platform.openai.com → create an API key; ensure billing is enabled.
- Hand me: **`OPENAI_API_KEY`**. Used locally at seed time only — never deployed.

### 3. Vercel account + public Blob store — for audio hosting  (needed for Seed + Deploy)
- Have a Vercel account/team.
- Install + log in to the CLI (interactive — run it yourself):
  `npm i -g vercel` then `vercel login`.
- Create a **Blob** store, access mode **Public**, region closest to you both
  (region + access mode are permanent). This auto-creates **`BLOB_READ_WRITE_TOKEN`**.
- Hand me the token (or after `vercel link`, I can `vercel env pull`).

### 4. Deployment target  (needed for Deploy)
- Decide: connect this repo to Vercel via **Git integration** (needs a GitHub remote —
  the repo has none yet) OR deploy via **CLI**. Either needs your Vercel login.
- Optional: a **custom domain**.

### 5. Starter content  (needed for Seed)
- A first list of Chinese words/phrases (+ optional tags), OR approve me drafting an
  initial set for your review.

## B. I can do these (no action from you, with your OK)

- **Neon Postgres**: a Neon MCP is connected here — I can create the project and get
  **`DATABASE_URL`** directly. (Alternative: you provision Neon via the Vercel
  Marketplace `vercel install neon` so it's tied to your Vercel project.) **Pick one.**
- **`AUTH_SECRET`**: I generate via `npx auth secret`.
- All scaffolding, schema, migrations, seed scripts, UI, and wiring.

## C. Environment variables (final `.env.local`)

| Var | Who provides | Used where |
|-----|--------------|------------|
| `DATABASE_URL` | Me (Neon MCP) or you (Marketplace) | app + scripts |
| `AUTH_SECRET` | Me (`npx auth secret`) | app |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | You (Google) | app |
| `ALLOWED_EMAILS` | You (two emails) | app |
| `OPENAI_API_KEY` | You (OpenAI) | seed scripts only |
| `BLOB_READ_WRITE_TOKEN` | You (Vercel Blob) | seed scripts + app reads URLs |

## D. Build sequencing under the no-stub rule

| Milestone | Unblocked by |
|-----------|--------------|
| 1. Scaffold + DB schema/migrations | `DATABASE_URL` (I can provision Neon now) |
| 2. Auth (Google + allowlist) | `AUTH_GOOGLE_ID/SECRET` + `ALLOWED_EMAILS` |
| 3. Seed pipeline (content + audio) | `OPENAI_API_KEY` + `BLOB_READ_WRITE_TOKEN` + starter content |
| 4. Review UI | nothing extra (uses seeded data) |
| 5. Deploy | Vercel login (+ GitHub remote if Git integration) |

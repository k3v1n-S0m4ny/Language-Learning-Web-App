# Credentials Guide — how to obtain & save each value

All secrets go in **`.env.local`** at the repo root (already gitignored — never commit it).
Format: one per line, no spaces around `=`, e.g. `OPENAI_API_KEY="sk-..."`.

Already done: `AUTH_SECRET` (generated).

Still needed: `DATABASE_URL` (Singapore Neon), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
`ALLOWED_EMAILS`, `OPENAI_API_KEY`, `BLOB_READ_WRITE_TOKEN`.

> Note: the original Neon DB was created in us-east-2 (Ohio) and deleted, because you're
> in Singapore. We now provision Neon in **ap-southeast-1** via the Vercel Marketplace
> (step 0 below) so it's both close and wired into your Vercel project. The schema
> migration just needs to be re-run against the new DB (I'll do that).

---

## 0. Neon Postgres (Singapore) → `DATABASE_URL`

Do this together with the Vercel steps (section 3): after `vercel login` + `vercel link`,
run **`vercel install neon`** and choose region **Singapore (ap-southeast-1)**. This
provisions the database under your Vercel project and pulls `DATABASE_URL` automatically.
Alternatively create it in the Neon console (https://console.neon.tech) in ap-southeast-1
and copy the connection string into `.env.local` as:
```
DATABASE_URL="postgresql://...ap-southeast-1...neon.tech/neondb?sslmode=require"
```

---

## 1. Google sign-in → `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ALLOWED_EMAILS`

1. Go to **https://console.cloud.google.com** and sign in.
2. **Create a project**: top project selector → *New Project* → name it (e.g. "I Hate My 9-5")
   → *Create*, then select it.
3. **OAuth consent screen**: left menu → *APIs & Services* → *OAuth consent screen*.
   - User type: **External** → *Create*.
   - Fill App name, your support email, developer email → *Save and Continue*.
   - Scopes: leave defaults (email/profile/openid) → *Save and Continue*.
   - **Test users**: *Add Users* → enter **both your Gmail addresses** → *Save*.
     (While the app is in "Testing", only these users can sign in — this is the allowlist.)
4. **Create the OAuth client**: *APIs & Services* → *Credentials* → *Create Credentials*
   → *OAuth client ID*.
   - Application type: **Web application**. Name it (e.g. "i-hate-my-95 web").
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`
     *(we'll add the production `https://<domain>/api/auth/callback/google` at deploy time)*
   - *Create*. A dialog shows **Client ID** and **Client secret** — copy both.
5. **Save** in `.env.local`:
   ```
   AUTH_GOOGLE_ID="<the client id>"
   AUTH_GOOGLE_SECRET="<the client secret>"
   ALLOWED_EMAILS="you@gmail.com,her@gmail.com"
   ```

## 2. OpenAI (seed-time audio + content) → `OPENAI_API_KEY`

1. Go to **https://platform.openai.com** and sign in.
2. **Billing**: *Settings* → *Billing* → add a payment method / buy a little credit
   (TTS requires a paid account; our usage is a few cents).
3. **API key**: *API keys* (left menu) → *Create new secret key* → name it → *Create*.
   Copy it now — it's shown only once (starts with `sk-`).
4. **Save** in `.env.local`:
   ```
   OPENAI_API_KEY="sk-..."
   ```
   This is used only locally when we run the seed scripts — it never gets deployed.

## 3. Vercel Blob (audio hosting) → `BLOB_READ_WRITE_TOKEN`

1. **Install the CLI** (one time): in a terminal run `npm i -g vercel`.
2. **Log in** (interactive): in this chat type `! vercel login` so the output appears here,
   or run `vercel login` in your own terminal. Follow the browser prompt.
3. **Link the project**: from the repo folder run `vercel link` → choose your scope/team →
   create or link a project (name it `i-hate-my-95`).
4. **Create the Blob store**: open the project on **https://vercel.com** →
   *Storage* tab → *Create Database* → **Blob** → set **Access: Public** → name it
   (e.g. `audio`) → pick a **region near you** (this is permanent) → *Create*.
   Vercel auto-adds `BLOB_READ_WRITE_TOKEN` to the project.
5. **Get the token value**: on the Blob store page, open the **`.env.local` / Quickstart**
   section and reveal `BLOB_READ_WRITE_TOKEN` → copy it.
6. **Save** in `.env.local`:
   ```
   BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
   ```
   > Tip: do NOT run `vercel env pull .env.local` yet — it would overwrite our local file
   > (DATABASE_URL / AUTH_SECRET aren't in Vercel yet). Copy the token by hand for now.

---

## When you're done

`.env.local` should contain real values for: `DATABASE_URL`, `AUTH_SECRET`,
`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ALLOWED_EMAILS`, `OPENAI_API_KEY`,
`BLOB_READ_WRITE_TOKEN`. Tell me and I'll resume with Auth → Seed → Review UI → Deploy.
(Also: confirm the Neon region — keep us-east-2 or recreate closer.)

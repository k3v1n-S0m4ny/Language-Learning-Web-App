---
source: https://authjs.dev/getting-started/installation
fetched: 2026-05-21
why_cached: Auth for two learners via Google sign-in with email allowlist
---

# Auth.js (NextAuth v5) + Next.js App Router (cached summary)

## Install + secret

```bash
npm install next-auth@beta
npx auth secret   # writes AUTH_SECRET to .env.local
```

## Config — `./auth.ts` at project root

```ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  callbacks: {
    // Restrict the whole app to our two emails:
    async signIn({ profile }) {
      const allow = (process.env.ALLOWED_EMAILS ?? "").split(",");
      return !!profile?.email && allow.includes(profile.email);
    },
  },
});
```

## Route handler — `./app/api/auth/[...nextauth]/route.ts`

```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

## Session keep-alive

- Next.js 16+: `./proxy.ts` → `export { auth as proxy } from "@/auth"`.
- Older: `./middleware.ts` → `export { auth as middleware } from "@/auth"`.

## Env vars

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (from Google Cloud OAuth client)
- `ALLOWED_EMAILS` (our custom allowlist, comma-separated)

## Drizzle adapter (for DB-backed users/sessions)

```bash
npm install @auth/drizzle-adapter
```

```ts
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
// ...
NextAuth({ adapter: DrizzleAdapter(db), providers: [Google], callbacks: { signIn } });
```

Requires four Postgres tables: `user`, `account` (compound PK provider+providerAccountId),
`session` (only for DB session strategy), `verificationToken` (only for magic links —
we can omit since we use Google OAuth). A Learner == a row in `user`.

## Google provider redirect URIs (set in Google Cloud Console)

- Prod: `https://<domain>/api/auth/callback/google`
- Dev:  `http://localhost:3000/api/auth/callback/google`

Google only issues a refresh token on first sign-in; add `authorization: { params: {
prompt: "consent" } }` if we ever need to force it. The OAuth consent screen must be
configured in Google Cloud; while in "Testing" status, only listed test users (our two
emails) can sign in — which doubles as our allowlist.

## Next 16 note

Session keep-alive lives in **`proxy.ts`** (`export { auth as proxy } from "@/auth"`),
not `middleware.ts`. See `nextjs-setup.md`.

## Notes

The `signIn` callback allowlist (`ALLOWED_EMAILS`) is what makes this a private
two-person app, enforced in addition to Google's test-user list.

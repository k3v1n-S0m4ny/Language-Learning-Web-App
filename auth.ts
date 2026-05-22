import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/lib/db/schema";

// The two learners, from ALLOWED_EMAILS (comma-separated). Trimmed + lowercased
// so "a@x.com, b@x.com" works. Even with a Google "Internal" app, this allowlist
// is what restricts sign-in to exactly these two people within the Workspace.
const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // Auth.js only auto-trusts the request host in dev. `next start` and self-hosted
  // deploys need this explicitly; Vercel sets it via env, but being explicit is safe.
  trustHost: true,
  providers: [Google],
  callbacks: {
    signIn({ user, profile }) {
      const email = (user?.email ?? profile?.email ?? "").toLowerCase();
      return allowedEmails.includes(email);
    },
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
});

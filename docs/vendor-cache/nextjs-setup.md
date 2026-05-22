---
source: https://nextjs.org/docs/app/getting-started/installation
fetched: 2026-05-21
last_updated_upstream: 2026-05-19 (Next.js 16.2.6)
why_cached: Scaffolding the app correctly in one go
---

# Next.js setup (cached summary)

- **Current version: 16.2.6.** Minimum Node.js **20.9**.
- Scaffold (one-shot, no prompts):

  ```bash
  npx create-next-app@latest <name> --yes
  ```

  `--yes` enables the recommended defaults: **TypeScript, ESLint, Tailwind CSS,
  App Router, Turbopack**, import alias `@/*`, and generates `AGENTS.md` +
  `CLAUDE.md` for coding agents. (Tailwind comes pre-wired — no manual setup.)

- **Turbopack is the default bundler** (`next dev`, `next build`). Use `--webpack` to opt out.
- Next.js 16: `next build` no longer runs the linter; lint via npm scripts.
- Scripts: `next dev` / `next build` / `next start` / `eslint`.

## IMPORTANT for Auth.js on Next 16

The Auth.js session keep-alive file is **`proxy.ts`** on Next.js 16+
(`export { auth as proxy } from "@/auth"`), NOT `middleware.ts` (that was pre-16).

## Default project shape (with --yes)

`app/` (App Router), `src/`-less by default unless customized, `tsconfig.json` with
`@/*` alias, Tailwind configured, ESLint flat config. We'll keep this layout and add
`lib/` (db, auth), `components/`, `scripts/`, `seed/`.

---
name: project-start-commands
description: Working commands to start and build the Language Learning App locally
metadata:
  type: project
---

- `npm run dev` — starts dev server on port 3000, ready in ~1.4s (Turbopack). Confirmed working 2026-05-23.
- `npm run build` — production build, exit 0 in ~7s. `/stats` is Dynamic, `/` is Dynamic.
- `npx tsc --noEmit` — type check only, exit 0.
- `npx eslint .` — lint, exit 0.
- All env vars (DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET) are in `.env.local`.

**Why:** Needed to run QA checks on M6 stats view.
**How to apply:** Use these commands at the start of any QA session to verify build health.

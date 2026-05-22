---
source: https://vercel.com/docs/storage
fetched: 2026-05-21
last_updated_upstream: 2026-02-27
why_cached: Choosing the database + storage stack on Vercel
---

# Vercel Storage options (cached summary)

Vercel's first-party storage products:

- **Vercel Blob** — large file storage (see `vercel-blob.md`).
- **Vercel Edge Config** — global ultra-low-latency read store (<1ms typical) for
  rarely-changing config / feature flags. Writes take seconds. Not a general DB.
- **Vercel Marketplace** — provision third-party databases (Postgres, KV/Redis,
  NoSQL, vector) from providers like **Neon**, Upstash, Supabase. Vercel injects
  credentials as env vars automatically.

> Note: first-party Vercel Postgres and Vercel KV are deprecated. For Postgres now,
> provision a Marketplace database (Neon is the default Postgres provider).

## Provisioning via CLI

```bash
vercel install neon      # Postgres (Neon) — connects to project, pulls creds to .env.local
vercel install upstash   # Redis/KV
vercel install supabase  # Postgres + auth + storage
```

## Best practices

- Put the database in a region close to your Functions.
- Cache read-heavy responses on the CDN with cache headers / ISR.

## Fit for this project

Relational data (Learners, Cards, Words, Review State, Audio Clip refs) with ACID +
foreign keys → **Postgres via Neon (Marketplace)**. Audio bytes → **Vercel Blob**.
A Neon MCP server is already connected in this environment, so we can provision and
run SQL against Neon directly.

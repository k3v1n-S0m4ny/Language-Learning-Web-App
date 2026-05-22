# Vendor Documentation Cache

Cached copies of external/vendor documentation for every tech stack this project
depends on. We cache so decisions are grounded in real docs and survive offline.

## Naming convention (keep consistent for retrieval)

`<vendor>-<topic>.md` — all lowercase, kebab-case.
Examples: `vercel-blob.md`, `vercel-storage.md`, `openai-tts.md`, `neon-postgres.md`.

## Required frontmatter

Every cached doc starts with:

```
---
source: <canonical URL>
fetched: <YYYY-MM-DD>
last_updated_upstream: <date from the doc, if available>
why_cached: <one line: which decision this supports>
---
```

## Index

| File | Topic | Supports decision |
| --- | --- | --- |
| `vercel-blob.md` | Vercel Blob object storage | Where audio clips are stored |
| `vercel-storage.md` | Vercel storage options overview | Database + storage stack choice |
| `openai-tts.md` | OpenAI text-to-speech (gpt-4o-mini-tts) | TTS model + voice for audio clips |
| `drizzle-neon.md` | Drizzle ORM + Neon connection | ORM/query layer |
| `authjs-nextjs.md` | Auth.js (NextAuth v5) + App Router | Google sign-in with email allowlist |
| `ts-fsrs.md` | ts-fsrs FSRS v6 scheduler | Spaced-repetition scheduling |
| `neon-serverless-driver.md` | Neon serverless driver | App ↔ Postgres connectivity |
| `nextjs-setup.md` | Next.js 16 scaffolding | One-shot project scaffold |

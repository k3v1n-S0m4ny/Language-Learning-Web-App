---
source: https://orm.drizzle.team/docs/connect-neon
fetched: 2026-05-21
why_cached: ORM/query layer over Neon Postgres
---

# Drizzle ORM + Neon (cached summary)

## Install

```bash
npm i drizzle-orm @neondatabase/serverless
npm i -D drizzle-kit
```

## Driver choice

- **neon-http** — fastest for single, non-interactive (one-shot) queries. Default for
  our app's read/write request handlers.
- **neon-serverless** (WebSocket) — needed for interactive/session transactions.
- Use `drizzle-orm/neon-http` unless we need multi-statement interactive transactions.

## Connect (HTTP)

```ts
import { drizzle } from 'drizzle-orm/neon-http';
const db = drizzle(process.env.DATABASE_URL!);
```

## Schema + migrations (drizzle-kit)

- Define tables in a schema file (pgTable, columns, relations).
- `drizzle-kit generate` → create migration SQL from schema.
- `drizzle-kit migrate` → apply migrations.
- `drizzle-kit push` → push schema directly (handy in dev).
- Configure via `drizzle.config.ts` (dialect: 'postgresql', connection string).

## Note

The Neon MCP in this environment can run SQL / manage migrations directly, useful for
provisioning and seeding alongside drizzle-kit.

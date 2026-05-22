---
source: https://neon.com/docs/serverless/serverless-driver
fetched: 2026-05-21
why_cached: How the app talks to Neon Postgres from Vercel functions
---

# Neon serverless driver (cached summary)

Package: `@neondatabase/serverless`. Low-latency Postgres from serverless/edge over
HTTP or WebSockets (no raw TCP). TypeScript types included.

## HTTP vs WebSocket

- **HTTP** (`neon()`): fastest for single one-shot queries; supports multiple queries
  in one transaction; uses `fetch`; 64 MB max request/response. → our default.
- **WebSocket** (`Pool`/`Client`): needed for interactive/session transactions;
  `pg`-compatible. In serverless, must be created, used, and closed within one request.

## Basic usage

```ts
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`SELECT * FROM cards WHERE id = ${id}`;
```

## With Drizzle (our setup)

```ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);
```

## Vercel/serverless note

Pool/Client objects cannot outlive a single request handler. HTTP `neon()` is
stateless and fits Vercel Functions cleanly.

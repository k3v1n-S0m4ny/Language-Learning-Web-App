---
source: https://vercel.com/docs/vercel-blob
fetched: 2026-05-21
last_updated_upstream: 2026-02-19
why_cached: Deciding where pre-generated pronunciation audio clips are stored
---

# Vercel Blob (cached summary)

Object storage for files of any size, backed by Amazon S3 (11 nines durability,
99.99% availability). SDK: `@vercel/blob` (`put`, `get`, `head`, `list`, `copy`,
`del`). One or more stores per account; a store can connect to many projects.

## Access modes (chosen at store creation, NOT changeable later)

- **Public**: anyone with the URL reads it; browser hits the CDN directly. Best for
  large media / public assets. → Fits our pronunciation clips (not sensitive).
- **Private**: read requires auth token; delivered through your Functions via `get()`.
  Best for sensitive/user content.

> Region is also fixed at creation and cannot be changed.

## Caching / immutability

- CDN caches all blobs up to **1 month** by default; tune with `cacheControlMaxAge`.
- Best practice: **treat blobs as immutable** — new pathname per new content, or
  `addRandomSuffix: true`. Our clips never change after generation → ideal immutable case.
- Overwriting same pathname errors unless `allowOverwrite: true`; propagation ~60s.

## Upload (server-side, what our seed script will do)

```js
import { put } from '@vercel/blob';
const blob = await put('audio/<card>/<word>.mp3', mp3Buffer, { access: 'public' });
// blob.url -> store this in Postgres
```

## Pricing-relevant notes

- Billed on storage (GB-month, sampled every 15 min and averaged), data transfer
  (downloads only; ~3x cheaper than Fast Data Transfer for media), and operations.
- Cache HIT on a public URL is NOT a billed "simple operation"; cache MISS is.
- Uploads: client uploads have no transfer charge; server uploads incur Fast Data
  Transfer on receipt. Deletes are free (billing-wise).
- Multipart recommended only for files > 100 MB (not relevant — clips are tiny).

## Server upload / token (how the seed script writes clips)

- Creating a Blob store in a Vercel project auto-adds **`BLOB_READ_WRITE_TOKEN`** to
  that project's env. Pull locally with `vercel env pull`.
- Store creation: dashboard → Storage → Create Database → Blob → choose **Public** →
  name it → pick environments. (Or via Vercel CLI.) Access mode is permanent.
- `put()` reads `BLOB_READ_WRITE_TOKEN` from env automatically on the server.
- Vercel Functions have a **4.5 MB request body limit** — irrelevant here (clips are
  tiny; the seed script runs locally, not through a Function).

## Fit for this project

Pre-generated, immutable, small MP3s served on tap → **public store, long cache,
immutable pathnames**. Store `blob.url` + metadata in Postgres. DB stays small.

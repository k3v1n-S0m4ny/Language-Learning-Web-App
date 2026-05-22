# 1. Neon Postgres for data, public Vercel Blob for audio

- Status: Accepted (2026-05-21)
- Deciders: Kevin + Claude

## Context

The app stores two very different kinds of data:

1. **Relational data** — Learners, the shared Card Library, per-Word breakdowns, and
   per-Learner Review State (FSRS scheduling). This needs ACID transactions, foreign
   keys, and queries like "cards due for Learner X".
2. **Audio clips** — pronunciation MP3s, one per Word and one per whole Phrase,
   generated once by OpenAI at seed time and never changed afterward.

The initial instinct was to store everything (including audio bytes) in one database.
Vercel's first-party Postgres/KV are deprecated; Postgres now comes via the Vercel
Marketplace (Neon is the default). A Neon MCP server is already connected to this
environment. Blob store access mode (public/private) and region are permanent once
the store is created, so the choice must be made up front.

## Decision

We WILL use **Neon Postgres** (provisioned through the Vercel Marketplace) for all
relational data, and a **public Vercel Blob store** for audio clips. Postgres stores
each clip's Blob URL + metadata, not the bytes.

Audio is treated as **immutable**: each clip is written once to a stable pathname and
served directly from the Blob CDN with a long cache lifetime.

## Consequences

- Audio plays instantly from the edge CDN; a cache HIT on a public URL is not a billed
  operation. The database stays small, so backups/restores are fast and cheap.
- Audio bytes are not inside the DB, so a DB backup alone does not capture audio — the
  Blob store is a second thing to preserve. The seed pipeline can regenerate clips if
  ever lost, which mitigates this.
- A **public** Blob store means clip URLs are unguessable but publicly readable if
  shared. Acceptable: the content is generic Mandarin pronunciation, not sensitive.
- Access mode and region are locked in. Reversing to private (or to bytea-in-Postgres)
  later means re-uploading every clip and rewriting playback code.

## Compliance

- Audio bytes never stored in a Postgres column; only URLs/metadata. (Schema review.)
- Blob writes use immutable pathnames (no `allowOverwrite` in the seed pipeline).

## Notes

Grounded in cached docs: `docs/vendor-cache/vercel-blob.md`,
`docs/vendor-cache/vercel-storage.md` (fetched 2026-05-21).

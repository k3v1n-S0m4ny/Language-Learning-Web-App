---
name: since-timestamp-session-live-recompute
description: for since-timestamp session-tracking patterns (searchParam marks session start, lastReview >= since = "practiced this session"), check whether header counts/completion copy are snapshotted or live-recomputed
metadata:
  type: feedback
---

A `?since=<epoch>` session-tracking design (server-driven, no session storage — "practiced this session" = `lastReview >= since`) is clean for picking the next card, but any header counts or completion-screen copy derived from the same live query (e.g. "you practiced all N cards") can silently drift if a NEW row enters the pool mid-session from a sibling flow, because that row's `lastReview` is stamped `now` (>= `since`) on creation and is immediately counted as "practiced" without ever having been served by the session that's about to claim credit for it.

**Why:** found in Advanced Thai's cross-theme practice-by-kind feature (`lib/advanced-thai/queries.ts` `getAdvancedPracticeData`, 2026-07-17) — `poolSize`/`remaining`/`repeatCount` are recomputed fresh on every render rather than snapshotted at `since`-mint time. A card newly introduced via the sibling per-theme flow during an open practice session inflates `poolSize` and gets marked "practiced" it was never actually served in this session. LOW severity here (owner-only course, low concurrency), but the pattern generalizes.

**How to apply:** when reviewing a `since`/session-marker design, explicitly check (a) whether counts are computed once at session start or recomputed live on every request, and (b) whether a sibling code path can insert/update a row that satisfies the "practiced this session" predicate without that row ever having passed through the session's own serving logic. Flag if completion/summary copy implies "served by this session" but the underlying predicate can be satisfied by any write with a fresh-enough timestamp, not just this route's own action.

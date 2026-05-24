---
status: COMPLETE
updated: 2026-05-23
---

# Handoff: Seed CSV Rebuild + Deck Re-tag (Steps 1-3)
Agent: implementer | Date: 2026-05-23 | Status: COMPLETE

## Completed

- **`seed/reborn-chinese-system.csv`** — Overwritten with cleaned output. 206 rows total.
  All 4 classifier glosses fixed (张, 条, 只, 座). Section headers retained as ordinary rows.
  Stray `["77",""]` row dropped (no CJK character). 27 trailing empty rows dropped.
  Fields containing commas are RFC-4180 double-quoted. No header line.

- **`scripts/generate-deck.ts`** — Removed `LANGUAGE_ROW_CUTOFF`, `TAG_LANGUAGE`, `TAG_NUMBERS`
  and the old row-index ternary. Replaced with `SECTION_TAGS` map + `DEFAULT_TAG` constant and a
  `currentTag` variable that updates on encountering a section-header headword. JSDoc comment block
  updated to describe the new section-header-driven tagging scheme. All other logic (OpenAI call,
  resume/skip, incremental write) left unchanged.

- **`seed/deck.generated.json`** — Pruned from 100 cards to **59 retained**, **41 dropped**.
  Each retained card's `tags` array re-set to the section-derived tag.
  - Distinct tags among retained: `["numbers & amounts", "languages difficulties"]`
  - `"time & dates"` and `"money"` do not appear in retained because no cards for those
    sections had been generated yet (they are new rows in the expanded CSV).
  - Dropped headwords include: individual vocabulary words (你, 会, 说…) and the
    tongue-twister 四十四只石狮子是死的。 and component words (石, 狮子, 死, 歪, 外交官, 胶管, 四十四).

- **`scripts/build-seed-csv.mjs`** — One-shot Node ESM build script (Step 1). Not required
  to be committed; the deliverable is the CSV. Kept in repo for auditability.

- **`scripts/prune-retag-deck.mjs`** — One-shot Node ESM prune/re-tag script (Step 3). Same
  section-tag logic as generate-deck.ts.

## Left Undone

- Steps 4+ of the seed pipeline (OpenAI generation for new rows, audio generation, DB seeding)
  are intentionally left to the orchestrator per task instructions.
- The two helper scripts (`build-seed-csv.mjs`, `prune-retag-deck.mjs`) were not committed —
  commit decision deferred to orchestrator.

## Commands Run

- `node scripts/build-seed-csv.mjs` — exit 0; output: `Total rows written: 206`, all 4 fixed rows confirmed
- `node scripts/prune-retag-deck.mjs` — exit 0; output: `Retained: 59`, `Dropped: 41`, distinct tags `["numbers & amounts","languages difficulties"]`

## Issues Discovered

- `csv-stringify` is listed in the task spec as an available dependency but is **not installed**
  (`node_modules/csv-stringify` does not exist and it is absent from `package.json`).
  Resolved by implementing a minimal inline `csvField()` + `csvRow()` helper that applies
  RFC-4180 quoting — functionally equivalent to `csv-stringify/sync` with default settings.

- The existing `seed/reborn-chinese-system.csv` was the old single-word-only version (57 rows),
  not the phrase-and-section version. It was replaced by the Step 1 script as intended.

- The 59 retained cards contain only `"numbers & amounts"` and `"languages difficulties"` tags.
  `"time & dates"` and `"money"` will appear after the next `seed:generate` run processes the
  new CSV rows for those sections.

## Spec Deviations

- **csv-stringify not used**: replaced with a 4-line inline quoting helper since the package
  is not installed. The output is identical RFC-4180 CSV.
- **Retained count 59 vs expected 59**: exact match.
- **Dropped count 41 vs expected ~41-42**: 41 exactly, within spec range.
- **CSV row count 206 vs expected ~206**: exact match.
- Inline comments in generate-deck.ts follow "explain why, not what" style per project rules.

## Procedure Compliance

- Plan consulted before coding: yes
- Tests run before finishing: yes (both node scripts exit 0)
- Handoff written: yes

---

# Orchestrator addendum: Steps 4-5 (pipeline run + DB reconcile)

Agent: orchestrator (main) | Date: 2026-05-23

## Completed

- **`npm run seed:generate`** (exit 0) — 145 new headwords enriched via OpenAI, 59 cached skipped.
  Final deck: 204 cards (206 CSV rows − 2 duplicate headwords in the sheet, e.g. 昨天晚上).
  Tag distribution: numbers & amounts 82, time & dates 75, money 32, languages difficulties 15.
- **只 gloss/tag reconcile** — 只 was the single retained headword whose meaning changed (old
  single-word "(measure word for animals)" → new classifier "nondescript animals (dogs, birds)",
  tag languages difficulties → numbers & amounts). Because generate/seed skip cached headwords, 只
  was removed from `deck.generated.json` and regenerated, then synced into the DB in place (Step 5).
- **`npm run seed:audio`** (exit 0) — 327 unique clips (230 generated, 97 reused). Every card has
  `wholeAudioUrl` and every word has `audioUrl` (verified 0 missing).
- **`npm run seed:db`** (exit 0) — 145 new cards inserted, 59 already present.
- **`scripts/refresh-seed-db.ts`** (new, committed — mirrors the existing `migrate-retention.ts`
  one-off pattern) — deletes cards no longer in the deck (FK cascade removes words/card_tags/
  review_states/review_logs) and re-syncs any retained card whose generated content drifted.
  Run output: `41 deleted, 1 re-synced` (the 40 single-words + tongue-twister; 只 re-synced).

## Verification (all PASS)

- DB cards = 204 = deck cards; symmetric set diff empty (no card in DB-not-deck or deck-not-DB).
- Dropped headwords absent (你, 会, 说, 四十四只石狮子是死的。); new present (金钱, 星期一, 人民币, 第一, 只).
- Tag counts via card_tags join: languages difficulties 15, money 32, numbers & amounts 82,
  time & dates 75 (= 204).
- 只 in DB: gloss "nondescript animals (dogs, birds)", tag numbers & amounts.
- 0 orphan `words`, 0 orphan `review_states` after the cascade delete.
- `npx tsc --noEmit` clean.

## Commands Run

- `npm run seed:generate` → exit 0 | `npm run seed:audio` → exit 0 | `npm run seed:db` → exit 0
- `npx tsx scripts/refresh-seed-db.ts` → exit 0 (`41 deleted, 1 re-synced`)
- `npx tsc --noEmit` → exit 0

## Notes

- The implementer's two one-shot ESM helpers (`scripts/build-seed-csv.mjs`,
  `scripts/prune-retag-deck.mjs`) were removed after the artifacts they produce (CSV + deck JSON)
  were committed; they will not be re-run. `refresh-seed-db.ts` is retained as the migration record
  (mirrors `migrate-retention.ts`).
- Post-QA: the seed CSV was deduplicated (dropped the 2 same-headword/different-gloss rows
  请给我一些 and 昨天晚上, keeping the first occurrence as the deck/DB already do) → 204 rows,
  exact headword match with the deck.
- Step 5 irreversibly removed FSRS history for the 41 dropped cards (explicitly approved).

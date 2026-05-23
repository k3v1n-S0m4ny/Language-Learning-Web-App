---
status: COMPLETE
updated: 2026-05-23
---

# Review Summary — Seed Data Refresh (Reborn Chinese System deck)

## Result
PASS

## Files Reviewed
- `scripts/generate-deck.ts`
- `scripts/refresh-seed-db.ts`
- `scripts/build-seed-csv.mjs`
- `scripts/prune-retag-deck.mjs`
- `seed/reborn-chinese-system.csv`
- `seed/deck.generated.json`
- `lib/db/schema.ts` (cascade verification)
- `scripts/deck-types.ts`
- `scripts/seed-db.ts` (idempotency context)

## Findings

### CRITICAL
None.

### HIGH
None.

### MEDIUM

- **`scripts/refresh-seed-db.ts`:69-73** — Drift detection covers only card-level fields
  (`wholeGloss`, `wholePinyin`, `isPhrase`, `wholeAudioUrl`). Word-level fields
  (`words[].gloss`, `words[].pinyin`, `words[].audioUrl`) are not compared. If a retained
  card's word breakdown changes in the deck but none of its card-level fields change, the
  re-sync will not fire and the words table stays stale. The script comment says "re-syncs
  any retained card whose generated content drifted" without qualifying this exclusion.
  For this specific run the gap had no impact (只's card-level wholeGloss changed, so drift
  was detected correctly). Risk is latent for a future refresh where only word-level content
  is regenerated.
  - Fix direction: either add a words comparison pass, or narrow the JSDoc to "card-level drift only".

### LOW

- **`scripts/refresh-seed-db.ts`:38-41** — The SELECT that feeds `doomed` uses
  `notInArray(schema.cards.headword, keep)` with no guard for an empty `keep` array. Postgres
  rejects `WHERE col NOT IN ()` as invalid SQL; Drizzle would surface this as a runtime
  exception. The `if (doomed.length)` guard below protects the DELETE but not this SELECT.
  The script is documented as "safe to re-run", which is only true when the deck file is
  non-empty. Practical risk is near-zero against a 204-card deck; a mis-run against a
  truncated or empty deck file would throw.
  - Fix direction: add `if (!keep.length) { console.log('[delete] deck is empty — aborting'); return; }` before the SELECT.

- **`scripts/build-seed-csv.mjs`:14-16** — Source path is hard-coded to
  `C:\Users\User\Downloads\Reborn Chinese System - Sheet1 (1).csv`. This is acceptable for a
  one-shot helper, but anyone re-running this script on a different machine or after the
  Downloads file is removed will get an opaque ENOENT. Since the script is kept for
  auditability, a comment noting the dependency on that path would prevent confusion.

## Assertions Checked

**A1 — CSV shape (206 rows, no empty-Chinese, no 77 row, section headers present, 4 classifier glosses correct):**
PASS.
- Line count: 207 lines / 206 non-empty (confirmed via `node`).
- No empty-Chinese rows: grep for `^,` and `^$` returns zero matches.
- No `77` row: grep for `^77,` and `^"77",` returns zero matches. `build-seed-csv.mjs` also
  strips non-CJK col-0 values via `/[一-鿿]/` which correctly excludes the ASCII string "77".
- Section headers at CSV lines 16, 99, 175 (数字与数量, 时间与日期, 金钱).
- All 4 classifier glosses present with full parenthetical lists:
  - 张 → "flat things (tickets, paper, tables)"
  - 条 → "long things (fish, ribbons, roads)"
  - 只 → "nondescript animals (dogs, birds)"
  - 座 → "big things (mountains, buildings)"
- Embedded-quote row: `"怎么写""熊猫""？",How do you write 'panda'?` — correctly
  RFC-4180 double-quoted. Round-trip parse via csv-parse with `relax_quotes: true` returns
  `怎么写"熊猫"？` as col-0 (confirmed by inline node execution).

**A2 — Tagging: section-header-derived tags, no LANGUAGE_ROW_CUTOFF:**
PASS.
- No `LANGUAGE_ROW_CUTOFF`, `TAG_LANGUAGE`, or `TAG_NUMBERS` in `generate-deck.ts`
  (full-text inspection).
- `SECTION_TAGS` map and `DEFAULT_TAG` constant are present.
- Critical ordering: `currentTag` is updated at lines 136-138 before the `byHeadword.has()`
  cache check at line 141. This means `currentTag` advances even when the section-header
  row itself is cached — subsequent new rows in that section receive the correct tag.
- Section-header rows are cards in the deck (confirmed in JSON); they are cached on a re-run
  and skipped, but `currentTag` is correctly updated before the skip.
- `prune-retag-deck.mjs` mirrors the same `SECTION_TAGS` / `DEFAULT_TAG` / `currentTag`
  pattern; tag derivation is consistent between the two scripts.

**A3 — Deck JSON: 204 cards, 4 distinct tags, no old-only headwords, 只 correct:**
PASS.
- Card count: 204 (confirmed via `node`).
- Distinct tags: `["languages difficulties", "numbers & amounts", "time & dates", "money"]`.
- Tag distribution: languages difficulties 15, numbers & amounts 82, time & dates 75,
  money 32 (total = 204). Matches orchestrator verification.
- No cards missing required fields (headword, wholeGloss, wholePinyin, tags).
- 只 entry: `wholeGloss: "nondescript animals (dogs, birds)"`, `tags: ["numbers & amounts"]`,
  `wholePinyin: "zhī"`, single-word breakdown — all correct.
- Section-header headwords (数字与数量, 时间与日期, 金钱) are present in the deck as cards.

**A4 — DB cascade safety:**
PASS (verified by schema inspection).
- `words.cardId` → `cards.id` with `{ onDelete: "cascade" }` (schema.ts:92).
- `cardTags.cardId` → `cards.id` with `{ onDelete: "cascade" }` (schema.ts:110).
- `reviewStates.cardId` → `cards.id` with `{ onDelete: "cascade" }` (schema.ts:133).
- `reviewLogs.cardId` → `cards.id` with `{ onDelete: "cascade" }` (schema.ts:159).
- All four required cascades declared. `refresh-seed-db.ts` deletes `cards` rows by UUID;
  the FK cascades will fire on all child tables automatically.
- The two-step delete (SELECT doomed → DELETE by id) is correct. Selecting by id avoids any
  race condition from the headword column's lack of a UNIQUE constraint.

**A5 — TypeScript build clean:**
PASS — orchestrator reports `npx tsc --noEmit` → exit 0.

## Commands Run

- `node -e` (inline): CSV line count → 207 lines / 206 non-empty
- `node -e` (inline): deck card count, 只 entry, distinct tags, tag distribution,
  missing-field check, section-header presence in deck
- `node -e` (inline): duplicate headwords in deck → none
- `node -e` (via bash): RFC-4180 embedded-quote row round-trip parse → correct
- `grep`: 77-row scan, empty-line scan, section-header locations, classifier rows,
  熊猫 row — all matched expectations

## Residual Risk

1. **Word-level drift not detected (MEDIUM above).** For this refresh, zero impact. Latent
   for future re-runs where only word-level content changes.

2. **notInArray empty-array guard missing (LOW above).** Zero risk against the current
   204-card deck. Only dangerous if the script is invoked after the deck file is wiped.

3. **昨天晚上 duplicate in CSV (data, not code).** Two rows (lines 153 and 159) with the
   same headword but different English glosses. The generated card uses the first
   occurrence's English ("last night"); the second's English ("yesterday evening (after
   dinner)") is silently lost. This is a source-sheet authoring issue. The behavior is
   consistent with how `generate-deck.ts` handles any duplicate headword (Map overwrites
   on re-encounter, but the card was already cached from the first encounter). One card
   is in the deck; no data corruption occurs.

4. **build-seed-csv.mjs hard-coded path (LOW above).** Zero operational risk since the
   CSV deliverable is already committed. Risk is only to anyone re-running the helper.

## Procedure Compliance
- Plan (`active-plan.md`) consulted before review: yes
- Implementation summary (`implementation-summary.md`) read before review: yes (including orchestrator addendum)
- All changed and related source files read in full: yes
- No source files modified during review: yes
- Review summary written: yes

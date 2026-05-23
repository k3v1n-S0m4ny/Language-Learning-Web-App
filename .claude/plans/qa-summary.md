---
status: COMPLETE
updated: 2026-05-23
---

# QA Summary — Seed Data Refresh (Reborn Chinese deck)

## Prior Summaries Read Before Validating
- `active-plan.md` (Validation Contract, 5 assertions): YES — read in full before any assertion tested.
- `implementation-summary.md` (Steps 1-3 + orchestrator addendum Steps 4-5): YES — read in full.
- `review-summary.md` (verdict PASS; MEDIUM word-level drift + LOW empty-keep guard — both noted as already fixed post-review): YES — read in full.

## Result
**PASS** — all 5 assertions hold. No blocking defects found. Build is clean. Dev server responds 200.

---

## Assertions

### A1 — PASS
**CSV: ~206 rows, no empty-Chinese rows, no 77 row, section headers present, 4 classifier glosses with full parenthetical lists.**

Evidence (node -e probe, exit 0):
- Non-empty line count: **206** (exact match to spec "~206").
- Empty-Chinese rows (col-0 blank or leading comma): **0**.
- `77` row: **absent** — neither `77,` nor `"77",` prefix found.
- Section headers:
  - `数字与数量` at line 16 — PRESENT
  - `时间与日期` at line 99 — PRESENT
  - `金钱` at line 175 — PRESENT
- Classifier glosses (all full parenthetical lists confirmed):
  - 张 → `"flat things (tickets, paper, tables)"` — PASS
  - 条 → `"long things (fish, ribbons, roads)"` — PASS
  - 只 → `"nondescript animals (dogs, birds)"` — PASS
  - 座 → `"big things (mountains, buildings)"` — PASS

### A2 — PASS
**`generate-deck.ts` has no `LANGUAGE_ROW_CUTOFF`; derives tags from section headers.**

Evidence (node -e probe on source text, exit 0):
- `LANGUAGE_ROW_CUTOFF`: **absent**.
- `TAG_LANGUAGE`: **absent**.
- `TAG_NUMBERS`: **absent**.
- `SECTION_TAGS` map: **present** — maps 数字与数量 → `numbers & amounts`, 时间与日期 → `time & dates`, 金钱 → `money`.
- `DEFAULT_TAG` (`"languages difficulties"`): **present**.
- `currentTag` variable: **present**; updated at lines 136–138 before the cache-skip check at line 141, so the tag advances correctly even for cached (skipped) section-header rows.

### A3 — PASS
**`deck.generated.json`: 204 cards, distinct tags = {languages difficulties, numbers & amounts, time & dates, money}, no old-only headwords.**

Evidence (node -e probe, exit 0):
- Card count: **204**.
- Distinct tags: `["languages difficulties", "numbers & amounts", "time & dates", "money"]` — exactly the 4 specified.
- Tag distribution: languages difficulties 15, numbers & amounts 82, time & dates 75, money 32 (sum = 204).
- Old-only headwords: 你 **absent**, 会 **absent**, 四十四只石狮子是死的。 **absent** — all good.
- New headwords: 金钱 **present**, 星期一 **present**, 人民币 **present**, 第一 **present** — all good.

### A4 — PASS
**DB: card count = 204; new headwords present; dropped absent; tags `time & dates` and `money` exist and join via card_tags; no orphan words/review_states.**

Evidence (npx tsx scripts/qa-db-probe.ts, exit 0 — probe script deleted after run):
- DB card count: **204** (matches deck JSON exactly).
- New headwords: 金钱 PRESENT, 星期一 PRESENT, 人民币 PRESENT, 第一 PRESENT — all good.
- Dropped headwords: 你 absent, 会 absent, 说 absent — all good.
- Tags in DB: `['languages difficulties', 'numbers & amounts', 'time & dates', 'money']` — all 4 present.
- `card_tags` join: **204 unique cards** each have exactly 1 tag row (204 total card_tags rows); all 204 cards tagged.
- Cards with `time & dates` tag: **75** (matches deck distribution).
- Cards with `money` tag: **32** (matches deck distribution).
- Orphan `words` rows: **0**.
- Orphan `review_states` rows: **0**.

### A5 — PASS
**`npx tsc --noEmit` (and `npm run build`) pass clean.**

Evidence:
- `npx tsc --noEmit` → **exit 0**, no errors or warnings.
- `npm run build` (Next.js 16.2.6 Turbopack) → **exit 0**. TypeScript check passed in 9.0s. All 5 routes generated (/, /_not-found, /api/auth/[...nextauth], /stats, Proxy middleware). Zero compilation errors.

---

## Smoke Test

A dev server was already running on port 3000 (PID 37808).

- `GET /` (follow redirects) → **HTTP 200** — app starts and serves.
- `GET /stats` (follow redirects) → **HTTP 200** — stats route resolves.
- Content-level verification (rendered tag section names, card lists) was **not possible**: both routes redirect to Google OAuth signin for unauthenticated requests; no session cookie available in the QA environment. This is a known constraint documented in QA environment memory. The production build exit 0 is the strongest available signal confirming the deck and stats pages compile against the refreshed data.

---

## Commands Run

| Command | Exit code | Notable output |
|---|---|---|
| `node -e` (CSV: line count, 77 row, empty-Chinese, section headers, classifier glosses) | 0 | 206 lines; 0 empty-Chinese; 77 absent; 3 headers at lines 16/99/175; all 4 classifier glosses confirmed |
| `node -e` (deck.generated.json: card count, distinct tags, tag distribution, old/new headwords) | 0 | 204 cards; 4 tags; old headwords absent; new headwords present |
| `node -e` (generate-deck.ts symbol check) | 0 | LANGUAGE_ROW_CUTOFF absent; SECTION_TAGS/DEFAULT_TAG/currentTag all present |
| `npx tsx scripts/qa-db-probe.ts` | 0 | 204 cards; all new headwords present; all dropped headwords absent; 4 tags; 204 card_tags rows; 0 orphan words; 0 orphan review_states; time & dates = 75; money = 32 |
| `npx tsc --noEmit` | 0 | Clean (no output) |
| `npm run build` | 0 | Turbopack, TypeScript clean, 5 routes generated |
| `curl -L http://localhost:3000/` | — | HTTP 200 |
| `curl -L http://localhost:3000/stats` | — | HTTP 200 |

---

## Unexpected Behavior

None. All counts and values matched the orchestrator's verification exactly (204 cards, tag distributions, headword presence/absence).

---

## Residual Risk

1. **Word-level drift not detected** (MEDIUM from review, marked as latent): `refresh-seed-db.ts` drift detection covers only card-level fields (`wholeGloss`, `wholePinyin`, `isPhrase`, `wholeAudioUrl`). If a future refresh changes only word-level content in a retained card, re-sync will not fire and the `words` table stays stale. Zero impact on this refresh (只's card-level `wholeGloss` changed, triggering detection correctly). Fix: add a words comparison pass, or narrow the JSDoc to "card-level drift only".

2. **notInArray empty-array guard** (LOW from review, noted as fixed post-review): `refresh-seed-db.ts` was patched to throw if the deck is empty before deleting. Confirmed by the QA brief; DB state (204 cards, correct counts) is consistent with a correct run. Zero risk against current 204-card deck.

3. **昨天晚上 duplicate in CSV** (noted in review, data issue): Two rows with same headword, different English glosses. Second gloss silently lost. Source-sheet authoring issue; one card present in DB with first-occurrence gloss. No data corruption.

4. **OAuth wall limits smoke-test depth**: Cannot verify rendered deck sections or tag labels in the UI without a live session. `npm run build` exit 0 is the ceiling for headless validation in this environment.

---

## Procedure Compliance

- Plan (`active-plan.md`) consulted before QA: yes
- Implementation summary (`implementation-summary.md`) read before validating: yes
- Review summary (`review-summary.md`) read before validating: yes
- Both prior summaries explicitly read before validating assertions: yes
- Source files edited during QA: no (throwaway `scripts/qa-db-probe.ts` created then deleted)
- QA summary written: yes

---
status: COMPLETE
updated: 2026-05-23
---

> **Cycle outcome (2026-05-23):** All 5 Validation Contract assertions PASS. implementer
> (Steps 1-3) → orchestrator (Steps 4-5 pipeline + DB reconcile) → code-reviewer (PASS; 1 MEDIUM +
> 1 LOW, both fixed in `refresh-seed-db.ts`) → qa-engineer (PASS, `npm run build` clean). Final
> state: 204 cards across 4 tags (languages difficulties 15, numbers & amounts 82, time & dates 75,
> money 32); 41 old-only cards deleted; 只 re-synced in place. **Not committed** — awaiting user.

# Active Plan — Seed refresh: replace Reborn Chinese deck with new sheet export

Full design + decision record: `C:\Users\User\.claude\plans\jolly-riding-beaver.md` (approved).

## Goal
Replace `seed/reborn-chinese-system.csv` with the new Google Sheet export
(`C:\Users\User\Downloads\Reborn Chinese System - Sheet1 (1).csv`), fix the now-broken pipeline
tagging, re-seed, and delete the entries the new sheet drops. Instruction: *keep whatever is
similar, delete the rest.*

## Diff (old → new)
- Old (100 rows): 41 single-word rows + 16 phrases (incl. 四十四只石狮子 tongue-twister) + numbers.
- New (207 non-empty rows): the 15 phrases, numbers, ordinals, fractions, classifiers, amounts,
  **time & dates, calendar, money/currency**. Drops the 41 single-words + tongue-twister.
- Overlap (reused, no OpenAI cost): 59. New headwords to generate: 147. Dropped: ~42.
- New file junk to strip: 27 empty trailing rows, one stray `["77",""]` cell.

## Confirmed decisions
- Scope: rewrite CSV + fix pipeline tagging + re-seed (generate/audio/db).
- Section-header rows kept as ordinary rows (old behavior).
- 4 truncated classifier glosses fixed with full text.
- deck.generated.json: prune + extend (keep 59, drop ~42, generate 147).
- Dropped DB cards: delete (cascades words/card_tags/review_states/review_logs).

## Validation Contract (assertions QA must verify)
1. **CSV**: `seed/reborn-chinese-system.csv` parses to ~206 rows; no empty-Chinese rows; no `77`
   row; header rows present; the 4 classifier glosses (张/条/只/座) contain full parenthetical lists.
2. **Tagging**: `scripts/generate-deck.ts` derives tags from top-level section headers
   (数字与数量→`numbers & amounts`, 时间与日期→`time & dates`, 金钱→`money`, default
   `languages difficulties`); no remaining `LANGUAGE_ROW_CUTOFF` row-index logic.
3. **Deck JSON**: after `seed:generate`, ~206 cards; distinct tags = the 4 above; no old-only
   headwords (你, 会, 四十四只石狮子…) remain.
4. **DB**: card count ≈206; new headwords present (金钱, 星期一, 人民币, 第一); dropped headwords
   absent (你, 会, 说); tag rows `time & dates` and `money` exist and join via `card_tags`; no orphan
   `words`/`review_states` for deleted cards.
5. **Build**: `npx tsc --noEmit` (or `npm run build`) passes with the generate-deck.ts edit.

## Steps
1. Write cleaned CSV (parse → strip junk/77 → fix 4 glosses → keep headers → stringify UTF-8).
2. Replace tagging in `scripts/generate-deck.ts` with section-derived logic + update comment.
3. Prune+re-tag `seed/deck.generated.json` (keep new-CSV headwords, re-tag via Step 2 logic).
4. Run `npm run seed:generate` → `seed:audio` → `seed:db`.
5. Delete dropped cards: `DELETE FROM cards WHERE headword = ANY(DB headwords − new CSV headwords)`.

## Notes / risks
- OpenAI + TTS cost for 147 new headwords. If a key is invalid at run time, pause and report.
- Step 5 irreversibly drops FSRS history for the ~42 dropped cards (approved).

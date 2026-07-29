# Implementation Summary — Mandarin Meeting-People Phrase Set (2026-07-17)

(Written as a feature-scoped file because `implementation-summary.md` currently holds the same-day Advanced Thai theme-2 summary from a parallel session.)

## Result
SHIPPED. 117 new Mandarin cards (deck 398 → 515) live in the production DB; content files squash-merged to main as `8c91d39` and pushed (Vercel auto-deploy). Built in worktree `mandarin-meeting-people` (branch `worktree-mandarin-meeting-people`, commit `e338439`). Plan: `~/.claude/plans/for-the-mandarin-module-resilient-beacon.md` (approved).

## Completed work
- Appended 117 phrase rows + 10 section-header rows to `seed/mandarin/source.csv` (CRLF preserved, verified 543 CRLF / 0 bare LF; csv-parse clean, 0 malformed rows).
- Added 10 `sectionTags` entries in `seed/languages.ts` (基本用语→basics … 祝福→well-wishing).
- Curation (owner-approved at Gate 1): 网址/email gloss fixed (你的邮箱地址是什么？), 下海→我是自由职业者, 下岗→我失业了, 借光→请让一下, 我还小了→我比看起来年轻; slots concretized personalized (我叫凯文, 有机会来泰国…); 2 in-file dupes dropped; （非常）谢谢你 split into 谢谢你/非常感谢你. Dedup vs existing deck: zero collisions (one accepted near-dup: 是。 "Yes." vs existing 是…… "It's ...").
- `npm run seed:generate` (gpt-4o): 117 cards generated. Post-generation fixes: **9 cards had dropped trailing question particles (吗×8, 呢×1) — restored**; resegmented 晚安/干吗/开玩笑 to their listed HSK 3.0 lexemes and split 电话号码→电话+号码 so vocabulary floors anchor correctly.
- HSK banding: 117 verdicts appended to `seed/mandarin/hsk-verdicts.json` (floor-anchored, adjudicated by Claude Fable 5, noted in `_about`). New-card spread: 49×HSK1, 16×HSK2, 19×HSK3, 14×HSK4, 7×HSK5, 4×HSK6, 8×HSK7-9.
- `npm run seed:audio`: 232 new clips uploaded to Vercel Blob, 737 reused. First run failed with Blob 403 (known stale OIDC token) — fixed via `vercel env pull .env.local --yes` in the worktree + restoring 6 hand-added vars (OPENAI_API_KEY, GOOGLE_TTS_API_KEY, AUTH_*, ALLOWED_EMAILS) from backup.
- `npm run seed:db` → prod: 117 inserted, 398 skipped.

## Commands run (verbatim results)
- `npx tsx scripts/level-hsk.ts --check` → "515 card(s) levelled, 3 corrected by the consistency sweep." exit 0
- `npx tsx scripts/level-hsk.ts` → "Wrote seed/mandarin/deck.generated.json" exit 0
- `npm run seed:audio` → "Done. 969 unique clips (232 generated, 737 reused). URLs written to seed\mandarin\deck.generated.json" exit 0
- `npm run seed:db` → "Done. 117 new card(s) inserted, 398 already present." exit 0
- `npm run seed:db` (idempotency re-run) → "Done. 0 new card(s) inserted, 515 already present." exit 0
- Prod SQL verification (ad-hoc drizzle/neon script): cards total 515; tag counts age=7 basics=11 family=19 farewells=7 greetings & goodbyes=22 making conversation=19 nationalities=4 occupations & studies=19 titles & addressing=3 well-wishing=6 (sum 117); 0 new cards missing hsk_level/audio/words; deck_order range 398..514; review_states 68 rows untouched.
- Audio HEAD check: 幸会。 clip → HTTP 200, audio/mpeg, 33792 bytes.
- `npm test` → 111 pass, 0 fail (duration 903 ms).

## Left undone / residual risk
- No logged-in app-level QA (app is auth-gated; same as the transport-set ship). Recommend owner spot-checks a few new cards + audio on thepolyglot.vercel.app.
- Verdicts for unlisted colloquialisms (劳驾 6, 幸会 6, 拜拜 2, 自由职业者 5, 伴儿 7) are judgment calls, marked confidence "medium" in the verdicts file.

## Spec deviations
- Card count 117, not ~125 (plan-time count mistakenly included section headers); surfaced and owner-approved at Gate 1.
- HSK verdicts adjudicated by a single Claude pass instead of per-card Haiku agents; same deterministic wordlist anchoring, validated by level-hsk floor check.

## Spend
≈ $0.40 gpt-4o + ≈ $0.30 TTS ≈ **$0.70 total**; every paid/prod step individually owner-gated.

## Procedure compliance
Plan-mode plan approved before any writes; 3 gates (deck gen / audio / prod seed) each received an explicit owner go via AskUserQuestion. Direct content build per owner's standing preference (no dev-cycle). Worktree isolation used throughout; squash-merge to main per repo convention (never ff).

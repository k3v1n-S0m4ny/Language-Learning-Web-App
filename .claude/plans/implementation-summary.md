# Handoff: M10 — Restructure `seed/` for multi-language
Agent: implementer | Date: 2026-07-01 | Status: COMPLETE

## Completed
- `seed/languages.ts` (new) — per-language config registry. Exports `LanguageKey`,
  `LanguageConfig`, `LANGUAGES: Partial<Record<LanguageKey, LanguageConfig>>` (mandarin
  entry only — no thai/french/japanese stubs), and `resolveLanguage(key?)` defaulting to
  `process.env.SEED_LANG ?? "mandarin"`, throwing a clear `Error` for unconfigured keys.
  Mandarin config's `systemPrompt`, `sectionTags`, `defaultTag` lifted verbatim from
  `scripts/generate-deck.ts`; `ttsInstructions` lifted verbatim from
  `scripts/generate-audio.ts`. Paths built with `path.join` → `seed/mandarin/source.csv`
  and `seed/mandarin/deck.generated.json`. Top-of-file comment explains the registry and
  how to add a language.
- `seed/reborn-chinese-system.csv` → `seed/mandarin/source.csv` (via `git mv`).
- `seed/deck.generated.json` → `seed/mandarin/deck.generated.json` (via `git mv`).
- `scripts/generate-deck.ts` — added `const lang = resolveLanguage();`; `SOURCE`/`OUT`
  now come from `lang.sourceCsv`/`lang.deckJson`; removed local `SYSTEM`, `SECTION_TAGS`,
  `DEFAULT_TAG` constants (and the now-unused `path` import) in favor of
  `lang.systemPrompt`/`lang.sectionTags`/`lang.defaultTag`; updated header comment.
- `scripts/generate-audio.ts` — added `const lang = resolveLanguage();`; `DECK` = 
  `lang.deckJson`; removed local `INSTRUCTIONS` string literal in favor of
  `lang.ttsInstructions` (kept `INSTRUCTIONS` as a local alias so the rest of the file
  is untouched); removed now-unused `path` import; updated header comment.
- `scripts/seed-db.ts` — added `const lang = resolveLanguage();`; `DECK` = `lang.deckJson`;
  removed now-unused `path` import; updated header comment.
- `scripts/deck-types.ts` — unchanged, per spec (hanzi/pinyin naming deferred).
- `scripts/refresh-seed-db.ts` — `DECK` path only changed to
  `path.join("seed", "mandarin", "deck.generated.json")`; NOT parameterized by
  `SEED_LANG`; added a comment block explaining it's Mandarin-only and destructive
  across languages; updated header comment path reference.
- `scripts/normalize-numbers.ts` — same `DECK` path change to the Mandarin path; NOT
  parameterized; added a one-line comment that it's Mandarin-only (Han numerals).
- `.gitignore` — appended `/seed/*/research/` with an explanatory comment.
- `seed/thai/research/NOTES.md` (new, untracked/ignored) — one-line placeholder note so
  the folder exists on disk; confirmed absent from `git status` and confirmed ignored by
  `git check-ignore`.
- `README.md` — appended an "Adding a language to the seed pipeline" section documenting
  the `mkdir seed/<language>` + `LanguageConfig` + `SEED_LANG` convention (bash and
  PowerShell invocation forms), the private gitignored research folder, and the
  Mandarin-only guardrail for `refresh-seed-db.ts`/`normalize-numbers.ts`.

## Left Undone
- Nothing in scope was left undone. Thai/French/Japanese `LanguageConfig` entries were
  intentionally NOT added (per spec — would be placeholder/stub data).
- Did not run `npm run seed:*` or commit, per explicit instruction (costs money / mutates
  data; orchestrator commits after review/QA).

## Commands Run
- `git mv seed/reborn-chinese-system.csv seed/mandarin/source.csv && git mv seed/deck.generated.json seed/mandarin/deck.generated.json && git status` — exit 0
  ```
  Changes to be committed:
    renamed:    seed/deck.generated.json -> seed/mandarin/deck.generated.json
    renamed:    seed/reborn-chinese-system.csv -> seed/mandarin/source.csv
  ```
- `npx tsc --noEmit` — exit 0
  ```
  EXIT_CODE=0
  ```
  (no diagnostic output — clean pass)
- `npx tsx -e "import('./seed/languages.ts').then(m=>console.log(JSON.stringify({def:m.resolveLanguage(),th:(()=>{try{return m.resolveLanguage('thai')}catch(e){return 'throws: '+e.message}})()},null,2)))"` — exit 0
  ```
  {
    "def": {
      "key": "mandarin",
      "dir": "seed\\mandarin",
      "sourceCsv": "seed\\mandarin\\source.csv",
      "deckJson": "seed\\mandarin\\deck.generated.json",
      "systemPrompt": "You are a Mandarin Chinese teaching assistant. ... Never output punctuation marks as words.",
      "ttsInstructions": "Speak slowly and clearly, in standard Mandarin Chinese, with a neutral, friendly teaching tone.",
      "sectionTags": {
        "数字与数量": "numbers & amounts",
        "时间与日期": "time & dates",
        "金钱": "money"
      },
      "defaultTag": "languages difficulties"
    },
    "th": "throws: Unknown/unconfigured SEED_LANG=\"thai\"; configured: mandarin"
  }
  EXIT_CODE=0
  ```
- `git status` — exit 0 (implicit; command succeeded)
  ```
  Changes to be committed:
    renamed:    seed/deck.generated.json -> seed/mandarin/deck.generated.json
    renamed:    seed/reborn-chinese-system.csv -> seed/mandarin/source.csv

  Changes not staged for commit:
    modified:   .claude/plans/active-plan.md
    modified:   .gitignore
    modified:   README.md
    modified:   scripts/generate-audio.ts
    modified:   scripts/generate-deck.ts
    modified:   scripts/normalize-numbers.ts
    modified:   scripts/refresh-seed-db.ts
    modified:   scripts/seed-db.ts

  Untracked files:
    .claude/agent-memory/
    seed/languages.ts
  ```
- `git check-ignore seed/thai/research/NOTES.md` — exit 0
  ```
  seed/thai/research/NOTES.md
  EXIT_CODE=0
  ```
- `npx eslint scripts/generate-deck.ts scripts/generate-audio.ts scripts/seed-db.ts scripts/refresh-seed-db.ts scripts/normalize-numbers.ts seed/languages.ts` — exit 0
  ```
  EXIT_CODE=0
  ```
  (no lint errors/warnings output)

## Issues Discovered
- None. `path` import became unused in `generate-deck.ts`, `generate-audio.ts`, and
  `seed-db.ts` once the hardcoded `path.join(...)` calls were replaced by `lang.*`
  fields (which are already pre-joined strings from `languages.ts`) — removed the
  import in each to keep lint/tsc clean (confirmed via `npx eslint` above, no unused-var
  warnings).
- `.gitignore` had two separate `.vercel` lines (one under a `# vercel` header, one
  orphaned at EOF); appended the new `/seed/*/research/` block after the trailing
  `.vercel` line rather than deduplicating those pre-existing lines (out of scope).

## Spec Deviations
- None. All six work items (languages.ts, file moves, 3 core script parameterizations,
  2 one-off Mandarin path fixes, .gitignore + Thai research folder, README docs) were
  implemented exactly as specified, using `SEED_LANG` (not `LANG`).
- Minor implementation choice not spelled out in the spec: `LANGUAGES` typed as
  `Partial<Record<LanguageKey, LanguageConfig>>` (one of the two options explicitly
  offered in the prompt) since it kept `resolveLanguage`'s indexing (`LANGUAGES[key as
  LanguageKey]`) simple and type-safe while still allowing a clear runtime throw for
  unconfigured keys.

## Procedure Compliance
- Plan consulted before coding: yes (`.claude/plans/active-plan.md` read first, plus all
  5 existing scripts read in full before editing)
- Tests run before finishing: yes — `npx tsc --noEmit` (exit 0, clean) and
  `npx eslint ...` (exit 0, clean) cited above under Commands Run. No test suite exists
  for the seed scripts in this repo (they are one-off CLI scripts, not covered by a test
  runner); verification instead relied on the tsc/eslint static checks plus the
  `resolveLanguage()` runtime probe and `git status`/`git check-ignore`, all per the
  plan's own Verification section and this task's Step 7.
- Handoff written: yes

# Review Summary — M10: Restructure `seed/` for multi-language

## Result
PASS

## Files Reviewed
- `seed/languages.ts` (new)
- `scripts/generate-deck.ts`
- `scripts/generate-audio.ts`
- `scripts/seed-db.ts`
- `scripts/refresh-seed-db.ts`
- `scripts/normalize-numbers.ts`
- `scripts/deck-types.ts` (unchanged — checked for scope creep)
- `.gitignore`
- `README.md`
- `seed/mandarin/source.csv`, `seed/mandarin/deck.generated.json` (renamed files — content-diffed)
- `seed/thai/research/NOTES.md` (untracked, existence + ignore status verified)
- `.claude/plans/active-plan.md`, `.claude/plans/implementation-summary.md`

## Findings

### CRITICAL
None.

### HIGH
None.

### MEDIUM
None.

### LOW
- `scripts/deck-types.ts:1` — stale doc comment still reads `seed/deck.generated.json`
  (pre-move top-level path); should say `seed/mandarin/deck.generated.json` (or the
  generic `<lang>.deckJson`) for accuracy. Functionally harmless (this file is a pure
  type declaration, and the plan explicitly required it stay unchanged pending the
  field-rename milestone), but it is now a misleading comment. Low priority — fix
  opportunistically next time this file is touched, not worth a standalone commit.
- `seed/languages.ts:20-21` — `LanguageConfig.key` and `.dir` fields are populated but
  currently unused by any of the three consumer scripts (`generate-deck.ts`,
  `generate-audio.ts`, `seed-db.ts`). Not a defect — both fields were explicitly
  requested in the plan's field list (work item 1) and are reasonable forward-looking
  scaffolding for the Thai/French/Japanese milestone — but flagging as unused surface
  area in case a future linter flags it or a reviewer wonders why they exist.

## Assertions Checked

- **A1 — No behavior change for Mandarin**: PASS. Programmatically extracted `SYSTEM`
  from `git show HEAD:scripts/generate-deck.ts` and compared to `systemPrompt` in
  `seed/languages.ts`: identical, byte-for-byte (both 702 chars). `DEFAULT_TAG` /
  `defaultTag`: identical (`"languages difficulties"`). `INSTRUCTIONS` /
  `ttsInstructions` (from `generate-audio.ts`): identical. `SECTION_TAGS` /
  `sectionTags`: identical key→value pairs (数字与数量→numbers & amounts, 时间与日期→time
  & dates, 金钱→money); the only difference in a raw string diff was indentation
  whitespace from being nested one level deeper inside an object literal, which is
  semantically irrelevant. Confirmed via an independent tsx probe that
  `resolveLanguage()` with `SEED_LANG` unset returns `sourceCsv: "seed\\mandarin\\source.csv"`,
  `deckJson: "seed\\mandarin\\deck.generated.json"`.
- **A2 — Moved deck file byte-identical**: PASS. `git status --porcelain -- seed/`
  shows both files as pure renames (`R`, no `M`). `git diff -- seed/mandarin/deck.generated.json
  seed/mandarin/source.csv` produced empty output (no content diff at all).
- **A3 — `SEED_LANG` everywhere, `LANG` nowhere**: PASS. `process\.env\.LANG\b` grep
  across `scripts/` and `seed/` returned zero matches. `SEED_LANG` grep across the repo
  found it only in the 3 parameterized scripts + `seed/languages.ts` (as the actual
  selector) plus comment-only mentions in the 2 pinned scripts and README/plan docs.
- **A4 — `refresh-seed-db.ts` / `normalize-numbers.ts` NOT parameterized**: PASS.
  Grepped both files for `SEED_LANG`/`resolveLanguage`: only comment references exist
  ("not SEED_LANG-parameterized"); no import of `resolveLanguage`, no read of
  `process.env.SEED_LANG`. Both scripts hardcode `path.join("seed", "mandarin",
  "deck.generated.json")`.
- **A5 — `resolveLanguage()` throws clearly for unconfigured languages**: PASS.
  Independently re-ran (not the implementer's `-e` output, which is untrustworthy on
  this Windows/tsx setup — see Commands Run below) via a standalone probe script:
  `resolveLanguage("thai")` → throws `Unknown/unconfigured SEED_LANG="thai"; configured: mandarin`;
  `resolveLanguage("bogus")` → throws the equivalent message. Neither returns
  `undefined`.
- **A6 — Correct imports, no leftover local constants**: PASS. All three core scripts
  import `{ resolveLanguage } from "../seed/languages"` (correct relative path from
  `scripts/`). Grepped for leftover `const SYSTEM =` / `SECTION_TAGS =` / `DEFAULT_TAG =`
  / top-level `INSTRUCTIONS =` literal assignments — none remain; `generate-audio.ts`
  keeps `const INSTRUCTIONS = lang.ttsInstructions;` as a documented local alias (not a
  duplicate hardcoded string), which is fine.
- **A7 — Gitignore correctness**: PASS. `git check-ignore -v seed/thai/research/NOTES.md
  seed/mandarin/source.csv seed/mandarin/deck.generated.json` matched only
  `seed/thai/research/NOTES.md` against `.gitignore:46: /seed/*/research/`; the other
  two paths produced no match (correctly not ignored).
- **A8 — No scope creep**: PASS. `git status --porcelain` shows no modifications to
  `scripts/deck-types.ts`, `lib/db/schema.ts`, `lib/review/types.ts`, or `components/*`.
  Confirmed with an explicit `git diff -- scripts/deck-types.ts lib/db/schema.ts
  lib/review/types.ts components/` which produced empty output.

## Commands Run
All re-run independently by the reviewer, not copy-pasted from the implementer.

- `npx tsc --noEmit` — exit 0
  ```
  (no output — clean pass)
  ```
- `npx eslint scripts/generate-deck.ts scripts/generate-audio.ts scripts/seed-db.ts scripts/refresh-seed-db.ts scripts/normalize-numbers.ts seed/languages.ts` — exit 0
  ```
  (no output — clean pass)
  ```
- `npx eslint .` (full repo, beyond what implementer ran) — exit 0
  ```
  (no output — clean pass)
  ```
- `git status --porcelain` — exit 0
  ```
   M .claude/plans/active-plan.md
   M .claude/plans/implementation-summary.md
   M .gitignore
   M README.md
   M scripts/generate-audio.ts
   M scripts/generate-deck.ts
   M scripts/normalize-numbers.ts
   M scripts/refresh-seed-db.ts
   M scripts/seed-db.ts
  R  seed/deck.generated.json -> seed/mandarin/deck.generated.json
  R  seed/reborn-chinese-system.csv -> seed/mandarin/source.csv
  ?? .claude/agent-memory/
  ?? seed/languages.ts
  ```
  Matches the implementer's claimed file list exactly.
- `git diff -- seed/mandarin/deck.generated.json seed/mandarin/source.csv` — exit 0
  ```
  (empty — confirms pure rename, no content drift)
  ```
- `git check-ignore -v seed/thai/research/NOTES.md seed/mandarin/source.csv seed/mandarin/deck.generated.json` — exit 0
  ```
  .gitignore:46:/seed/*/research/	seed/thai/research/NOTES.md
  ```
  (only one line printed — the other two paths correctly produced no match)
- `git diff -- scripts/deck-types.ts lib/db/schema.ts lib/review/types.ts components/` — exit 0
  ```
  (empty — confirms no scope creep)
  ```
- tsx probe of `resolveLanguage()` (own script, not the implementer's `-e` snippet — see
  discrepancy note below) — exit 0
  ```
  DEFAULT: {"sourceCsv":"seed\\mandarin\\source.csv","deckJson":"seed\\mandarin\\deck.generated.json"}
  THAI throws: Unknown/unconfigured SEED_LANG="thai"; configured: mandarin
  BOGUS throws: Unknown/unconfigured SEED_LANG="bogus"; configured: mandarin
  ```
- Programmatic string-diff script (own script) comparing `git show HEAD:scripts/generate-deck.ts`
  / `generate-audio.ts` against `seed/languages.ts` — exit 0
  ```
  SYSTEM match: true | lens: 702 702
  DEFAULT_TAG match: true "languages difficulties" "languages difficulties"
  INSTRUCTIONS match: true "Speak slowly and clearly, in standard Mandarin Chinese, with a neutral, friendly teaching tone." "Speak slowly and clearly, in standard Mandarin Chinese, with a neutral, friendly teaching tone."
  SECTION_TAGS raw match: false   <- whitespace-only (indentation), values identical
  ```

### Discrepancy vs. implementer's pasted output
The implementer's handoff shows `npx tsx -e "..."` for the `resolveLanguage()` probe
returning correct JSON output. When the reviewer ran the **exact same** `npx tsx -e`
invocation independently, it exited 0 but printed **no output at all** (the `.then()`
callback appears to not flush before process exit under `tsx -e` in this environment).
This is a tooling quirk in `-e` invocations, not a code defect — switching to a real
`.mjs` file with a `file://` URL import reproduced the implementer's claimed values
exactly. Flagging this because the implementer's raw command, if re-run verbatim, does
not reliably reproduce their pasted output — future implementers should prefer a
temp script file over `tsx -e` for reproducible verification evidence.

## Residual Risk
- `npm run seed:*` (actual OpenAI/Neon/Blob calls) was not run, per explicit
  instruction — the "0 inserted / all already present" DB-idempotency claim (plan
  Verification item 4) and the `npm run dev` render check (item 5) remain unverified
  by this review. These require live credentials/spend and are appropriately deferred
  to QA or a manual smoke test.
- `next build` was not run — out of proportion to a scripts/seed-only change surface,
  and `tsc --noEmit` + full-repo `eslint` already give whole-repo type/lint coverage.
- The stale `scripts/deck-types.ts` comment (LOW finding above) is cosmetic and does
  not block merge, but will compound confusion if left across the upcoming
  field-rename milestone — worth a one-line fix whenever that file is next touched.
- No test suite exists for the seed scripts (consistent with pre-existing repo state,
  not a regression introduced by this change).

## Procedure Compliance
- Plan consulted before review: yes (`.claude/plans/active-plan.md` read in full)
- Implementation summary read: yes (`.claude/plans/implementation-summary.md` read in full)
- Review summary written: yes

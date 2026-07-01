# QA Summary — M10: Restructure `seed/` for multi-language

## Result
PASS

## Assertions

- **A1 — `npx tsc --noEmit` passes**: PASS — exit 0, no diagnostics.
- **A2 — `npm run build` succeeds (Next build compiles, moved files don't break imports)**: PASS — exit 0. No missing env var failures; build completed in ~8.5s including TypeScript check and static page generation. Routes `/`, `/api/auth/[...nextauth]`, `/stats` all built.
- **A3 — `npm run lint` passes**: PASS — exit 0, no output (clean).
- **A4 — `resolveLanguage()` behaves correctly**: PASS, verified via a real scratch `.mts` file (not `tsx -e`, which the review summary flagged as unreliable in this environment) run with `npx tsx`, importing `seed/languages.ts` via a `file://` URL, in the OS temp scratch dir, deleted after use.
  - (a) default (`SEED_LANG` unset) → `key: "mandarin"`, `sourceCsv` ends with `mandarin\source.csv`, `deckJson` ends with `mandarin\deck.generated.json` — confirmed true/true.
  - (b) `resolveLanguage("thai")` → throws `Unknown/unconfigured SEED_LANG="thai"; configured: mandarin` (names the configured languages) — confirmed.
  - (c) explicit `process.env.SEED_LANG = "mandarin"` → resolves identically to default — confirmed.
- **A5 — Mandarin deck intact and loadable**: PASS. `seed/mandarin/deck.generated.json` parses as valid JSON, is an array of 204 entries. Compared against `git show HEAD:seed/deck.generated.json` (the pre-move file, 204 entries) via `JSON.stringify` deep-equality — **exact match**, confirming a pure rename with zero content drift. `seed/mandarin/source.csv` exists (5764 bytes, 204 lines).
- **A6 — Path resolution wired end-to-end (static grep, no paid execution)**: PASS.
  - `scripts/generate-deck.ts`: imports `resolveLanguage` from `../seed/languages`; uses `lang.sourceCsv`, `lang.deckJson`, `lang.systemPrompt`, `lang.defaultTag`, `lang.sectionTags`.
  - `scripts/generate-audio.ts`: imports `resolveLanguage`; uses `lang.deckJson`, `lang.ttsInstructions`.
  - `scripts/seed-db.ts`: imports `resolveLanguage`; uses `lang.deckJson`.
  - No `npm run seed:*` was executed (paid OpenAI/Neon/Blob calls correctly avoided).
- **A7 — Gitignore behavior**: PASS.
  - `git check-ignore -v seed/thai/research/NOTES.md` → matched `.gitignore:46:/seed/*/research/` (ignored), exit 0.
  - `git check-ignore -v seed/mandarin/source.csv seed/mandarin/deck.generated.json` → no match, exit 1 (correctly NOT ignored).
  - `git status --porcelain` shows both files as `R` (rename) and nothing under `seed/thai/research/` is listed.
- **A8 — No out-of-scope regressions**: PASS with one flagged discrepancy (see Unexpected Behavior). `git diff --stat -- lib/db/schema.ts lib/review/types.ts components/` — empty (zero changes), confirmed independently. `scripts/deck-types.ts` IS modified (comment-only) — see below.
- **A9 — Pinned scripts NOT parameterized**: PASS. `scripts/refresh-seed-db.ts` and `scripts/normalize-numbers.ts` both hardcode `path.join("seed", "mandarin", "deck.generated.json")`; grep for `SEED_LANG`/`resolveLanguage` in both files returns only comment references, no actual import or env read.
- **A10 — App starts and shuts down cleanly (runtime smoke test)**: PASS. `npm run dev` → ready in 892ms, no compile/runtime errors. `curl http://localhost:3000/` → clean `307` redirect to `/api/auth/signin` (expected auth-gated behavior, not an error — this app requires Google OAuth sign-in before rendering the review screen, consistent with prior QA sessions where OAuth + prod DB flows aren't automatable in this environment). Dev log showed no stack traces after the request. Server process was stopped via its PID (Windows `Stop-Process`) and port 3000 confirmed free afterward — clean shutdown.

## Commands

- `npx tsc --noEmit` — exit 0
  ```
  EXIT_CODE=0
  ```
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint

  EXIT_CODE=0
  ```
- `npm run build` — exit 0
  ```
  ▲ Next.js 16.2.6 (Turbopack)
  - Environments: .env.local

    Creating an optimized production build ...
  ✓ Compiled successfully in 8.5s
    Running TypeScript ...
    Finished TypeScript in 6.5s ...
    Collecting page data using 7 workers ...
  ✓ Generating static pages using 7 workers (5/5) in 810ms
    Finalizing page optimization ...

  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  └ ƒ /stats

  EXIT_CODE=0
  ```
  (Turbopack workspace-root warning present but pre-existing/unrelated — multiple lockfiles detected outside repo at `C:\Users\User\package-lock.json`, not caused by this change.)
- `npx tsx <scratch>/probe-resolve-language.mts` (real file, `file://` import, OS temp dir, deleted after) — exit 0
  ```
  {
    "defaultKey": "mandarin",
    "defaultSourceCsv": "seed\\mandarin\\source.csv",
    "defaultDeckJson": "seed\\mandarin\\deck.generated.json",
    "defaultSourceCsvEndsRight": true,
    "defaultDeckJsonEndsRight": true,
    "thaiThrew": true,
    "thaiMessage": "Unknown/unconfigured SEED_LANG=\"thai\"; configured: mandarin",
    "explicitKey": "mandarin",
    "explicitSourceCsv": "seed\\mandarin\\source.csv",
    "explicitDeckJson": "seed\\mandarin\\deck.generated.json"
  }
  EXIT_CODE=0
  ```
- `node -e "..."` parse of `seed/mandarin/deck.generated.json` — exit 0
  ```
  current parse OK, isArray: true length: 204
  EXIT_CODE=0
  ```
- `git show HEAD:seed/deck.generated.json` + node compare script (real scratch file, deleted after) — exit 0
  ```
  HEAD length: 204 CURRENT length: 204 EQUAL: true
  deep JSON.stringify match: true
  EXIT_CODE=0
  ```
- `wc -l seed/mandarin/source.csv` — exit 0
  ```
  204 seed/mandarin/source.csv
  ```
- Grep of `resolveLanguage|lang\.(sourceCsv|deckJson|systemPrompt|ttsInstructions|sectionTags|defaultTag)` across the 3 core scripts — confirmed all wired (see A6 above).
- Grep of `SEED_LANG|resolveLanguage|mandarin` across `refresh-seed-db.ts` / `normalize-numbers.ts` — confirmed hardcoded, not parameterized (see A9).
- `git check-ignore -v seed/thai/research/NOTES.md` — exit 0
  ```
  .gitignore:46:/seed/*/research/	seed/thai/research/NOTES.md
  EXIT_CODE=0
  ```
- `git check-ignore -v seed/mandarin/source.csv seed/mandarin/deck.generated.json` — exit 1 (no match, correct)
- `git status --porcelain` — exit 0
  ```
   M .claude/plans/active-plan.md
   M .claude/plans/implementation-summary.md
   M .claude/plans/review-summary.md
   M .gitignore
   M README.md
   M scripts/deck-types.ts
   M scripts/generate-audio.ts
   M scripts/generate-deck.ts
   M scripts/normalize-numbers.ts
   M scripts/refresh-seed-db.ts
   M scripts/seed-db.ts
  R  seed/deck.generated.json -> seed/mandarin/deck.generated.json
  R  seed/reborn-chinese-system.csv -> seed/mandarin/source.csv
  ?? .claude/agent-memory/
  ?? seed/languages.ts
  EXIT_CODE=0
  ```
- `git diff --stat -- seed/mandarin/deck.generated.json seed/mandarin/source.csv` — exit 0, empty output (pure rename confirmed independently)
- `git diff --stat -- lib/db/schema.ts lib/review/types.ts components/` — exit 0, empty output (no out-of-scope changes)
- `git diff -- scripts/deck-types.ts` — exit 0, shows a 2-line comment-only change (see Unexpected Behavior)
- `npm run dev` (background) — ready in 892ms, no errors
- `curl -s -D - -o /dev/null http://localhost:3000/` — exit 0
  ```
  HTTP/1.1 307 Temporary Redirect
  location: /api/auth/signin?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2F
  ```
- Dev server shutdown via `Stop-Process -Id <pid> -Force` (PID resolved from `Get-NetTCPConnection -LocalPort 3000`); confirmed port 3000 free and PID gone afterward.

## Evidence Artifacts
No UI screenshots captured — this is a build-tooling/seed-script restructure with no UI surface change, and the review screen sits behind Google OAuth which is not automatable in this environment (consistent with prior QA sessions in project memory). The `curl` 307-redirect output above is the closest available evidence that the app boots and serves correctly post-restructure; no visual regression is possible from a scripts/seed-only change surface.

## Unexpected Behavior
- `scripts/deck-types.ts` shows as **modified** in `git status`, contradicting the review summary's claim that this file was unchanged (the review's Files Reviewed / A8 both stated `git diff -- scripts/deck-types.ts ...` was empty). Re-diffing independently shows a real 2-line change: the header comment was updated from `seed/deck.generated.json` to `seed/<language>/deck.generated.json (e.g. seed/mandarin/deck.generated.json)`. This is exactly the LOW finding the reviewer flagged as *not yet fixed* ("fix opportunistically next time this file is touched") — but it appears to have actually been fixed since the review ran. The active-plan.md, re-read at QA time, now says "Stale comment in `scripts/deck-types.ts` was just corrected," language that (per its own line count) wasn't present when the reviewer read it either — the active-plan.md file itself was edited between review and QA. This is a harmless, in-scope, comment-only correction (type declarations unchanged; `hanzi`/`pinyin` fields untouched per spec) — does not affect the PASS verdict, but the review-summary.md is now stale on this one point and the handoff chain drifted slightly out of sync between review and QA. Flagging for awareness, not blocking.
- No functional bugs, no regressions, no unexpected script behavior found.

## Residual Risk
- `npm run seed:*` (live OpenAI/Neon/Blob) was not executed, per explicit instruction — DB-idempotency ("0 inserted, all present") and the authenticated review-screen render remain unverified by any automated agent in this chain (implementer, reviewer, or QA). This requires a manual smoke test with real credentials/session.
- The review-screen-renders-Mandarin-cards check (plan Verification item 5) could not be completed past the OAuth wall in this environment; only server boot + unauthenticated redirect behavior was confirmed.
- `scripts/deck-types.ts` comment drift noted above — cosmetic only, no code/type impact, and the handoff chain (active-plan.md edited post-review) should be tightened so review and QA are working from the same frozen spec snapshot.
- Pre-existing Turbopack "workspace root" warning (multiple lockfiles detected outside the repo, at `C:\Users\User\package-lock.json`) is unrelated to this change and was present in build output; not a regression.

## Procedure Compliance
- Plan consulted before QA: yes (`.claude/plans/active-plan.md` read in full)
- Implementation summary read: yes (`.claude/plans/implementation-summary.md` read in full)
- Review summary read: yes (`.claude/plans/review-summary.md` read in full)
- Validations re-run by QA (not copied): yes — every command in this report was executed independently by QA, including a fresh `resolveLanguage()` probe script (not the implementer's `-e` snippet, which the reviewer had already flagged as unreliable in this environment), a fresh deck byte-comparison against `git show HEAD:...`, fresh greps of all 5 scripts, fresh `git status`/`git check-ignore` calls, a fresh `npm run build`, and a fresh `npm run dev` + curl smoke test
- QA summary written: yes

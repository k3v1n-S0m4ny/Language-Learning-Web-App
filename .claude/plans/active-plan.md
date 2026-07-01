# Active Plan — Restructure `seed/` for multi-language

> Milestone: **M10 — per-language seed reorganization** (Mandarin → +Thai, French, Japanese).
> Full approved plan: `C:\Users\User\.claude\plans\currently-our-app-does-splendid-wirth.md`.
> This is the project-local handoff surface for the implementer → code-reviewer → qa chain.

## Context

The app teaches **only Mandarin** today. Deck data sits flat at the top of `seed/`
(`reborn-chinese-system.csv` + `deck.generated.json`); the seed scripts hardcode those
paths and Mandarin-specific config. Goal: **rearrange folders so Thai/French/Japanese
slot in cleanly soon**, plus a **gitignored Thai research folder**.

**Scope (user-confirmed):** folders + seed scripts ONLY. No DB/UI/schema changes — the
user will use separate tables/DBs per language later. Full-name folders
(`mandarin/thai/french/japanese`). Thai = research folder only (no deck scaffold, no
placeholder cards).

## Work items (must all land in ONE commit — moves + edits together, else ENOENT)

1. **New `seed/languages.ts`** — per-language config registry. Export `LanguageKey`,
   `LanguageConfig`, `LANGUAGES` (Mandarin entry only), and `resolveLanguage(key?)`
   defaulting to `process.env.SEED_LANG ?? "mandarin"`. Populate Mandarin by lifting
   verbatim: `generate-deck.ts`'s `SYSTEM`, `SECTION_TAGS`, `DEFAULT_TAG`, and
   `generate-audio.ts`'s `INSTRUCTIONS`. Config fields: `key`, `dir`, `sourceCsv`,
   `deckJson`, `systemPrompt`, `ttsInstructions`, `sectionTags`, `defaultTag`.

2. **File moves (`git mv`):**
   - `seed/reborn-chinese-system.csv` → `seed/mandarin/source.csv`
   - `seed/deck.generated.json` → `seed/mandarin/deck.generated.json`

3. **Parameterize core pipeline** to use `resolveLanguage()`:
   - `scripts/generate-deck.ts`: `SOURCE`=`lang.sourceCsv`, `OUT`=`lang.deckJson`;
     `SYSTEM`/`SECTION_TAGS`/`DEFAULT_TAG` come from `lang.*`.
   - `scripts/generate-audio.ts`: `DECK`=`lang.deckJson`, `INSTRUCTIONS`=`lang.ttsInstructions`.
   - `scripts/seed-db.ts`: `DECK`=`lang.deckJson`.
   - `scripts/deck-types.ts`: unchanged (`hanzi`/`pinyin` stay — rename deferred).

4. **Fix one-off Mandarin scripts' paths only** (leave logic Mandarin-specific, do NOT
   parameterize): `scripts/refresh-seed-db.ts` and `scripts/normalize-numbers.ts` →
   point their `DECK` const at `seed/mandarin/deck.generated.json`.

5. **`.gitignore`**: add `/seed/*/research/` (with a comment). Create `seed/thai/research/`
   locally (untracked — recommendation (b) from the plan; no `.gitkeep`).

6. **Docs**: short "Adding a language" note (README or docs/) — new-language convention
   using `SEED_LANG`.

## Guardrails / risks (carry into review + qa)

- **Use `SEED_LANG`, not `LANG`** (POSIX locale collision). Pass at invocation, not in `.env.local`.
- **Moves + edits in one commit** — scripts throw `ENOENT` the instant files move.
- **`refresh-seed-db.ts` is cross-language destructive** — deletes any card whose
  headword isn't in the selected deck. DB is one shared Mandarin library with no
  `language` column. Only ever run seed/refresh with `SEED_LANG=mandarin` until the
  per-language DB milestone. This change seeds only Mandarin, so behavior is unchanged.
- **No behavior change for Mandarin** — `npm run seed:*` with no env var must resolve to
  the exact same deck and prompts/instructions as before.

## Deferred (NOT now)

DB `language` column / migration; generic field renaming (`hanzi`/`pinyin` → neutral);
per-language TTS voices & tables; language-selection UI. Bundle field-rename with the
schema milestone.

## Verification

1. `npx tsc --noEmit` passes after `seed/languages.ts` is added.
2. `resolveLanguage()` with `SEED_LANG` unset resolves to `seed/mandarin/*` (tsx snippet).
3. `git status` shows the two files renamed under `seed/mandarin/`, and
   `seed/thai/research/<throwaway>` is NOT listed (gitignore works).
4. `npm run seed:db` reports 0 inserted / all already present (path points at same deck).
5. `npm run dev` — review screen renders Mandarin cards unchanged.

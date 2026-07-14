# Advanced Thai (M16) — Phase B: the module

Status: **NOT STARTED.** Phase A (card-design bake-off) is complete — see `implementation-summary.md`.

## Context

Advanced Thai is the owner's personal third course: vocabulary, grammar and every phrase, extracted from themed Thai occupational texts (`C:\Users\User\Downloads\นักโฆษณา-advertiser.md`; more will follow in the same shape). It is deliberately separate from Read-Thai, which is shared with two beta testers and teaches *script* rather than *language*.

Phase A settled the three card designs and the content contract, with nothing committed and nothing spent. Phase B builds the actual module: schema, extractor, audio, study flow.

### What Phase A established — do NOT re-open

| | Picked design | Contract type |
|---|---|---|
| Vocabulary | **V1 · Lexeme Slab** — Mandarin flip + a morphology strip | `VocabEntry` |
| Grammar | **G1 · Slot Frame** — the slot's hue paints its realization in every example | `GrammarPattern` |
| Phrases | **PS1 · Phrase Slab** — the Mandarin card, in Thai | `PhraseEntry` |

- **A "phrase" is one space-delimited clause of the source document.** Thai spaces separate *clauses*, not words, so the text already marks its own phrase boundaries. This yields **122 phrase cards** for `นักโฆษณา` (median 24 / max 71 Thai characters). Not splitting leaves paragraphs of up to **439** characters, which no card can hold at a readable size. Measured, not assumed.
- Contract: `seed/advanced-thai/types.ts`. Reference output: `seed/advanced-thai/themes/nak-kosana.ts` (10 vocab / 5 patterns / 14 phrases, hand-extracted, real — this is what the extractor must imitate).
- Components: `components/advanced-thai/bakeoff/{kit,vocab-lexeme-slab,grammar-slot-frame,phrase-slab,bakeoff-board}.tsx`.
- Tokens: `[data-lang="advanced-thai"]` = indigo `#4C5FD5` / copper `#C2703F` / celadon `#7FB8A4`; plus `--pos-*`, `--register-*`, `--morph-*`, `--pattern-fn-*`, `--slot-empty-*`. All AA-verified; table at the top of `globals.css`.
- Access: `lib/advanced-thai/access.ts` — an **allow-list** (owner only), so unknown accounts are refused by default rather than admitted.

## Decisions to take BEFORE writing code

1. **Per-word audio, or whole-phrase only?** This is most of the TTS spend. 122 phrases × ~8 words ≈ **1,000+ clips for one theme**, versus ~130 if only whole phrases and vocab get audio. The word chips currently render a per-word audio button; dropping it is a small edit. Decide first, because it changes the cost by an order of magnitude.
2. **New-card gating.** Mandarin has the HSK band gate. Advanced Thai could simply release theme-by-theme with no gate. Deliberately deferred from Phase A — decide now, or ship ungated and revisit after a week of real use.

## Steps

### B0. Branch the database FIRST
`.env.local`'s `DATABASE_URL` **is production** — the same DB holding real FSRS history for both learners. Create a Neon branch and point local work at it. No migration touches prod until it is proven on the branch.

### B1. Schema — `lib/db/schema.ts`
New `at_*` tables, namespaced like the Thai ones so Mandarin and Read-Thai stay completely untouched:
- `at_themes` — slug, titles, summary.
- `at_cards` — `themeId`, `kind` (`vocab` | `grammar` | `phrase`), `payload jsonb` shaped per kind (mirroring the three contract types), `deckOrder`. Plain-text `kind`, no pg enum — same rationale as `thai_items.kind`.
- `at_review_states`, `at_review_logs` — mirror `review_states` / `review_logs` exactly.

**Reuse `lib/review/scheduler.ts`; do not fork it.** The existing `cards`/`words` tables are NOT reused: their columns are Mandarin-shaped (`whole_pinyin`, `hanzi`), and `scripts/refresh-seed-db.ts` already warns in writing that the shared library is not split per language.

Then add `"advanced-thai"` to `ActiveMode` (`lib/thai/types.ts`), to `setActiveMode`'s validation (coerce — only the owner may set it; the action is reachable by direct POST), to the `app/page.tsx` branch, and to `ModeToggle` / `BottomNav`. `learner_settings.active_mode` is plain `text` with no enum or check constraint, so **the mode itself needs no migration.**

### B2. Extractor — `scripts/generate-advanced-thai-deck.ts`
Modelled on `scripts/generate-deck.ts`. Reads a theme `.md`, sends it to Claude with a JSON schema matching `seed/advanced-thai/types.ts`, writes `seed/advanced-thai/themes/<slug>.generated.json`. Resumable.

**Clause-splitting is deterministic, not LLM** — split on the document's own spaces (keeping `ๆ` bound to the word before it), then ask the model only for the word segmentation, the glosses, the vocab and the patterns.

**The owner reviews and edits the JSON before anything is seeded.**

### B3. Seed-time assertions — `scripts/seed-advanced-thai-db.ts`
Thai word segmentation is the genuinely hard part and an LLM *will* get some of it wrong. Assert BEFORE touching the DB (the `assertPhraseBoundariesValid` precedent in `scripts/seed-thai-db.ts`):
- every phrase's `words.join("")` reproduces `thai` minus punctuation;
- every grammar `slot` name appears in its `frame`;
- every `pos` / `register` / `fn` value is in its union.

This exact check already exists — it was run in Phase A verification and should be lifted straight into the seed script.

### B4. Audio — extend `scripts/generate-thai-audio.ts`
New blob prefix `audio/advanced-thai/`. Google Cloud TTS, voice `th-TH-Neural2-C`.

**Keep its hash-the-`(provider, model, voice, language, text)`-tuple behaviour** — NOT Mandarin's hash-text-alone, which is the latent voice-hash bug already recorded in memory. A voice change must never silently reuse a stale clip.

Ships with the same `--dry` gate: print clip count, character total and cost estimate, and **spend nothing without an explicit go.**

### B5. Study flow
- `app/advanced-thai/page.tsx` — theme picker + review session.
- The session dispatches on `card.kind` to the three picked components (move them out of `bakeoff/` into `components/advanced-thai/`).
- Reuse `RatingButtons`, `AudioButton`, `SessionHeader`, `EmptyState`.

## Trap carried forward from Phase A

`components/card-back.tsx` (Mandarin) uses `justify-center` + `overflow-y-auto` on a single column, which **clips overflowing content above the scroll origin** where it can never be scrolled back to. It is only safe today because Mandarin phrases are short. The Advanced-Thai cards already carry the fix (fixed header + a scroll container whose child is `min-h-full justify-center`). If any Mandarin component is reused for a long Thai clause, it must be fixed too.

## Verification

1. Confirm `DATABASE_URL` points at the **Neon branch**, not prod, before any migrate or seed.
2. `npx drizzle-kit generate` → read the SQL by eye → apply to the branch.
3. Run the extractor on `นักโฆษณา` → expect **122 phrases** → read the JSON.
4. Seed assertions pass (they must abort *before* the DB is touched).
5. `--dry` audio run → cost estimate → **owner go** → generate.
6. Drive `/advanced-thai` signed in as the owner: study one card of each kind, rate it, confirm FSRS scheduling advances.
7. Restricted tester → 404. Mandarin and Read-Thai flows unchanged.
8. `npx tsc --noEmit`, `npm run lint`.
9. Only then: migrate production.

---
feature: advanced-thai-phase-b
created: 2026-07-14T09:42:32.379567+00:00
source-session: 233cc579-c924-4cac-98f1-3e2bbd1c9416
context-at-handoff: 364277 (red)
---

# Handoff: Advanced Thai (M16) — Phase B, the module

## Goal
Advanced Thai is the owner's **personal** third course (owner-only; NOT the two Read-Thai beta testers). It teaches vocabulary, grammar and every phrase from themed Thai occupational texts. Source: `C:\Users\User\Downloads\นักโฆษณา-advertiser.md`; more files will follow **in the same structure**.

Phase A (card-design bake-off) is **COMPLETE**. All three card designs are picked and built. Phase B builds the real module: schema → extractor → seed assertions → audio → study flow. **Nothing is committed yet** (all Advanced-Thai files are untracked; `git status` shows `?? app/advanced-thai/`, `?? components/advanced-thai/`, `?? lib/advanced-thai/`, `?? seed/advanced-thai/`, plus `M app/globals.css`, `M components/lang-sync.tsx`).

## Completed (this session) — all VERIFIED, not assumed
- **Card designs picked by the owner** (from a 9-way bake-off): vocab **V1 Lexeme Slab**, grammar **G1 Slot Frame**, phrases **PS1 Phrase Slab** (the Mandarin card, in Thai). The 6 losers and every token family only they consumed are **deleted**.
- `app/globals.css` — `[data-lang="advanced-thai"]` triad (indigo `#4C5FD5` / copper `#C2703F` / celadon `#7FB8A4`) + `--pos-*`, `--register-*`, `--morph-*`, `--pattern-fn-*`, `--slot-empty-*`. All AA-verified; contrast table appended at the top of the file.
- `seed/advanced-thai/types.ts` — the content contract (`VocabEntry` / `GrammarPattern` / `PhraseEntry` / `Theme`).
- `seed/advanced-thai/themes/nak-kosana.ts` — real hand-extracted content (10 vocab / 5 patterns / 14 phrases). **This is the reference output the extractor must imitate.**
- `components/advanced-thai/bakeoff/` — `kit.tsx`, `vocab-lexeme-slab.tsx`, `grammar-slot-frame.tsx`, `phrase-slab.tsx`, `bakeoff-board.tsx`.
- `app/advanced-thai/bakeoff/page.tsx` (owner-gated), `lib/advanced-thai/access.ts` (an **allow-list**, so unknown accounts are refused by default).
- `components/lang-sync.tsx` — prop widened to accept `"advanced-thai"` (display only).

## Remaining tasks
Full plan with all detail: **`.claude/plans/active-plan.md`** — read it, it is the spec.
1. **B0** — Branch the Neon DB. (`.env.local`'s `DATABASE_URL` **IS PRODUCTION**.)
2. **B1** — Schema: `at_themes`, `at_cards` (`kind` discriminator + `payload jsonb`), `at_review_states`, `at_review_logs`. Reuse `lib/review/scheduler.ts`; do NOT fork it. Then add `"advanced-thai"` to `ActiveMode`, `setActiveMode` (coerce — owner only), `app/page.tsx`, `ModeToggle`, `BottomNav`.
3. **B2** — `scripts/generate-advanced-thai-deck.ts` (LLM extractor, modelled on `scripts/generate-deck.ts`). Owner reviews the JSON before seeding.
4. **B3** — `scripts/seed-advanced-thai-db.ts` with assertions that abort BEFORE touching the DB.
5. **B4** — Audio: extend `scripts/generate-thai-audio.ts`, new `audio/advanced-thai/` prefix, `--dry` cost gate.
6. **B5** — Study flow: `app/advanced-thai/page.tsx`, dispatch on `card.kind`, move components out of `bakeoff/`.

## Next steps (start here)
1. **Ask the owner the two open decisions** (both are in `active-plan.md` under "Decisions to take BEFORE writing code"):
   - **Per-word audio, or whole-phrase only?** 122 phrases × ~8 words ≈ **1,000+ clips per theme** vs ~130. This is most of the TTS spend — an order-of-magnitude cost difference. Decide before B4.
   - **New-card gating?** Mandarin has the HSK band gate; Advanced Thai could ship ungated, theme by theme.
2. **B0 — branch the DB before anything else.** Confirm `DATABASE_URL` points at the Neon branch, not prod, and say so out loud before running any migrate/seed/SQL.
3. Then B1 (schema), following `active-plan.md`.

## Key decisions + rationale
- **A "phrase" = one space-delimited CLAUSE of the source document.** Thai spaces separate *clauses*, not words, so the text already marks its own phrase boundaries. Measured: this yields **122 phrase cards** for `นักโฆษณา` (median 24 / max 71 Thai chars). Rejected: one card per source line — the longest is **439 characters**, which no flip card can hold at a readable size.
- **Phrase card = the Mandarin card, unchanged.** Owner's call. Its word-by-word chip row does more work in Thai than in Mandarin: the front face has *no spaces at all*, so the row answers a question the front actually asked. Segmentation is the skill.
- **Segments, not character offsets.** Grammar highlights and word splits are authored as ordered segment arrays, never `[start, end]` offsets — Thai stacks vowels/tone marks, so offsets are neither hand-authorable nor reviewable.
- **New `at_*` tables, not the existing `cards`/`words`.** Those are Mandarin-shaped in their column names (`whole_pinyin`, `hanzi`), and `scripts/refresh-seed-db.ts` already warns in writing that the shared library is not split per language.
- **`"advanced-thai"` was deliberately NOT added to `ActiveMode` in Phase A** — `app/page.tsx` branches on it to pick a home screen, and none exists yet; adding it would let a learner persist into a mode with nothing to render. B1 adds it *together with* the home screen. `learner_settings.active_mode` is plain `text` with no constraint → **no migration needed for the mode itself.**
- **Access is an allow-list, not a deny-list** (`lib/advanced-thai/access.ts`). A deny-list would admit any future account by default — the wrong failure mode for a personal course.

## Dead ends — do not retry
- **Do not re-open the card designs.** Six were built, shown, and rejected (Dictionary Entry, Root Web, Minimal Pair, Annotated Sentence, Chunk Reveal, Dialogue Bubble, Cloze Strip). They and their tokens are deleted on purpose.
- **Do not interpolate Tailwind class names** (`bg-[var(--pos-${x})]`). Tailwind v4 scans source statically and produces no CSS. Every token class must be a **literal** string in a lookup map — see `components/advanced-thai/bakeoff/kit.tsx`.
- **Do not use `justify-center` + `overflow-y-auto` on one flex column** for a card face. It **clips overflow above the scroll origin**, unreachable. Use fixed-header + a scroll container whose child is `min-h-full justify-center` (already done in `phrase-slab.tsx` / `vocab-lexeme-slab.tsx`). ⚠️ **`components/card-back.tsx` (Mandarin) still has this bug** — safe only because Mandarin phrases are short.
- **Do not hash TTS blob paths on text alone.** Mandarin's `generate-audio.ts` does; it is a latent voice-hash bug. Copy `generate-thai-audio.ts`, which hashes `(provider, model, voice, language, text)`.

## Verification evidence (Phase A, end state)
- `npx tsc --noEmit` → exit 0, no output.
- `npm run lint` → exit 0, no output.
- Content invariants (throwaway tsx) → `14 phrases (4-71 chars), 10 vocab, 5 patterns — 0 problem(s).` Every clause's `words.join("")` reproduces `thai` minus punctuation; every grammar slot name appears in its frame. **Lift this check into `scripts/seed-advanced-thai-db.ts` (task B3).**
- Access guard (throwaway tsx) → 9/9 pass. Both beta testers (`prancer@gmail.com`, `goonerrafat@gmail.com`) → `false`; unknown email → `false`; owner → `true` (case-insensitive, trimmed).
- Browser-driven at `localhost:3000/advanced-thai/bakeoff`, signed in as owner: all three cards render on real content, in **both** themes and both Thai letterforms, verified at the **71-character worst-case clause**. A dev server may still be running on port 3000 (PID 18436).
- **NOT verified:** reduced-motion at OS level (the code path is `FlipCard`'s `useReducedMotion` branch, lifted unchanged from the shipped `review-session.tsx`).

## Read before starting
1. `C:\Users\User\Software Projects\Language-Learning-App\.claude\plans\active-plan.md` — the Phase B spec. Start here.
2. `C:\Users\User\Software Projects\Language-Learning-App\.claude\plans\implementation-summary.md` — Phase A handoff.
3. `C:\Users\User\Software Projects\Language-Learning-App\seed\advanced-thai\types.ts` — the content contract.
4. `C:\Users\User\Software Projects\Language-Learning-App\seed\advanced-thai\themes\nak-kosana.ts` — reference output for the extractor.
5. `C:\Users\User\Software Projects\Language-Learning-App\lib\db\schema.ts` — where the `at_*` tables go.

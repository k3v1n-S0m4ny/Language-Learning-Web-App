# Implementation summary — Advanced Thai (M16) Phase B

Status: **B0–B5 COMPLETE on the `advanced-thai` Neon branch. NOT on main. NOT in production.**

(Supersedes the Phase A bake-off handoff, which is complete — all three card designs were picked.)

## Decisions taken (owner, this session)

1. **Whole-phrase audio only — no per-word clips.** The handoff framed this as "most of the TTS
   spend, an order-of-magnitude cost difference." Measured, that was wrong: the whole theme is
   ~3,500 Thai characters, so at Google Neural2's $16/1M it is **~$0.05 either way**. The order of
   magnitude is in blob COUNT (~130 vs ~500-1,000), not dollars. Re-framed as a product decision;
   owner chose whole-phrase. The word chips on a phrase card now carry no audio button.
2. **Ungated, theme-by-theme.** No HSK-style mastery gate. A theme's cards are available the moment
   the theme is seeded — the seeding is the gate.

## Completed

### B0 — Database branched (safety-critical)
- Confirmed out loud that `.env.local`'s `DATABASE_URL` endpoint `ep-calm-frost-ap4nd591` **IS the
  Neon `main` branch = PRODUCTION** (verified via `neonctl connection-string main`).
- Created branch `advanced-thai` (`br-frosty-sound-apy0ydw1`, endpoint `ep-rapid-bread-apr0jvw4`).
- Repointed `.env.local`; the production URL is preserved in a commented block right above it.
- Verified by connecting: host is the branch, 15 tables copied, **not production**.
- **Killed a stale dev server (PID 18436) that had booted before the repoint and was therefore still
  connected to production.**

### B1 — Schema + mode wiring
- `at_themes`, `at_cards`, `at_review_states`, `at_review_logs` in `lib/db/schema.ts`.
- **`at_cards.id` is a content-derived slug, not a UUID.** `at_review_states.card_id` cascades ON
  DELETE, so random ids would mean a re-seed could only delete-and-reinsert — silently destroying
  every FSRS interval. Content-derived ids make a re-seed an UPSERT. **Proven on the branch**: edited
  a gloss, re-seeded, the card updated and the review history (reps=4, stability=3.2) survived.
- Migration `0007_quick_rumiko_fujikawa.sql` — **purely additive** (4 CREATE TABLE + FKs + indexes,
  zero ALTER/DROP on any existing table). Applied to the branch.
- `"advanced-thai"` added to `ActiveMode`; `setActiveMode` **coerces** non-allowlisted accounts away
  from it (Server Actions are directly POSTable). `showAdvancedThai` threaded through
  ModeToggle/TopBar/BottomNav/layout/ThaiHome.
- Deliberately did NOT carry over review_logs' `(learner_id, card_id)` index — it exists only for the
  HSK gate, and this course is ungated.

### B2 — Extractor
- `seed/advanced-thai/split.ts` — deterministic clause reader. Splits on the document's own spaces
  (Thai spaces separate clauses, not words), rejoining the repetition mark `ๆ` to the word it
  repeats. Exports `normalizeForCompare`, shared with the seed assertions so the two can never
  disagree about what "faithful" means.
- `scripts/generate-advanced-thai-deck.ts` — `--dry` gate, resumable, self-checking (a batch whose
  word splits don't rebuild their clause is retried once with its own wrong answer fed back).
- Ran on `นักโฆษณา` with **gpt-5.4** (owner-approved; verified it exists on the key rather than
  assuming). **114 phrases / 41 vocab / 12 grammar.**

### B3 — Seed + assertions
- `scripts/seed-advanced-thai-db.ts`. Assertions run BEFORE any DB write and abort the run.
- Orphans are reported but **not deleted without `--prune`** — a card vanishing from the JSON is more
  likely an editing slip than an intention, and deleting takes its review history with it.
- Seeded **167 cards** (41 vocab + 12 grammar + 114 phrases). Idempotent (re-seed: 0 new, 167 updated).

### B4 — Audio
- `scripts/generate-advanced-thai-audio.ts`. Prefix `audio/advanced-thai/`, voice `th-TH-Neural2-C`.
  Hashes the `(provider, model, voice, language, text)` tuple, NOT text alone (Mandarin's
  `generate-audio.ts` still has that latent voice-hash bug).
- Owner-approved run: **145 unique clips synthesized, 10 deduped, 3,491 chars, $0.056 actual.**
- 155/167 cards have audio; the 12 grammar cards correctly have none. Sampled URL: HTTP 200,
  audio/mpeg, 48KB. Ledger: `.artifacts/advanced-thai-audio/ledger.json`.

### B5 — Study flow
- `lib/advanced-thai/{types,queries,actions}.ts`. Three-tier queue (ready > new > future-today) lifted
  from Mandarin. **`lib/review/scheduler.ts` is reused, not forked** — there is one scheduler.
- Cards promoted out of `bakeoff/` and converted from self-flipping demos to session-controlled.
  The bake-off board and its page were **deleted** (a decision tool whose decisions are made).
- Grammar cards deliberately do NOT flip: the frame is what the examples must be read against.
- `app/advanced-thai/[theme]/page.tsx` returns `notFound()` for non-allowlisted accounts — not a
  redirect, not an access-denied page.

## Bugs found and fixed (both found by verifying, not by reasoning)

1. **All 29 grammar example glosses were Thai, not English** — the model restated the source sentence
   where its translation belonged. The cards rendered *perfectly*; only reading one caught it. Root
   cause: the grammar prompt said "gloss" without saying "in English" (the phrase prompt said so
   explicitly, and its glosses were fine). Fixed the prompt, **added an `assertEnglish` seed
   assertion** (verified it fires: 29 problems, exit 1, DB untouched), regenerated grammar, pruned 5
   stale cards.
2. **Duplicate cards.** Three clauses repeat in the document (`เช่น` ×3, `ที่เหมาะสม` ×2, `นักโฆษณา` ×2),
   producing identical duplicate flashcards. Caught by the seed's duplicate-id assertion *before* the
   DB was touched. Extractor now dedupes: 118 clause occurrences → **114 distinct cards**.
3. **Mode toggle unreachable.** `showAdvancedThai` was threaded into TopBar but never passed from the
   Mandarin or Thai homes — so the only way into Advanced Thai was from Advanced Thai. Found by
   driving the browser.

## Spec deviations

- **114 phrases, not the 122 the plan predicted.** The splitter excludes the H1 title and the table's
  two column labels as document furniture (the last Mandarin commit, `c72b561`, was removing exactly
  that kind of header-derived card), then dedupes the 3 repeated clauses. The distribution's extremes
  match the hand-extracted reference *exactly*: max 71 chars, min 4, same three longest clauses.
- **Advanced Thai has its own empty state, not `EmptyState`.** The plan said reuse it; it takes a
  `GateStatus` and renders `hskLabel`, and this course is ungated — reusing it would mean fabricating
  a gate.
- **No `/advanced-thai/stats` page**, so the bottom nav hides its Progress tab rather than link to a
  404. The theme picker carries the per-theme counts instead.

## Commands run

| command | exit |
|---|---|
| `neonctl branches create --name advanced-thai` | 0 |
| `npx drizzle-kit generate` / `migrate` | 0 / 0 |
| `generate-advanced-thai-deck.ts --dry` then real (gpt-5.4) | 0 |
| `seed-advanced-thai-db.ts --dry` → caught 29 gloss + 4 dup problems | **1 (correctly aborted)** |
| `seed-advanced-thai-db.ts` (after fixes) | 0 |
| `generate-advanced-thai-audio.ts --dry` then real | 0 |
| `npx tsc --noEmit` | 0 |
| `npm run lint` | 0 |
| `npm run build` | 0 |
| access guard (10 cases + collision check) | 0 |

## Browser verification (localhost:3000, signed in as owner, against the branch)

- Mode toggle shows Mandarin | Thai | **Advanced**; switching persists and renders the Advanced home.
- Theme picker: นักโฆษณา · Advertiser, real summary, 0 due · 10 new · 0/167 seen.
- **All three card kinds render on real content**: Lexeme Slab (morphology strip นัก+โฆษณา, live audio),
  Slot Frame (causative, English glosses, slots painted to match the frame), Phrase Slab (70-char
  clause, 11 word chips, whole-phrase audio, **no per-word audio buttons**).
- **FSRS advances**: rated Good → counts moved Due 0→1 / New 10→9; the card resurfaced when its 10m
  learning step elapsed, and its hints had genuinely changed (Good 10m → 4d, Easy 16d → 8d).
- Read-Thai unchanged (units, mastery rings, checkpoint all intact). Mandarin unchanged.
- Test FSRS state planted during verification was **deleted**; `new_cards_per_day` restored to 10.

## NOT done / next

1. **Owner review of the JSON** (`seed/advanced-thai/themes/nak-kosana.generated.json`) — the plan
   requires this and it has not happened. Specific things to look at:
   - 8 of 12 grammar patterns are classed `connector`, which is flat. It files `โดย` as a connector
     where the hand reference calls it **passive**, and `ยิ่ง...ก็ยิ่ง` as connector where the reference
     says **comparative**.
   - It calls `นักโฆษณา` register `technical`; the reference says `formal`.
   - Low-value cards exist because they are real clauses: `เช่น` ("for example"), `โอเค` ("OK").
2. **Nothing is committed.** All Advanced-Thai files are still untracked.
3. **Production is untouched** — no migration, no seed, no audio, no mode. That is the last step and
   needs an explicit go.
4. `.env.local` still points at the **branch**. Restore the commented production URL when done.

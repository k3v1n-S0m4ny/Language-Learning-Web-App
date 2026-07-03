---
status: COMPLETE
updated: 2026-07-03
---

# M13 — Read Thai: tone-rules engine (unit 10), syllable decode (unit 11), word-bank expansion

Plan root: `C:\Users\User\Software Projects\Language-Learning-App\.claude\plans\`
Scope source: M13 bullet of the approved Read-Thai design (Appendix in
`m11-archive--active-plan.md` — authoritative) + M12 carried-forward residuals
(ALL four folded in, owner-approved 2026-07-03).
Out of scope: special signs (unit 12), numerals (13), phrase splitting (14),
any new /thai/stats visualizations.

## Locked decisions (owner-approved 2026-07-03, this session)

- **Unit 10 = ONE branching assembly drill** mirroring the doc's full flowchart:
  step 1 pick the initial-consonant class → step 2 "tone mark present?" — if
  marked, pick the tone from the mark+class grid; if unmarked, continue
  live/dead → (dead:) vowel length → tone. Per-step feedback. A separate
  tone-mark grid MC drill type also ships as a warm-up. NOT two assembly
  variants; NOT MC for the assembly itself.
- **Unit 11 = word → full IPA, 4 options.** Distractors mutate exactly one
  dimension each (wrong tone / wrong vowel length / wrong final) where the word
  allows it. Gloss + audio revealed after answering.
- **Word bank sourcing = curate + web-verify.** The orchestrator curates the
  candidate list and verifies EVERY word's spelling/IPA/tone/gloss against
  online dictionaries (thai-language.com / Wiktionary) BEFORE implementation;
  the vetted list is delivered as `.claude/plans/m13-word-bank.md` and is the
  implementer's content source of truth. The implementer does NOT invent words
  (no WebFetch in its toolset — it integrates the vetted artifact verbatim).
- **All four M12 LOW residuals fold in** (see A6, A4).

## Validation Contract (assertions)

### A1 — Word-bank expansion + tone metadata
- `seed/thai/` word bank grows from ~30 to **80–120 real Thai words**, every
  word taken verbatim from the vetted artifact `.claude/plans/m13-word-bank.md`
  (which cites a dictionary source per word). Coverage: every tone-grid cell
  of the doc's tone rules (class × live/dead × vowel-length for unmarked;
  class × mark for marked) appears **≥3 times**; final /t/ (currently only รถ)
  gets ≥3 additional words; every final type and tricky vowel shape appears
  several times.
- `SyllableItem` metadata extended with the tone-derivation fields units 10/11
  need (at minimum: initial-consonant class, live/dead, vowel length, tone
  mark (or none), resulting tone; full IPA already exists in `initialIpa`).
  ALL existing ~30 words are backfilled with the new fields.
- The `drillable:false`-when-`finalSound:null` rule is revisited: words with no
  final ARE reachable via the new unit-10/11 drill types; drillable flags and
  reachability must agree (the seed invariant enforces this — it must pass).
- `npm run seed:thai` refreshes idempotently; Mandarin tables untouched;
  before/after item counts captured as evidence.

### A2 — Unit 10: tone-rules assembly engine
- New drill type **`tone-assembly`** (branching builder, NOT MC): given a real
  word, the learner taps class → mark-present branch → (unmarked: live/dead →
  vowel length if dead) → final tone, with per-step correct/incorrect feedback.
  One `thai_attempts` row per completed question (drillType `tone-assembly`,
  expected vs chosen FINAL tone); a wrong step surfaces immediately but the
  question still resolves to one logged attempt.
- New drill type **`mark-tone`**: tone-mark grid MC — shown a marked syllable
  (or mark+class combination), pick the resulting tone from the five tones.
- Unit 10 lesson page renders the tone-rules content (flowchart, live/dead,
  mark+class grid) from the research doc via the typed seed module, consistent
  with the existing lesson framework.
- Unit 10 unlocks per the standard ≥90% rule (gated on unit 9); the unit map
  shows it as a real unit (no longer "coming soon").
- `lib/thai/reachability.ts`: `DrillTypeId` gains the new types,
  `DRILLED_UNITS` gains 10, `canDrillTypeScore` gains matching branches, and
  `maxAchievablePercentForUnit` returns 100 for unit 10 (seed fails loudly
  otherwise).

### A3 — Unit 11: syllable decode
- New drill type **`word-ipa`**: show the Thai word; pick the correct full IPA
  (segments + tone) from 4 options; distractors each mutate exactly one
  dimension (tone / vowel length / final) where the word allows, falling back
  to other single-dimension mutations when it doesn't. Gloss + audio (play
  button or autoplay) revealed after answering. Attempts logged with drillType
  `word-ipa`, expected vs chosen IPA.
- Unit 11 lesson page + unit-map activation, same framework as A2.
- Reachability wiring for unit 11 identical in kind to A2's (DRILLED_UNITS
  gains 11, invariant passes).

### A4 — Unit 6 listening drill (M12 residual)
- New tracked drill type **`audio-word`** for unit-6 word-bank items with
  synthesizable audio: hear the clip → pick the word (MC, adversarial
  distractors from confusable words). Covered by the reachability guard via
  the structural `canEverHaveAudio` rule (kind `syllable` → true).
- Adding this requirement may legitimately RE-LOCK unit 6 progress for the
  existing learner (M12 precedent: intended behavior, not a regression) —
  QA verifies the unit-6 percentage recomputes correctly rather than breaking.

### A5 — Audio for new words (paid-gated)
- `scripts/generate-thai-audio.ts` covers the new word-bank rows (voice locked:
  Google Chirp3-HD `th-TH-Chirp3-HD-Achernar`; key `GOOGLE_TTS_API_KEY` in
  `.env.local`, strip quotes; Blob keying already hash-based). Idempotent —
  existing 103 clips are reused, not regenerated.
- The batch run is a **PAID GATE**: the implementer prepares the manifest and
  STOPS; the orchestrator shows clip count + estimated cost and waits for the
  owner's explicit go (expected within Google's free tier → $0.00, gate
  applies regardless). Ledger appended to `.artifacts/thai-audio/ledger.json`.
- After the gated run: every item any M13 audio-dependent drill needs
  (unit-11 reveal, unit-6 `audio-word`) has a non-null `audioUrl`; count-query
  evidence captured.

### A6 — M12 residual fixes
- **Unit ≤2 unlock bypass**: `submitThaiAttempt` no longer accepts unit-2
  attempts unconditionally — unit 2 is only submittable once unit 1's lesson
  marker is read (server-side, never trusting the client).
- **Unlock-math regression guard**: a mechanical check (unit test or seed-time
  invariant with a crafted fixture) that fails if
  `lib/thai/queries.ts::getUnitSummaries` ever regresses from per-unit
  `reachableDrillTypesForUnit` back to the cross-unit
  `allReachableDrillTypesForItem` union (currently guarded by comments only).
- **Backfill CASE coverage**: the synthetic test for the M12 drillType backfill
  covers all 6 kind-fallback CASE branches (was 1/6).

### A7 — Quality gates (evidence required)
- `npm run lint`, `npx tsc --noEmit`, `npm run build` all pass; verbatim output
  in the implementation summary; independently re-run by review and QA.
- Regression: Mandarin mode unchanged; Thai units 1–9 drills still work
  (including unit-9 audio-tone and the tone-confusion matrix); unit-6
  percentage recomputation per A4 verified behaviorally.

## Feature → assertion map
word bank→A1 · unit 10 engine→A2 · unit 11 decode→A3 · unit-6 listening→A4 ·
audio batch→A5 · residual fixes→A6 · gates/regression→A7

## Done criteria
A1–A7 PASS with evidence; QA validates A2–A4 behaviorally in the running app
with real audio; the paid batch ran exactly once behind the owner gate; the
vetted word-bank artifact exists with per-word dictionary citations.

## Final status (2026-07-03) — M13 COMPLETE

All assertions PASS: A1 (word bank 30→100, verbatim from the vetted artifact,
99/99 tone-grid self-consistency, seed 125→195 items idempotent), A2–A4 (QA
behavioral validation in real browser: 45 tone-assembly questions across all 4
branch shapes with 0 step-shape mismatches, 45 word-ipa questions with 0
reveal-gating violations, unit-6 audio-word proven to gate the percentage),
A5 (paid batch ran exactly once behind the owner gate: 74 generated / 108
reused, 182/195 items with audio_url, est $0.0196 total manifest, expected
$0.00 free tier, ledger `.artifacts/thai-audio/ledger.json`), A6 (all three
residual fixes verified, A6.1 re-forged via direct server action both ways),
A7 (gates exit 0 re-run independently by all three agents; Mandarin + Thai
units 1–9 regression clean).

Cycle took 2 implementation rounds: review round 1 found 1 HIGH (tone-assembly
asked the vowel-length step for mid/high-class unmarked dead syllables —
length only matters for low class per the doc) + 3 LOW; round 2 fixed the HIGH
and 2 LOWs. Final review verdict: APPROVE-WITH-FINDINGS. QA verdict: PASS.

Carried-forward non-blocking residuals (revisit in M14):
- Regression guard proves unitMasteryStats scoping only; a queries.ts caller
  bypassing it entirely would not be caught (reviewer: awareness-only).
- Artifact's free-text notes column not exhaustively transcribed into
  sourceNote for all 70 new rows (core metadata columns fully captured).
- Existing learner's unit-6 progress legitimately re-locked by the new
  audio-word requirement (intended, M12 precedent — needs re-drilling).

Not yet done: commit + deploy (owner decides; deploy = push to main — there
is no separate prod DB, data ops already live: 195 items, 182 with audio).

## Implementation notes (non-binding except where cited)
- **AGENTS.md**: this repo's Next.js (16.2.6) has breaking changes — read
  `node_modules/next/dist/docs/` guides before writing Next.js code.
- Context files: `lib/thai/reachability.ts` (READ ITS HEADER COMMENTS — the
  bug-class history is binding context), `lib/thai/drill.ts`, `lib/thai/tone.ts`,
  `lib/thai/mastery.ts`, `lib/thai/queries.ts`, `lib/thai/actions.ts`,
  `seed/thai/types.ts`, `seed/thai/items.ts`, `scripts/seed-thai-db.ts`,
  `scripts/generate-thai-audio.ts`, `app/thai/*`,
  `seed/thai/research/reading-thai-script.html` (curriculum source, ~43k
  tokens — read the tone-rules sections for unit 10/11 lesson content).
- **DB WARNING (memory `vercel-prod-db-is-dev-db.md`)**: `.env.local`
  DATABASE_URL IS production. `seed:thai` is the established idempotent
  refresh pattern and has run against this DB throughout M11/M12; any RISKIER
  schema/data experiment needs a Neon branch first. No destructive ad-hoc SQL.
- Machine gotcha: after any dev-server OOM crash, `rm -rf .next` before
  `npm run dev` (stale Turbopack cache once spawned ~2k postcss workers).
- No FSRS. No placeholder words, stub IPA, or invented glosses — vetted
  artifact only.

---
status: COMPLETE
updated: 2026-07-03
---

# M12 — Read Thai: audio batch, drillType migration, tone-ear unit 9, listening drills, confusion matrix

Plan root: `C:\Users\User\Software Projects\Language-Learning-App\.claude\plans\`
Scope source: M12 bullet of the approved Read-Thai design (Appendix in
`m11-archive--active-plan.md` — authoritative) + M11 carried-forward residuals.
Out of scope: tone rules (unit 10), syllable decode (11), special signs (12),
numerals (13), phrase splitting (14), word-bank expansion to 80–120 (M13).

## Locked decisions (owner-approved, this session)

- **TTS voice: Google Chirp3-HD `th-TH-Chirp3-HD-Achernar`** — won the 3-way
  bake-off (vs Kore, OpenAI nova) and the real-word /khaa/ test-clip sign-off
  ("go all with Achernar", 2026-07-03). Ledgers: `.artifacts/tts-bakeoff/ledger.json`,
  `.artifacts/tts-test-clips/ledger.json`.
- **thai_progress gains a per-drillType dimension** (unique learner+item+drillType)
  BEFORE the perception drills, so the tone-confusion matrix gets clean per-skill data.
- Batch generation is a PAID GATE inside this cycle: the implementer prepares the
  clip manifest + script and STOPS; the orchestrator shows clip count + cost and
  waits for the owner's go before running the batch. Expected: within Google's
  1M-char/mo free tier → billed $0.00, but the gate still applies.

## Validation Contract (assertions)

### A1 — thai_progress drillType migration
- `thai_progress` gains `drillType` text NOT NULL; unique constraint becomes
  (learnerId, itemId, drillType). Migration via the repo's drizzle workflow.
- Data migration for existing rows: each row is assigned its dominant drillType
  derived from that learner+item's `thai_attempts` history (most attempts; ties →
  most recent). Rows with no attempts get the item-kind's default drill type.
  No progress rows dropped; before/after counts captured as evidence.
- Drill engine reads/writes streaks per (item, drillType). **Mastery aggregation
  (owner-approved 2026-07-03, STRICT): an item is mastered only when EVERY drill
  type reachable for its kind has a 3-streak; unit % and the ≥90% unlock rule use
  this strict per-item mastery. Units may legitimately RE-LOCK when M12 adds audio
  drill types to units 2–8 — this is intended behavior, not a regression.**
- `lib/thai/reachability.ts` extended: every (drillable item × its drill types)
  is reachable; seed fails loudly on orphans.

### A2 — Thai audio batch pipeline (paid-gated)
- New script `scripts/generate-thai-audio.ts` (+ npm script `audio:thai`):
  reads the typed Thai seed, produces the full clip manifest (letter names,
  vowel sounds, tone-ear sets incl. the อา/อ่า/อ้า/อ๊า/อ๋า family + 2–3 more
  minimal sets, drill syllables/words), synthesizes via Google Chirp3-HD
  Achernar (`GOOGLE_TTS_API_KEY` from `.env.local` — strip surrounding quotes),
  uploads to Vercel Blob, and writes `audioUrl` back into the seed/DB rows.
- **Blob keying fixed**: paths are keyed by hash of (provider, model, voice,
  language, text) — NOT text alone — under an `audio/thai/` prefix, so a future
  voice change can never silently reuse stale clips. (Latent bug in
  `scripts/generate-audio.ts:33-36`; fix the Thai path; existing Mandarin blob
  URLs must keep working unchanged.)
- Idempotent + resumable like the Mandarin pipeline (list-then-reuse, no overwrite).
- Cost ledger appended per run (est chars × $30/1M); actual run happens ONLY
  after the in-cycle paid gate (owner go on clip count + cost).
- After the gated run: every item that any M12 audio drill needs has a non-null
  `audioUrl`; seed/DB verified (count query evidence).

### A3 — Tone-ear unit 9
- Unit 9 unlocks per the standard rule and renders: listen-and-repeat tiles
  (minimal-pair families with tone-contour sparklines; playback only, unassessed
  production) + a tracked **audio→tone** perception drill (hear a clip, pick the
  tone; MC over all five tones; attempts logged with drillType `audio-tone`).
- Unit 9 items exist in `thai_items` (kind per design), seeded, audio wired.

### A4 — Listening drill types
- New tracked drill types: **audio→letter** for consonant units 2–5, and
  **audio→form** for vowel units 7–8, using each item's `audioUrl`; adversarial
  distractors from confusable sets.
- M11 residuals folded in: **sound→form reverse vowel drill** ships (audio-based);
  `expectedAnswerFor` cross-checks drillType vs item kind (LOW residual).
- ฃ/ฅ never drillable; all new drill types covered by the reachability guard.

### A5 — Tone-confusion matrix on /thai/stats
- `/thai/stats` gains a 5×5 tone-confusion matrix (expected tone vs chosen tone)
  from `thai_attempts` rows with drillType `audio-tone`, styled consistently with
  the existing stats components; renders an empty-state before data exists.

### A6 — Quality gates (evidence required)
- `npm run lint`, `npx tsc --noEmit`, `npm run build` all pass; verbatim output
  in the implementation summary; independently re-run by review and QA.
- Mandarin mode and existing Thai units 1–8 behavior unchanged (QA regression:
  mandarin learner sees zero difference; thai learner's M11 drills still work).

## Feature → assertion map
drillType migration→A1 · audio pipeline+batch→A2 · unit 9→A3 ·
listening drills→A4 · confusion matrix→A5 · gates/regression→A6

## Done criteria
A1–A6 PASS with evidence; QA validates A3–A5 behaviorally in the running app with
real generated audio; the paid batch ran exactly once behind the owner gate.

## Final status (2026-07-03) — M12 COMPLETE

All assertions PASS: A1–A2 (implementation + review evidence; paid batch ran exactly
once behind the owner gate — 103 clips, 408 chars, est $0.0122, billed $0.00 free
tier, ledger `.artifacts/thai-audio/ledger.json`), A3–A5 (QA behavioral validation in
real browser with real server actions, qa-summary.md + 10 screenshots in
`.claude/plans/qa-artifacts/`), A6 (gates re-run independently by all three agents,
all exit 0; Mandarin + Thai M11 regression clean).

Cycle took 2 implementation rounds: review round 1 found 2 CRITICALs (cross-unit
strict-mastery deadlock capping units at 0–11%; hidden vowels requiring an impossible
audio-form drill) + 1 HIGH (no server-side unlock check). Round 2 scoped strict
mastery per-unit (unit 6 now shows 57 items — expected visible change) and fixed
both CRITICALs. Final review verdict: APPROVE-WITH-FINDINGS (LOWs only). QA verdict:
PASS on all A1–A6.

TTS voice locked: Google Chirp3-HD `th-TH-Chirp3-HD-Achernar`. Blob stale-clip bug
fixed for Thai (paths hashed from provider+model+voice+lang+text). audioUrl wired
into 103/125 dev-DB thai_items (nulls by design: ฃ/ฅ, finals, hidden vowels,
non-drillable syllables, lesson marker). Backfill SQL validated on synthetic rows.

Carried-forward non-blocking residuals (revisit in M13):
- submitThaiAttempt allows unit ≤2 unconditionally (learner could bank unit-2
  mastery before marking unit 1 read via direct action call).
- Seed invariant can't catch a queries.ts-only regression back to cross-unit
  unlock math (guarded by code comments only).
- Backfill synthetic test covered 1 of 6 kind-fallback CASE branches.
- Tone sparkline coords hand-approximated (comment says so).
- Unit-6 word audio only used by the "Hear it" reveal button (no tracked unit-6
  listening drill was specced).
- Word bank still ~30 words; expansion toward 80–120 continues through M13.

Post-plan ship steps (deploy + prod migrate/seed/audio-wire) tracked in
`read-thai-m12.handoff.md`.

## Implementation notes (non-binding except where cited)
- **AGENTS.md**: this repo's Next.js (16.2.6) has breaking changes — read
  `node_modules/next/dist/docs/` guides before writing Next.js code.
- Context files: `lib/db/schema.ts`, `lib/thai/*` (esp. `reachability.ts`),
  `app/thai/*`, `seed/thai/items.ts`, `scripts/seed-thai-db.ts`,
  `scripts/generate-audio.ts` (pattern + bug), `.artifacts/tts-test-clips/generate-test-clips.mts`
  (working Chirp3-HD call shape), `components/stats/*`.
- Machine gotcha: after any dev-server OOM crash, `rm -rf .next` before
  `npm run dev` (stale Turbopack cache once spawned ~2k postcss workers).
- No FSRS. No placeholder audio or stub clips — real generated clips only,
  gated per the paid protocol.

---
status: COMPLETE
updated: 2026-07-03
---

<!--
M14 BUILD COMPLETE (2026-07-03). Dev-cycle result:
- Implement: PASS (seed idempotent +46→241 rows; tsc/lint/build exit 0).
- Review: PASS — 0 CRITICAL/HIGH/MEDIUM, 4 cosmetic LOW (stale queries.ts:55
  comment; promptKind CSS-bucket reuse; empty IPA on non-drilled ฯ example;
  deferred memory update). Reviewer independently re-ran all commands.
- QA: PASS — A1–A8 all validated. Headline risk (phrase-split client/server
  serialization drift) disproven by live-data code-trace: correct set scores
  correct, wrong set scores wrong, both sides share serializeBoundaries().
  Live DOM click-through not possible (auth-gated); compensated via real
  runtime functions against real DB.
Assertions A1–A8: all met.
Outstanding OWNER gates: (1) paid audio batch A6 (~22 new clips, ~$0.02 if all
regenerate — hash-keyed Blob-reuse means real spend is only new clips);
(2) commit + push + Vercel prod verify.
-->


# M14 — Read Thai: special signs & silent leaders (unit 12), numerals (unit 13), spaceless reading (unit 14)

Plan root: `C:\Users\User\Software Projects\Language-Learning-App\.claude\plans\`
Scope source: M14 bullet of the approved Read-Thai design (Appendix in
`m11-archive--active-plan.md` — authoritative) + research doc §8 (special signs
& silent leaders), §9 (numerals), §10 (spaceless reading) quoted verbatim below.
This is the **FINAL Read-Thai milestone** — after it ships the 14-unit course is
complete.
Out of scope: any new /thai/stats visualizations; true/false clusters as a drill
(doc §8 flags them as "standard teaching material rather than a point drawn from
those specific pages" + a source-note caveat — taught in lesson prose only, never
quizzed); regional-Thai anything.

## Locked decisions (owner-approved 2026-07-03, this session — interview)

- **Unit 12 = Full (signs + leaders).** Two visual drill types plus one audio
  listening drill:
  - `sign-function` — recognition MC over ALL FOUR small marks (◌์ silencer,
    ◌็ shortener, ๆ repeat, ฯ abbreviation). ๆ and ฯ ARE drilled here, not
    lesson-only.
  - `leader-tone` — silent-leader word → correct tone (5-way MC).
  - `audio-leader` — hear the leader word → pick its correct written spelling
    (distractors: the same base WITHOUT the leader, and/or a wrong-tone
    confusable — e.g. hear mǎː, choose หมา not มา). Audio-gated (degrades
    gracefully until the paid batch runs).
- **Unit 13 = both directions (visual) + audio.** Three drill types:
  - `numeral-value` — Thai numeral → Arabic value (MC).
  - `value-numeral` — Arabic value → Thai numeral (MC).
  - `audio-numeral` — hear the spoken digit NAME → pick the Thai numeral (MC).
    Audio-gated.
- **Unit 14 = tap-boundary splitting widget, split-only logging.** One drill
  type `phrase-split`: the learner taps between characters to place syllable
  boundaries; the LOGGED answer is the boundary-index set (correct iff it
  exactly matches the canonical set). The per-syllable IPA confirm shown after
  splitting is client-side reinforcement only (mirrors `tone-assembly`'s
  "one server attempt on the final step" contract — earlier steps unlogged).
  NOT MC.
- **Audio = BOTH leader words + numeral names** (~18 clips). Paid gate per the
  Paid AI-Generation Protocol (voice locked `th-TH-Chirp3-HD-Achernar`, Google
  free tier — likely $0.00, gated anyway). Enables `audio-leader` +
  `audio-numeral`.
- **Content sourcing = curate + web-verify BEFORE the cycle** (M13 pattern).
  Leader words, numeral names, and phrases are each verified against
  en.wiktionary.org / thai-language.com by parallel general-purpose agents
  (WebFetch) and delivered as vetted artifacts
  (`.claude/plans/m14-content-{leaders,numerals,phrases}.md`) — merged into
  `.claude/plans/m14-content-bank.md`, the implementer's content source of
  truth. The implementer has NO WebFetch and integrates the vetted content
  verbatim; it does NOT invent words, IPA, or boundary indices. Special-sign
  content comes verbatim from research doc §8 (quoted below) — no external
  verification needed.

## Authoritative rules (research doc §8–§10, quoted verbatim — implement EXACTLY)

Per the M13 lesson (its only HIGH finding was a paraphrase that dropped a
caveat): drills mirror these quotes, NOT any paraphrase.

**§8 small marks:**
- ◌์ (การันต์ kāː.rān) — **Silencer.** "The letter beneath it (and often the one
  before) is not pronounced." E.g. จันทร์ = tɕān 'moon' (the ทร is silent).
- ◌็ (ไม้ไต่คู้ máj tàj kʰúː) — **Shortens the vowel.** "Common with เ and แ in
  closed syllables, e.g. เด็ก dèk̚ 'child'."
- ๆ (ไม้ยมก máj já.mók̚) — **Repeat.** "Say the preceding word twice: เด็ก ๆ =
  dèk̚ dèk̚ 'children'."
- ฯ (ไปยาลน้อย pāj.jāːn.nɔ́ːj) — "Marks a conventional **abbreviation** of a
  longer formal phrase."

**§8 silent tone-leaders:** "Several Low-class sounds — the sonorants ง ญ น ม ย
ร ล ว — have no High-class twin… To fill the gap, Thai writes a silent
High-class ห in front of them; the ห is not pronounced, but it hands its
High-class tone behaviour to the syllable." Compare นา nāː 'rice field'
(Low+live→mid) vs หนา nǎː 'thick' (now High rules→rising). "In the same spirit,
a silent Mid-class อ leads ย in exactly four everyday words — อย่า jàː 'don't',
อยาก jàːk̚ 'to want', อย่าง jàːŋ 'kind, type', and อยู่ jùː 'to be at' — forcing
Mid-class rules." Worked: หมา begins with silent ห before ม; High+live→rising →
หมา = mǎː 'dog' — *not* māː (plain มา 'to come').

**§9 numerals:** digits ๐๑๒๓๔๕๖๗๘๙ = 0-9. "They combine exactly like Western
digits, so ๒๐๒๖ is simply 2026, and a price tag reading ๙๙ means 99."

**§10 spaceless reading** (the three cues the widget teaches): "First, leading
vowels announce a boundary: whenever you see เ แ โ ไ ใ, a new syllable starts
there, because those vowels are always written in front of their consonant.
Second, a vowel shape marks a syllable's extent… Third, a final consonant
closes a syllable, so the next letter must open a new one." Worked: ไปโรงเรียน →
ไป pāj · โรง rōːŋ · เรียน rīan; แมวกินปลา → แมว mɛ̄ːw · กิน kīn · ปลา plāː.

## Validation Contract (assertions)

### A1 — Seed content: new kinds + items (units 12–14)
- `seed/thai/types.ts` `ThaiItem` union gains **three new kinds** (the appendix
  already reserved these names: `numeral|special-sign|phrase`):
  - `SpecialSignItem` (kind `special-sign`, unit 12) — 4 rows (◌์, ◌็, ๆ, ฯ).
    metadata: `signName` (Thai + IPA), `functionKey`
    (`silencer|shortener|repeat|abbreviation`), `functionLabel`, `example`
    ({thai, ipa, gloss}). `drillable:true`.
  - `NumeralItem` (kind `numeral`, unit 13) — 10 rows (๐–๙). metadata: `value`
    (0–9 number), `name` (Thai spelling), `nameIpa` (verified IPA), `tone`.
    `drillable:true`.
  - `PhraseItem` (kind `phrase`, unit 14) — ~15–20 rows. metadata: `syllables`
    (ordered [{thai, ipa, gloss}]), `boundaries` (number[] — code-point indices
    where a new syllable starts, excluding 0), `gloss` (whole-phrase).
    `drillable:true`.
- Silent-leader words: **new kind `LeaderWordItem`** (kind `leader-word`,
  unit 12), NOT reused SyllableItem (keeps unit-12 logic self-contained; the
  unit-6/10/11 sourcing queries filter `kind==="syllable" && unit===6`, so a
  unit-12 row could never be pulled anyway — a distinct kind makes that
  impossible by construction). ~10–12 rows. metadata: `leaderChar` (ห|อ),
  `baseConsonant`, `tone` (Tone), `gloss`, `derivation` (short string, e.g.
  "High(via ห)+live→rising"). Every word taken verbatim from the vetted
  artifact; the four อ-leader words are mandatory.
- All new content taken verbatim from `.claude/plans/m14-content-bank.md`
  (merged from the three per-bucket vetted artifacts). Special-sign rows come
  from doc §8. NO invented content.
- `ALL_THAI_ITEMS` includes the new arrays; `BUILT_UNITS` becomes
  `[1..14]`; `UNIT_TITLES` already has 12–14. `npm run seed:thai` refreshes
  idempotently; Mandarin tables untouched; before/after `thai_items` counts
  captured as evidence (expect +~42 rows: 4 signs + ~11 leaders + 10 numerals +
  ~17 phrases).

### A2 — Reachability wiring (BINDING — `seed:thai` fails loudly otherwise)
- `lib/thai/reachability.ts`: `DrillTypeId` gains `sign-function`,
  `leader-tone`, `audio-leader`, `numeral-value`, `value-numeral`,
  `audio-numeral`, `phrase-split`. `DRILLED_UNITS` gains `12, 13, 14`.
- `canEverHaveAudio` extended so `leader-word` (real sayable word) and
  `numeral` (spoken digit name is sayable) return `true`; `special-sign` and
  `phrase` return `false` (no audio drill required for them).
- `canDrillTypeScore` gains matching branches:
  - `sign-function` → kind `special-sign`.
  - `leader-tone` → kind `leader-word` && `tone != null`.
  - `audio-leader` → kind `leader-word` && `canEverHaveAudio`.
  - `numeral-value` / `value-numeral` → kind `numeral`.
  - `audio-numeral` → kind `numeral` && `canEverHaveAudio`.
  - `phrase-split` → kind `phrase` && a non-empty `boundaries` array exists.
- `reachableDrillTypesForUnit` gains unit 12/13/14 branches offering exactly the
  drill types above for their own items (`i.unit===12/13/14 && i.drillable`).
- `maxAchievablePercentForUnit` returns **100** for units 12, 13, 14 (structural
  — audio types count as achievable via `canEverHaveAudio` even before clips
  land, exactly like M12/M13). `findUnreachableDrillableIds` empty for all three.
  The existing `assertUnitMasteryScopingGuard` + 100%-per-unit invariant in
  `scripts/seed-thai-db.ts` must PASS (extend the seed script's per-unit loop to
  cover 12–14 if it enumerates units explicitly).
- `VALID_KINDS_FOR_DRILL_TYPE` (lib/thai/drill.ts) + `lib/thai/types.ts`
  `DrillType` union gain the seven new types with matching kinds.

### A3 — Unit 12: special signs & silent leaders
- `sign-function` MC: show the sign glyph (◌์/◌็/ๆ/ฯ), 4 options = the four
  function labels; correct = this sign's `functionKey`. Distractors = the other
  three functions.
- `leader-tone` MC: show the leader word (e.g. หมา), 5 options = the five tones;
  correct = the word's `tone`. Reveal shows the derivation string + gloss.
  Adversarial distractor emphasis: include the tone the word would have WITHOUT
  the leader (e.g. mid for a plain-Low reading) among the options where possible.
- `audio-leader` MC: play `audioUrl`, options = Thai spellings; correct = this
  word's spelling; distractors = the leader-less base (มา for หมา) and/or a
  same-family confusable. Degrades gracefully (samples nothing) until clips land.
- Unit 12 lesson page renders §8 content (small-marks table, silent-leader
  explanation with the นา/หนา and มา/หมา contrasts, true/false-cluster note as
  prose) from the typed seed module, consistent with existing lesson framework.
- Unit 12 unlocks per the standard ≥90% rule (gated on unit 11); unit map shows
  it as a real unit (no "coming soon").

### A4 — Unit 13: numerals ๑–๙
- `numeral-value` MC: show Thai numeral, 4 options = Arabic digits; correct =
  `value`. Distractors = other digits (bias toward visually confusable ones,
  e.g. ๓/๗, ๖/๙ — curated confusable groups like the existing final-sound groups).
- `value-numeral` MC: show Arabic digit, 4 options = Thai numerals; correct =
  this numeral glyph.
- `audio-numeral` MC: play the spoken digit-name `audioUrl`, options = Thai
  numerals; correct = this numeral. Degrades gracefully until clips land.
- Unit 13 lesson page renders §9 (the digit table + "๒๐๒๖ = 2026" note).
- Unlocks ≥90% gated on unit 12; real unit in the map.

### A5 — Unit 14: spaceless reading (tap-boundary widget)
- New `phrase-split` drill + a new React widget
  (`components/thai/drill/phrase-split-question.tsx`, sibling of
  `tone-assembly-question.tsx`): render the phrase as tappable character cells
  with tap targets BETWEEN cells; the learner toggles boundary positions; a
  "Check" action submits. `DrillQuestion` gains an optional `phrase` field
  ({chars: string[], syllables: [{thai, ipa, gloss}]}) carrying the render data;
  `correct` = the canonical boundary set serialized canonically (sorted,
  comma-joined, e.g. `"2,5"`). `expectedAnswerFor` returns that string for
  `phrase-split`. The client serializes the tapped set identically; the server
  action compares string equality → one `thai_attempts` row per phrase
  (drillType `phrase-split`, expected vs chosen boundary-set string).
- After a correct (or revealed) split, the widget shows each syllable with its
  IPA + gloss as reinforcement — client-side only, NOT logged (mirrors
  tone-assembly's early steps).
- Boundary indices are **code-point indices** (`[...phrase]`), matching how the
  vetted artifact counted them; a seed-time assertion verifies every phrase's
  `boundaries` are in range `1..len-1`, strictly increasing, and that splitting
  at them reproduces the artifact's `syllables[i].thai` concatenation (catches a
  mis-counted index before it ever reaches a learner).
- Unit 14 lesson page renders §10 (the three cues + the ไปโรงเรียน / แมวกินปลา
  worked examples). Unlocks ≥90% gated on unit 13; real unit.

### A6 — Audio batch (PAID GATE)
- `scripts/generate-thai-audio.ts` `deriveAudioText` (or equivalent) extended:
  `leader-word` → the word `display`; `numeral` → the digit NAME
  (`metadata.name`, e.g. หนึ่ง), NOT the glyph. Idempotent, hash-keyed,
  Blob-reuse (existing behaviour). New kinds' rows get `audioUrl` populated.
- Batch is a PAID GATE: present the clip list + per-clip/total estimated cost,
  WAIT for explicit "go" before running (even at the expected $0.00 free tier).
  Log actual cost to `.artifacts/thai-audio/ledger.json`. ~18 new clips
  (~11 leader words + 10 numeral names, minus any already present by hash).
- Until the batch runs, `audio-leader` / `audio-numeral` sample nothing and the
  units sit <100% for those learners — the same legitimate re-lock M12/M13
  established (documented, not a bug).

### A7 — Course-complete wrap-up
- `BUILT_UNITS` = all 14; the "coming soon" placeholder path in
  `lib/thai/queries.ts` no longer applies to any unit (verify units 12–14 render
  as real, and the last-unit UI has no dangling "coming soon"/next-unit affordance
  that points past 14).
- Project memory `m11-thai-reading-course-decisions.md` gets an M14-shipped +
  "course complete" entry.

### A8 — Regression + non-Thai safety
- Mandarin app entirely untouched (no schema/route/component shared changes).
- Existing units 1–11 mastery/unlock math unchanged; a learner already partway
  through is not re-locked EXCEPT via the documented audio-gated mechanism for
  units they haven't reached. The M13 regression guard
  (`assertUnitMasteryScopingGuard`) + the per-unit 100% invariant PASS.
- `npm run build` / typecheck / lint clean; `seed:thai` idempotent
  (0 inserted / N upserted / 0 deleted on a second run) with all reachability
  invariant OK lines printed.

## Build order (for /dev-cycle)
1. Merge the three vetted content artifacts → `m14-content-bank.md` (orchestrator,
   after the background agents return + a spot-check of boundary indices).
2. Seed types + items (new kinds + content) — A1.
3. Reachability + drill-type wiring — A2 (do FIRST-class; run `seed:thai` early
   to surface any invariant break before UI work).
4. Drill engine (question build, distractors, expectedAnswerFor) — A3/A4/A5.
5. Components: reuse MC flow for 6 types; new `phrase-split-question.tsx` widget.
6. Lesson pages units 12–14 — A3/A4/A5.
7. Seed refresh + BUILT_UNITS flip + wrap-up — A1/A7.
8. Paid audio batch (GATED) — A6.
9. Handoff chain: implementation-summary → review-summary → qa-summary.

## Open items / interview forks — RESOLVED
- Unit 12 sign vs leader scope → Full (both). ✓
- ๆ/ฯ drilled or lesson-only → drilled (in `sign-function`). ✓
- Numeral drill directions → both + audio. ✓
- Numeral audio (digit names) → yes. ✓
- Unit 14 logged-answer shape → split-only; IPA reinforcement unlogged. ✓
- Leader-word new seed items → yes, new `leader-word` kind. ✓
- New audio spend → both leader words + numeral names (gated). ✓

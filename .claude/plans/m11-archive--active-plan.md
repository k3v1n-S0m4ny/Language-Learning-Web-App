---
status: SUPERSEDED
updated: 2026-07-02
---

# M11 â€” Read Thai: schema, seed, mode toggle, unit map, lessons + drills 1â€“8, /thai/stats

Plan root: `C:\Users\User\Software Projects\Language-Learning-App\.claude\plans\`
Scope source: M11 bullet of the approved Read-Thai design (Appendix below â€” authoritative).
Out of scope: ALL audio (M12), tone-ear unit 9, tone rules (10), syllable decode (11),
special signs (12), numerals (13), phrase splitting (14), tone-confusion matrix.

## Validation Contract (assertions)

### A1 â€” Schema
- `lib/db/schema.ts` gains:
  - `thai_items`: `id` text PK (stable slug, e.g. `consonant:à¸`), `kind`
    (`consonant|vowel|tone-rule|numeral|special-sign|syllable|phrase`), `unit` integer,
    `display` text, IPA field(s), consonant `class`, kind-specific `metadata` jsonb,
    `audioUrl` nullable (empty in M11), plus a `drillable` boolean (false for à¸ƒ/à¸…).
  - `thai_progress`: learnerId FKâ†’user, itemId FKâ†’thai_items, streak, lastSeen,
    masteredAt, unique (learnerId, itemId).
  - `thai_attempts`: learnerId, itemId, drillType, expected, chosen, correct, timestamp
    (columns sufficient for the future tone-confusion matrix).
  - `learner_settings.active_mode` text column, default `'mandarin'`.
- Existing tables (`cards`, `words`, `review_states`, â€¦) untouched.
- Migration generated and applied with the repo's existing drizzle workflow
  (`npm run db:generate` / `db:push` â€” follow whatever M8â€“M10 used).

### A2 â€” Seed content + script
- Typed content in `seed/thai/` (e.g. `seed/thai/items.ts`) exporting every unit 1â€“8 item:
  9 mid-class, 11 high-class (à¸ƒ present, `drillable:false`), 12+12 low-class A/B
  (à¸… present, `drillable:false`), the 8 finals, vowels A (core short/long pairs),
  vowels B (diphthongs, hidden vowel, shape-changers) â€” all with IPA, derived from
  `seed/thai/research/reading-thai-script.html`. Plus the curated real-word bank rows
  (kind `syllable`/`word` with gloss metadata) needed by units 6â€“8 drills.
- New script `scripts/seed-thai-db.ts` + npm script `seed:thai` that idempotently
  refreshes `thai_items` (same refresh pattern as `scripts/refresh-seed-db.ts`),
  never touching Mandarin tables. Ran successfully against the dev DB with output captured.

### A3 â€” Mode toggle
- Home header shows a Mandarin/Thai mode toggle; choice persists to
  `learner_settings.active_mode` via a server action and survives reload/re-login.
- Default (no row / existing learners) = `mandarin`; the Mandarin home and review flow
  are pixel/behaviour-identical when mode is `mandarin`.

### A4 â€” Thai unit-map home
- With mode `thai`, home renders the 14-unit vertical map: per-unit progress ring,
  lock state, and Lesson / Drill / Repractice actions.
- Unit 1 is lesson-only and completes when read. A unit's drills unlock when the
  previous unit is â‰¥90% mastered. Lessons for built units (1â€“8) are always readable
  regardless of lock; units 9â€“14 render as locked "coming soon" (no lesson yet).

### A5 â€” Lesson framework + units 1â€“8 lessons
- A reusable lesson-page framework under `app/thai/â€¦` renders native React lesson
  pages for units 1â€“8, pulling structured data (letters, classes, vowel forms) from
  the typed seed module so lessons and drills share one source of truth.
- Thai text renders with Noto Sans Thai via `next/font`.

### A6 â€” MC drills, mastery, attempts
- Drill session = round of ~15 MC questions, sampled weighted toward unmastered +
  least-recently-seen items; adversarial distractors from confusable sets.
- Drill types per plan: units 2â€“5 letterâ†”sound, letterâ†’class; unit 6 letterâ†’final
  sound + wordâ†’final sound; units 7â€“8 formâ†”sound + special shapes. (audioâ†’X drill
  types deferred to M12.)
- Word-bank answers reveal the gloss after answering.
- Mastery: 3 correct in a row; a wrong answer resets the streak; `masteredAt` set on
  3rd. Every answer inserts a `thai_attempts` row with expected vs chosen.
- Session ends in a summary screen: score, newly mastered, unit %, unlock celebration.
- à¸ƒ and à¸… never appear as drill questions or answers.

### A7 â€” /thai/stats
- `/thai/stats` page with: items-mastered-over-time, accuracy-by-unit,
  drill-activity history, per-item failure heatmap, streak calendar
  (recharts, consistent with existing `components/stats/*`).

### A8 â€” Quality gates (evidence required)
- `npm run lint`, `npx tsc --noEmit`, and `npm run build` all pass; verbatim output
  captured in the implementation summary and independently re-run by review/QA.

## Feature â†’ assertion map
schemaâ†’A1 Â· seedâ†’A2 Â· toggleâ†’A3 Â· unit mapâ†’A4 Â· lessonsâ†’A5 Â· drillsâ†’A6 Â· statsâ†’A7 Â· gatesâ†’A8

## Done criteria
All of A1â€“A8 PASS with evidence; QA validates A3â€“A7 behaviorally in the running app
(two learners: one mandarin-mode, one thai-mode).

## Final status (2026-07-02) â€” M11 COMPLETE

All assertions PASS: A1â€“A2 (implementation + review evidence), A3â€“A7 (QA behavioral
validation, qa-summary.md), A8 (gates re-run independently by all three agents).
Cycle took 3 implementation rounds: review round 1 found a CRITICAL unlock-ceiling bug
(unit-6 denominator counted undrillable items) + HIGH client-trusted answer; round 2's
fix relocated the CRITICAL into the word bank; round 3 fixed it structurally
(lib/thai/reachability.ts shared by drill engine + fail-loud seed-time invariant).
Final review verdict: APPROVE-WITH-FINDINGS. QA verdict: PASS.

Carried-forward non-blocking residuals (revisit in M12):
- thai_progress has no drillType dimension (streaks blend across drill types) â€” decide
  before M12 perception drills / confusion matrix.
- Vowel form-sound drill is forward-only; add a sound-form DrillType in M12/M13.
- expectedAnswerFor doesn't cross-check drillType vs item kind (LOW).
- Attempt insert + progress upsert are two statements, not one transaction (LOW).
- Word bank is ~30 doc-sourced words; expansion toward 80â€“120 continues through M13.
- Operational: after any dev-server OOM crash, `rm -rf .next` before restarting
  (stale Turbopack cache caused a ~1987-process postcss worker storm during QA).

## Implementation notes (last, non-binding except where cited)
- **AGENTS.md**: this repo's Next.js (16.2.6) has breaking changes â€” read the relevant
  guides in `node_modules/next/dist/docs/` before writing any Next.js code.
- Context files: `lib/db/schema.ts`, `scripts/refresh-seed-db.ts`, `scripts/seed-db.ts`,
  `app/page.tsx`, `app/layout.tsx`, `app/stats/page.tsx`, `components/stats/*`,
  `lib/review/*` (patterns only), `seed/thai/research/reading-thai-script.html`
  (curriculum source, ~43k tokens â€” read section-by-section).
- No FSRS anywhere in Thai code. No placeholder/stub content â€” real curated items only.
- DB is Neon (us-east-1); server actions follow the existing `lib/review/actions.ts` style.

---

# Appendix: Read-Thai Course â€” Approved Design (M11â€“M14)

Source curriculum: `seed/thai/research/reading-thai-script.html` (script â†’ IPA decoding,
no romanization). Interview completed 2026-07-02; all decisions below are user-approved.
(Replaces the completed M10 plan â€” M10 shipped in commit 3bdcc6c.)

## Product shape

A **lessons + drills course** ("Read Thai") covering the ENTIRE research doc, living
behind a **persisted per-learner mode toggle** on the home screen header
(new column on `learner_settings`, default `mandarin`; girlfriend never sees Thai).
Thai mode's home IS the **unit map**: vertical list of 14 units with progress ring,
lock state, and Lesson / Drill / Repractice actions. A dedicated **/thai/stats** page
(see Stats section).

## Progress model (NOT FSRS)

- Simple mastery: item mastered = **3 correct in a row** (wrong answer resets streak).
- Unit unlocks the next at **â‰¥90% of its items mastered**.
- Lessons are always readable ahead; only drills gate. Repractice any unit anytime.
- Drill session = **round of ~15 questions**, sampled weighted toward unmastered +
  least-recently-seen items, ending in a summary screen (score, newly mastered,
  unit %, unlock celebration).

## Unit map (approved)

1. IPA primer + syllable anatomy â€” lesson only (complete when read)
2. Mid-class consonants (9) â€” letterâ†”sound, letterâ†’class, audioâ†’letter
3. High-class consonants (11; à¸ƒ shown, not drilled) â€” same
4. Low-class consonants A (12) â€” same
5. Low-class consonants B (12; à¸… shown, not drilled) â€” same
6. Finals: the 8 endings â€” letterâ†’final sound, wordâ†’final sound
7. Vowels A: core short/long pairs â€” formâ†”sound, audioâ†’form
8. Vowels B: diphthongs, hidden vowel, shape-changers â€” same + special shapes
9. **Tone ear** (user-requested): listen-and-repeat tiles (à¸­à¸²/à¸­à¹ˆà¸²/à¸­à¹‰à¸²/à¸­à¹Šà¸²/à¸­à¹‹à¸² minimal
   sets + 2-3 more, contour sparklines, unassessed production) + tracked
   audioâ†’tone perception drill
10. Tone rules â€” **assembly drills** (tap class â†’ live/dead â†’ vowel length â†’ tone,
    per the doc's flowchart, with per-step feedback) + tone-mark grid MC
11. Syllable assembly â€” wordâ†’full IPA reading (MC), gloss revealed after answering
12. Special signs & silent leaders â€” à¸«/à¸­-leader tone cases, silencer â—Œà¹Œ, shortener â—Œà¹‡, à¹†
13. Numerals à¹â€“à¹™ â€” digitâ†”numeral MC
14. Spaceless reading â€” **tap-boundary splitting drill** (~15-20 curated phrases;
    tap between characters to place split points, then per-syllable IPA confirm)

Answer input: multiple choice everywhere (adversarial distractors from confusable
sets), EXCEPT unit 10 which uses the assembly builder. No typed IPA.

## Drill content bank

Hand-curated **real Thai words (~80â€“120)**, seeded from the doc's ~40 examples,
expanded so every tone-grid cell, final type, and tricky vowel shape appears several
times. Every drill answer shows the word's gloss â†’ incidental vocabulary.

## Data model

- **New `thai_items` table** (cards/words untouched): id = stable slug
  (`consonant:à¸`), kind (consonant|vowel|tone-rule|numeral|special-sign|syllable|phrase),
  unit, display text, IPA fields, class, kind-specific metadata jsonb, audioUrl.
  Seeded from a typed file in `seed/thai/` via a new seed script (refresh pattern
  like Mandarin).
- **`thai_progress`**: learnerId, itemId, streak, lastSeen, masteredAt.
- **Attempts log** table capturing itemId, drillType, expected vs chosen answer
  (needed for the tone-confusion matrix), correct, timestamp.
- `learner_settings.activeMode` (mandarin|thai).

Lesson prose = native React pages in the app's design system; structured data
(44 consonants, vowel forms, tone grid) lives in the typed seed file that BOTH
lessons and drills read. Needs Noto Sans Thai via next/font.

## Audio (paid â€” protocol applies)

**Full audio**: letter names, vowel sounds, tone-ear sets, drill syllables/words
(~200+ clips). Per the Paid AI-Generation Protocol:
research Thai TTS quality first (OpenAI TTS vs Google Neural2/WaveNet vs Azure vs
ElevenLabs), present comparison + per-clip and total cost, **user picks the voice**,
validate with ~5 test clips (one per tone) user listens to, THEN batch.
Listening drills depend on research confirming tone fidelity.

## Stats â€” /thai/stats (richer analytics chosen)

Core three: items-mastered-over-time, accuracy-by-unit, drill-activity history.
Richer: per-item failure heatmap, tone-confusion matrix (perception drills),
streak calendar. Phasing (my resolution, user may adjust): core three + heatmap +
calendar in M11; confusion matrix lands with M12 perception drills.

## Milestones (each via /dev-cycle)

- **M11**: schema + seed content + mode toggle + unit map + lesson framework +
  units 1â€“8 (consonants/finals/vowels) with MC drills, no audio + /thai/stats core.
- **M12**: TTS research â†’ voice pick â†’ test clips â†’ paid batch (gated);
  tone-ear unit 9 + audioâ†’letter/form listening drills + confusion matrix.
- **M13**: tone rules assembly engine (unit 10) + syllable decode (unit 11).
- **M14**: special signs (12), numerals (13), phrase-splitting widget (14).

## Open items

- TTS provider/voice: BLOCKED on research + user choice (start of M12).
- Curated word bank authoring is seed-content work inside M11/M13.

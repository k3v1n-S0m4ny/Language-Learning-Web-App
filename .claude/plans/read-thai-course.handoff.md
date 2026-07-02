---
feature: read-thai-course
created: 2026-07-02T13:32:07.573751+00:00
source-session: b1238ff5-4d5e-4998-b7c8-7f16b9784543
context-at-handoff: 142930 (red)
---

# Handoff: Read-Thai Course (M11–M14)

## Goal
Build a new "Read Thai" section of the language-learning app: a 14-unit
lessons + drills course teaching Thai script → IPA decoding, derived from
`C:\Users\User\Software Projects\Language-Learning-App\seed\thai\research\reading-thai-script.html`.
Design interview with the owner is COMPLETE (21 decisions, all approved).
Current milestone: **start M11 implementation** via `/dev-cycle`.

## Completed (this session)
- Full design interview; every decision captured in
  `C:\Users\User\Software Projects\Language-Learning-App\.claude\plans\active-plan.md` (verified written).
- Project memory saved:
  `C:\Users\User\.claude\projects\C--Users-User-Software-Projects-Language-Learning-App\memory\m11-thai-reading-course-decisions.md`
  + MEMORY.md index line (verified written).
- No code, schema, or seed changes yet. Working tree has only untracked
  `.claude/` artifacts; branch `main` at commit 3bdcc6c (M10).

## Remaining tasks
- M11: schema (thai_items, thai_progress, attempts log, learner_settings.activeMode)
  + typed seed content in `seed/thai/` + seed script + mode toggle on home header +
  Thai unit-map home + lesson framework + units 1–8 (consonants/finals/vowels) with
  MC drills + /thai/stats core charts. No audio.
- M12: TTS research → owner picks voice (PAID GATE — never auto-pick) → 5 test
  clips → batch; tone-ear unit 9; listening drills; tone-confusion matrix.
- M13: tone-rules assembly engine (unit 10) + syllable decode (unit 11).
- M14: special signs (12), numerals (13), tap-boundary phrase splitting (14).

## Next steps (start here)
1. Read `C:\Users\User\Software Projects\Language-Learning-App\.claude\plans\active-plan.md`
   (the authoritative design — unit map, mastery rules, schema, phasing).
2. Confirm with the owner that M11 should kick off, then invoke the Skill tool:
   `/dev-cycle` for M11 scoped exactly to the plan's M11 bullet.
3. Inside dev-cycle, per AGENTS.md read the relevant guides in
   `node_modules/next/dist/docs/` before writing any Next.js code (this repo's
   Next.js has breaking changes vs training data).

## Key decisions + rationale
- Lessons + drills course, NOT FSRS: simple mastery (3-streak per item; unit
  unlocks next at ≥90% items mastered); rejected FSRS reuse (owner chose simpler model).
- Persisted per-learner mode toggle (learner_settings.activeMode, default
  mandarin) replaces home when set to thai; girlfriend's Mandarin flow untouched.
- Content: native React lesson pages; structured data in a typed file in
  `seed/thai/` seeded into NEW `thai_items` table (cards/words untouched) —
  rejected generalizing the Mandarin cards table.
- Drills: MC everywhere with adversarial distractors; unit 10 uses an assembly
  builder (class → live/dead → vowel length → tone) mirroring the doc's flowchart.
- Owner-added requirements: tone-ear unit 9 (listen-and-repeat tiles + tracked
  audio→tone perception drill) BEFORE tone rules; full audio (~200+ clips);
  phrase splitting is a real tracked drill (tap boundaries), not a widget.
- Drill bank: ~80–120 curated REAL words covering every tone-grid cell, gloss
  revealed after answering; rejected nonsense syllables.
- Audio is a paid-generation decision: research Thai TTS options (OpenAI vs
  Google vs Azure vs ElevenLabs), owner picks, 5 test clips validated by ear
  before any batch. Per owner's global Paid AI-Generation Protocol.
- Dedicated /thai/stats with richer analytics; phased: core three + heatmap +
  streak calendar in M11, tone-confusion matrix with M12 perception drills.
- ฃ and ฅ shown in lessons, excluded from drills (obsolete letters).

## Read before starting
- `C:\Users\User\Software Projects\Language-Learning-App\.claude\plans\active-plan.md` (the design)
- `C:\Users\User\Software Projects\Language-Learning-App\lib\db\schema.ts` (existing schema patterns)
- `C:\Users\User\Software Projects\Language-Learning-App\seed\languages.ts` (seed registry; vocab-pipeline only — thai_items uses its own seed script)
- `C:\Users\User\Software Projects\Language-Learning-App\seed\thai\research\reading-thai-script.html` (curriculum source; read section-by-section as needed, it is 43k tokens)

---
status: COMPLETE
updated: 2026-05-23
---

> **Cycle outcome (2026-05-23):** All 4 Validation Contract assertions PASS. Implementer →
> code-reviewer (PASS, 2 LOW) → qa-engineer (PASS) handoffs written. Code-only changes shipped.
> **Pending manual op:** run `tsx scripts/migrate-retention.ts` to set `request_retention = 0.85`
> on the 2 existing `learner_settings` rows (vestigial column, no scheduling impact). Not run yet.

# Active Plan — Milestone 8: Research-driven SRS tuning + phrase-content path

Derived from a competitive/feature analysis of Mandarin learning apps (Skritter, HelloChinese,
Anki, Du Chinese, Mandarin Blueprint, Dong Chinese, Speechling, Duolingo, et al.) and the
learner/research literature on what actually helps vs. what is gimmicky. Full reasoning lives in
the conversation; this plan captures only the agreed scope.

This milestone ships two **code-only**, low-risk SRS improvements. Everything content-related has
been intentionally cut (see below) so the dev cycle can run in a fresh session without content
work blocking it.

**Cut by user decision (2026-05-23):**
- **Phrase-first content strategy — ABANDONED.** User's deliberate stance: learning the individual
  Words that recur inside Phrases aids memorization, and the app keeps its Word-level focus. This
  diverges from the competitor consensus on purpose; do not reintroduce a phrase-ratio target.
- **Tags / CSV tag column — DEFERRED.** Keep the current tagging as-is for now.
- **Stroke-order animation — NOT BUILDING.** This app is **reading-focused, not writing**; all
  handwriting/stroke features are out of scope permanently.

Still deliberately **never** (for a 2-person intrinsic-motivation app): streaks / leaderboards /
XP, permanent tone color-coding, full handwriting recognition, in-app card authoring, AI chat
tutor. Still **deferred** (reading-relevant, revisit later): confusable-character compare,
component/radical decomposition card-back layer.

## Context (verified in code)

- FSRS scheduling is `ts-fsrs` via `lib/review/scheduler.ts`. `getScheduler(requestRetention)`
  builds the scheduler from a per-Learner value. `learnerSettings.requestRetention` currently
  **defaults to 0.9** (`lib/db/schema.ts:174`). Two Learner rows exist.
- `ts-fsrs` has **no native "leech"** concept; it tracks `lapses` on the persisted Card
  (`review_states.fsrs_card` jsonb). A leech is therefore a derived check: `fsrsCard.lapses >= N`.
  No schema change required to detect it.
- Card back (`components/card-back.tsx`) already renders **whole-phrase audio** (`AudioButton`,
  `card.wholeAudioUrl`) and **per-word audio** (`WordChip`). Today nothing auto-plays; both are
  manual. Reveal state lives in `components/review-session.tsx`.
- Content pipeline: `seed/reborn-chinese-system.csv` (authored 中文,English) →
  `scripts/generate-deck.ts` (LLM adds pinyin + word segmentation only — does NOT invent
  vocabulary) → `seed/deck.generated.json` → `scripts/generate-audio.ts` (TTS) →
  `scripts/seed-db.ts`. Tags are currently assigned by a `row < 57` hack (only 2 generic tags).
  Seed is 100 cards / **18 phrases / 82 single words** — inverted from the phrase-first ideal.

## Decisions (from user)

- **Audio:** keep OpenAI TTS; make **whole-phrase the default**, per-word stays opt-in drill-down.
- **FSRS tuning:** apply as **global constants** (not per-Learner).
- **Content / tags / stroke order:** all cut (see top of file). This milestone is code-only.

## Scope

### 1. Default playback to whole-phrase audio (code)
- On card **reveal**, auto-play `card.wholeAudioUrl` once (whole-phrase clip preserves prosody /
  tone sandhi — the research's main audio point). Per-word `WordChip` audio remains tap-only.
- Likely touch: `components/review-session.tsx` (fire on reveal), `components/audio-button.tsx`
  (add an `autoPlay`/imperative play path), possibly `components/card-back.tsx`.
- Respect browser autoplay constraints: the reveal is a user gesture (button click), so a
  programmatic `.play()` in that handler is permitted. Must not throw if `wholeAudioUrl` is null.
- No double-play, no autoplay on the front, no autoplay of per-word clips.

### 2. FSRS Chinese tuning as global constants (code)
- Introduce `REQUEST_RETENTION = 0.85` and `LEECH_THRESHOLD = 7` constants (single source, e.g.
  in `lib/review/scheduler.ts` or a small `lib/review/config.ts`).
- `getScheduler` uses the global `REQUEST_RETENTION` (0.85) rather than the per-Learner column.
  Set `learnerSettings.requestRetention` default to 0.85 and one-time UPDATE the 2 existing rows
  for consistency (the column becomes vestigial but is left in place to avoid a destructive drop).
- **Leech detection:** add a derived helper `isLeech(fsrsCard) => fsrsCard.lapses >= LEECH_THRESHOLD`.
  Surface minimally: a small "leech" badge on the review card back when true, and a leech **count**
  in the existing stats view (`lib/review/stats.ts` + `app/stats/page.tsx`). No new table; compute
  from `lapses`. "Do something about leeches" (re-author / add context) is a manual follow-up, not
  automated here.

## Validation Contract (assertions QA must check)
1. Revealing a card auto-plays the whole-phrase audio exactly once; front never auto-plays;
   per-word clips never auto-play; a card with null `wholeAudioUrl` reveals without error.
2. A freshly scheduled review uses request_retention 0.85 (not 0.9) — verify via scheduler input
   and that interval previews shift accordingly vs. the old default.
3. `isLeech` returns true iff `lapses >= 7`; the leech badge shows only for such cards; the stats
   leech count matches the number of the Learner's states with `lapses >= 7`.
4. `npm run build` / typecheck / lint clean. No regression in same-day requeue (M7) or stats (M6).

## Risks / notes
- Autoplay: keep the play call inside the reveal click handler's React update path; guard against
  React 18 double-invoke in dev (StrictMode) causing a double play.
- The per-Learner `requestRetention` column is intentionally left in place (not dropped) — global
  constant overrides it; document this so it isn't mistaken for live config.
- Content authoring (more phrases, tag backfill) is decoupled: code can ship before content grows.

## Handoff chain
active-plan.md (this) → implementation-summary.md → review-summary.md → qa-summary.md.
Recommended execution: `/dev-cycle`.

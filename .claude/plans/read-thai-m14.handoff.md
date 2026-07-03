---
feature: read-thai-m14
created: 2026-07-03T08:52:30.070909+00:00
source-session: 936c2ad5-9408-43d3-8d5d-043092897a2a
context-at-handoff: 201k (red)
---

# Handoff: Read-Thai M14 — special signs (unit 12), numerals (unit 13), spaceless reading (unit 14)

## Goal
M13 SHIPPED (commit c7cff07, Vercel prod ● Ready, thepolyglot.vercel.app
auth-redirect 307→200 = healthy). This session starts M14, the FINAL Read-Thai
milestone: special signs & silent leaders (unit 12), numerals ๑–๙ (unit 13),
and the spaceless-reading tap-boundary phrase-splitting widget (unit 14),
per the approved 14-unit design.

## Completed (last session — all verified)
- M13 committed (`c7cff07`, 50 files) + pushed; Vercel prod deploy Ready.
- Word bank 30→100 words, ALL Wiktionary-verified — vetted artifact WITH
  per-word tone-grid metadata at `.claude/plans/m13-word-bank.md` (committed).
  Every tone-grid cell ≥3 words; final /t/ now 10 words.
- Unit 10 (branching `tone-assembly` + `mark-tone` drills), unit 11
  (`word-ipa` decode), unit 6 `audio-word` listening drill, all four M12 LOW
  residuals fixed.
- Audio batch ran once behind owner gate: 74 new clips ($0.00 free tier),
  182/195 thai_items have audio_url (100/100 syllables). Ledger:
  `.artifacts/thai-audio/ledger.json`.
- DB is live prod (no separate envs — memory `vercel-prod-db-is-dev-db`):
  195 thai_items seeded, idempotent `seed:thai` verified 3× by 3 agents.
- Handoff chain complete + committed (active-plan COMPLETE with Final status,
  implementation/review/qa summaries, M12 archive). Project memory updated
  (`m11-thai-reading-course-decisions.md` has the M13 ship entry).

## Remaining tasks
1. Archive the M13 chain first (owner-approved pattern): copy
   `.claude/plans/{active-plan,implementation-summary,review-summary,qa-summary}.md`
   to `m13-archive--*.md` before overwriting active-plan with M14.
2. M14 planning interview → M14 Validation Contract in
   `.claude/plans/active-plan.md`. Scope (design appendix in
   `m11-archive--active-plan.md`, authoritative):
   - Unit 12: special signs & silent leaders — ห/อ-leader tone cases,
     silencer ◌์ (thanthakhat), shortener ◌็, repeater ๆ. MC drills.
   - Unit 13: numerals ๑–๙ — digit↔numeral MC.
   - Unit 14: spaceless reading — tap-boundary splitting drill (~15–20
     curated real phrases; tap between characters to place split points,
     then per-syllable IPA confirm). New interaction widget, NOT MC.
   Likely interview forks: unit-14 phrase sourcing/verification (M13 used
   parallel-agent Wiktionary verification — reuse pattern for phrases),
   whether ๆ/ฯ get drills or lesson-only, numeral audio (Thai digit names?
   new clips = paid gate), unit-12 leader words needing new seed items.
3. Run `/dev-cycle` for the build (skip planning interview arg — write the
   contract first, owner-approved, like M13 did).
4. New items needing audio → `scripts/generate-thai-audio.ts` is idempotent
   (hash-keyed, Blob-reuse); batch is a PAID GATE (Google free tier, likely
   $0.00, gate anyway). Voice locked: `th-TH-Chirp3-HD-Achernar`; key
   `GOOGLE_TTS_API_KEY` in `.env.local` (strip quotes).
5. After M14 ships: course complete — consider a wrap-up (BUILT_UNITS = all
   14, remove "coming soon" path, memory update).

## Key decisions + rationale (carry into M14)
- New drill types MUST be wired into `lib/thai/reachability.ts` (DrillTypeId,
  DRILLED_UNITS, canDrillTypeScore, unit branch in reachableDrillTypesForUnit)
  or `seed:thai` fails loudly — by design. Read that file's header comments
  first; the recurring CRITICAL bug class (drillable-but-unreachable items
  capping unit % below the 90% unlock) hit M11 twice and M12 once.
- Mastery is STRICT but per-unit-scoped: unit % uses reachableDrillTypesForUnit
  (own session), NEVER allReachableDrillTypesForItem (cross-unit union —
  that's for badges/stats only). A regression guard runs in seed:thai.
- Drills must mirror the research doc EXACTLY, not the plan's paraphrase —
  M13's only HIGH was exactly this gap (vowel-length step applies to
  low-class only; the plan's paraphrase dropped the caveat). When writing the
  M14 contract, quote the doc's rules for leaders/signs verbatim.
- Unit 14's tap-splitting widget is the first non-MC, non-assembly input —
  expect the attempt-logging shape question (what is expected vs chosen for a
  split-points answer?) to need an owner decision in the interview.
- Word/phrase content: curate + verify via parallel general-purpose agents
  (WebFetch on en.wiktionary; implementer has NO WebFetch — deliver a vetted
  artifact like `.claude/plans/m13-word-bank.md` BEFORE the cycle).
- Existing learner's unit 6 is legitimately re-locked (new audio-word
  requirement, M12/M13 precedent) — not a bug.

## Dead ends — do not retry
- No separate "prod data steps" after deploy — one DB for all envs; local
  seed/migrate IS prod. Riskier schema work → Neon branch first (pattern in
  memory `french-course-build`).
- Neon MCP can't see this DB (Vercel-managed). Use `.env.local` / Vercel CLI.
- tsx one-offs: repo-local gitignored dir (`.artifacts/`), `.mts` for
  top-level await; neon driver needs tagged-template or sql.query().
- qa-engineer agent stalls mid-run (stopped 3× in M13 before writing its
  summary) — resume it with SendMessage and an explicit "writing
  qa-summary.md is the definition of done" instruction; check the file on
  disk (it may still be the PREVIOUS milestone's) before accepting.
- PowerShell `vercel ls/inspect` returns exit 255 with output on stderr —
  use the Bash tool for vercel CLI instead.

## Verification evidence
- `git push` → `f253118..c7cff07 main -> main`; `vercel inspect` newest prod
  deploy → `status ● Ready`; alias 307→/api/auth/signin→200 (auth wall, healthy).
- Seed idempotency: `0 inserted, 195 upserted-as-update, 0 deleted` + all 3
  reachability invariant OK lines (implementer, reviewer, QA each re-ran).
- QA: 45 tone-assembly questions, 0 branch-shape mismatches; 45 word-ipa,
  0 reveal-gating violations; unit-6 % proven gated by audio-word (100→99→100);
  A6.1 bypass re-forged both ways; DB restored to baseline (progress 12,
  attempts 15, 2 real learners untouched).

## Read before starting
- `.claude/plans/m11-archive--active-plan.md` — design appendix: authoritative
  units 12–14 scope.
- `.claude/plans/active-plan.md` — M13 contract + Final status (M14 residuals:
  regression-guard limitation, sourceNote gaps, unit-6 re-lock).
- `.claude/plans/m13-word-bank.md` — vetted word bank (100 words + metadata);
  unit-12 leader words / unit-14 phrases may extend it (NO new ห/อ-leader
  words were added in M13 — deliberately deferred to unit 12).
- Memory: `vercel-prod-db-is-dev-db.md`, `m11-thai-reading-course-decisions.md`.
- Code: `lib/thai/reachability.ts` (header comments binding),
  `lib/thai/drill.ts` (tone-assembly steps + distractor helpers — pattern for
  the split widget), `seed/thai/types.ts`, `seed/thai/items.ts`,
  `components/thai/drill/tone-assembly-question.tsx` (non-MC drill component
  pattern), research doc §7+ (special signs, numerals, spaceless reading).

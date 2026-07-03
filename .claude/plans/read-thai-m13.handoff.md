---
feature: read-thai-m13
created: 2026-07-03T05:38:35.881057+00:00
source-session: fac03e3a-5ae7-4a63-93d0-4d04ed842683
context-at-handoff: 118k (yellow)
---

# Handoff: Read-Thai M13 — tone-rules engine (unit 10), syllable decode (unit 11), word-bank expansion

## Goal
M12 SHIPPED (commit f253118, Vercel prod Ready, alias thepolyglot.vercel.app).
This session starts M13: plan + build the tone-rules assembly engine (unit 10),
syllable decode (unit 11), and word-bank expansion from ~30 toward 80–120 words,
per the approved 14-unit Read-Thai design.

## Completed (last session — all verified)
- M12 committed (`f253118`, 63 files) and pushed; Vercel Production deploy
  `● Ready`; https://thepolyglot.vercel.app returns 200.
- `.claude/plans/active-plan.md` marked `status: COMPLETE` with Final Status
  (A1–A6 PASS, review APPROVE-WITH-FINDINGS, QA PASS, residuals listed).
- **CRITICAL discovery (verified by direct DB probe + `vercel env pull`)**:
  the Vercel-managed Neon DB is ONE database for all environments —
  `.env.local` DATABASE_URL == production (`ep-calm-frost-ap4nd591-pooler`).
  Every local `db:migrate`/`seed:thai`/ad-hoc SQL hits real learner data.
  For risky schema/data work, create a Neon branch first (pattern: memory
  `french-course-build`). Saved to memory `vercel-prod-db-is-dev-db.md`.
  The "prod data steps" from the M12 handoff were no-ops (already applied:
  4 migrations, 125 thai_items / 103 with audio, Mandarin data intact,
  real learners untouched).
- Vercel CLI installed globally + repo linked
  (`k3v1n-s0m4nys-projects/language-learning-web-app`; `.vercel/` gitignored).
- Project memory updated (M12 ship + residuals + M13 scope in
  `m11-thai-reading-course-decisions.md`).

## Remaining tasks
1. **Owner decision first**: archive the M12 handoff chain — copy
   `.claude/plans/{active-plan,implementation-summary,review-summary,qa-summary}.md`
   to `m12-archive--*.md` (M11 pattern) before overwriting active-plan with M13.
   Owner already approved archiving "at M13 start".
2. M13 planning interview → write the M13 Validation Contract to
   `.claude/plans/active-plan.md`. Scope from the design appendix
   (`.claude/plans/m11-archive--active-plan.md`): unit 10 = tone-rules
   assembly builder (class→live/dead→length→tone drill, NOT MC), unit 11 =
   syllable decode; word bank ~30 → 80–120 curated real words covering every
   tone-grid cell (research real vocabulary; final `t` has only one example
   word รถ).
3. Run `/dev-cycle` for the build (owner's standard flow for milestones).
4. New words need audio: reuse `scripts/generate-thai-audio.ts` (idempotent,
   Blob-reuse, ledger `.artifacts/thai-audio/ledger.json`); batch is a PAID
   GATE (Google free tier likely $0.00 but gate anyway). Voice locked:
   `th-TH-Chirp3-HD-Achernar`; key `GOOGLE_TTS_API_KEY` in `.env.local`
   (strip quotes).

## Next steps (start here)
1. Archive the M12 chain: copy the four live plan files to
   `.claude/plans/m12-archive--*.md` (git will show them; owner commits when
   he chooses — never auto-commit).
2. Read the M13 scope sources (list below), then interview the owner on
   M13 specifics (unit-10 assembly UX, unit-11 decode format, word-list
   sourcing) before writing the new active-plan.md.

## Key decisions + rationale
- Mastery is STRICT but per-unit-scoped (M12 review round 1 found cross-unit
  deadlock) — unit 10/11 drill types must be added to
  `lib/thai/reachability.ts` or the seed fails loudly (by design).
- M12 LOW residuals to consider folding into M13 scope (full list in
  active-plan.md Final status): unit≤2 unlock bypass in `submitThaiAttempt`;
  queries.ts unlock-math regression unguarded; backfill CASE coverage 1/6;
  sparkline coords approximated; unit-6 word audio only on reveal button.
- `thai_progress` is keyed (learner, item, drillType); tone-confusion matrix
  reads `thai_attempts` with drillType `audio-tone`.

## Dead ends — do not retry
- Do NOT plan separate "prod data steps" after deploy — there is no separate
  prod DB (see Completed). Deploy = push to main; data ops are already prod.
- Neon MCP cannot see this DB (Vercel-managed, not in owner's Neon org);
  use `.env.local` / Vercel CLI instead.
- tsx one-off scripts: run from a repo-local gitignored dir (`.artifacts/`),
  `.mts` extension (top-level await fails as `.ts`/CJS; scratchpad dir can't
  resolve repo node_modules); neon driver requires tagged-template or
  `sql.query(...)`, not `sql(string)`.

## Verification evidence
- `git push origin main` → `a110f71..f253118 main -> main`.
- `vercel inspect https://language-learning-web-1nhd4d8wa-...vercel.app` →
  `status ● Ready`, `target production`, alias thepolyglot.vercel.app.
- DB probe (tsx, .env.local) → thai_progress columns include `drill_type`;
  counts: items 125, with audio 103, progress 0, attempts 0, learners 2;
  4 migrations applied; cards 204 / review_logs 365 / words 478 intact.

## Read before starting
- `.claude/plans/m11-archive--active-plan.md` — design appendix: authoritative
  M13/M14 scope (units 10–14, word-bank target).
- `.claude/plans/active-plan.md` — M12 contract + Final status (residuals).
- `.claude/plans/review-summary.md` — round-2 LOW findings detail.
- Memory: `vercel-prod-db-is-dev-db.md`, `m11-thai-reading-course-decisions.md`.
- Code context: `lib/thai/reachability.ts`, `lib/thai/drill.ts`,
  `lib/thai/tone.ts`, `seed/thai/items.ts`, `scripts/generate-thai-audio.ts`.

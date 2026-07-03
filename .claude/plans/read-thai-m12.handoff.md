---
feature: read-thai-m12
created: 2026-07-03T05:08:22.166082+00:00
source-session: 03b647f1-a531-46bd-8f62-ab9f5de07e6d
context-at-handoff: 151454 (red)
---

# Handoff: Read-Thai M12 — wrap-up + ship

## Goal
M12 (audio batch, drillType migration, tone-ear unit 9, listening drills,
tone-confusion matrix) is BUILT and QA-PASSED. Remaining: Phase-5 wrap-up
(plan bookkeeping, commit gate, deploy + prod data steps), then M13 planning.

## Completed (this session)
- **TTS voice LOCKED**: Google Chirp3-HD `th-TH-Chirp3-HD-Achernar` (bake-off
  win + real-word /khaa/ test-clip sign-off; Kore high-tone A/B lost). Saved
  to project memory (m11-thai-reading-course-decisions.md).
- **Audio batch RUN (owner-gated)**: 103 clips, 408 chars, est $0.0122,
  billed $0.00 (free tier). Vercel Blob under `audio/thai/`, paths hashed
  from (provider+model+voice+lang+text) — stale-clip bug fixed for Thai.
  audioUrl wired into dev-DB thai_items (103/125; nulls are by design:
  ฃ/ฅ, finals, hidden vowels, non-drillable syllables, lesson marker).
  Ledger: `.artifacts/thai-audio/ledger.json`. Script survived an
  ECONNRESET mid-run and resumed idempotently (52+51).
- **Full dev-cycle COMPLETE** (handoff chain in `.claude/plans/`):
  - implementation-summary.md — rounds 1+2, all gates exit 0.
  - review-summary.md — round 1 REQUEST-CHANGES (2 CRITICALs: cross-unit
    mastery deadlock capping units at 0–11%; hidden vowels requiring
    impossible audio-form; 1 HIGH: no server-side unlock check). Round 2
    re-review: **APPROVE-WITH-FINDINGS** (LOWs only).
  - qa-summary.md — **PASS on all A1–A6**, behavioral, real browser +
    real server actions, 10 screenshots in `.claude/plans/qa-artifacts/`,
    fixtures fully cleaned (thai_progress/thai_attempts back to 0).
- **Owner decisions this session**: STRICT mastery (all drill types per
  item) — implemented per-unit-scoped after review found the cross-unit
  deadlock; unit 6 now shows 57 items (letter-final consonants count
  toward unit 6's %, an expected visible change). Backfill SQL validated
  on synthetic rows (matters: prod has real M11 learners).

## Remaining tasks (Phase 5 wrap-up — start here)
1. Update `.claude/plans/active-plan.md`: mark A1–A6 complete, frontmatter
   `status: COMPLETE`, add a Final Status section (mirror M11's pattern).
2. Commit gate: ask owner to approve committing M12 + a commit message.
   Uncommitted alongside M12 code: `.gitignore` (+.artifacts/), the
   `.claude/plans/m11-archive--*.md` files, this handoff chain,
   `.claude/agent-memory/`. Suggest archiving the M12 chain as
   `m12-archive--*.md` (M11 pattern) either pre-commit or at M13 start.
3. Ship: push → Vercel Production deploy. Then prod data steps IN ORDER:
   `npm run db:migrate` against prod (0003 backfill — prod HAS real
   thai_progress rows), `npm run seed:thai` (adds unit-9 items etc.),
   `npm run audio:thai` against prod DB (clips already in Blob → all
   reused, $0.00, just writes audioUrl into prod thai_items). Check how
   M11 ran prod migrations (same scripts with prod DATABASE_URL).
4. Post-ship: update project memory (M12 shipped + residuals), then M13
   planning when owner wants (tone-rules assembly engine unit 10 +
   syllable decode unit 11; word-bank expansion to 80–120 words).

## Known residuals (all LOW, accepted by review — fold into M13 if desired)
- submitThaiAttempt allows unit ≤2 unconditionally (learner could bank
  unit-2 mastery before marking unit 1 read via direct action call).
- Seed invariant can't catch a queries.ts-only regression back to
  cross-unit unlock math (guarded by code comments only).
- Backfill synthetic test covered 1 of 6 kind-fallback CASE branches.
- Tone sparkline coords hand-approximated (comment now says so).
- Unit-6 word audio only used by the "Hear it" reveal button (no tracked
  unit-6 listening drill was specced).

## Environment/state notes
- Dev DB (Neon): 125 thai_items (103 with audio), thai_progress/attempts
  0 rows, migration 0003 applied. Prod: NOT yet migrated/reseeded.
- `.env.local`: GOOGLE_TTS_API_KEY (strip quotes when reading).
- Machine gotcha: after dev-server OOM, `rm -rf .next` before `npm run dev`.
- eslint.config.mjs gained `**/.next/**` + `.artifacts/**` ignores
  (pre-existing gap, fixed in round 1 — part of the M12 diff).
- QA env notes live in `.claude/agent-memory/qa-engineer/`.

## Read before starting
- `.claude/plans/active-plan.md` (contract to mark complete)
- `.claude/plans/qa-summary.md` (verdict + evidence)
- `.claude/plans/review-summary.md` (round-2 re-review + LOW residuals)
- `.claude/plans/m11-archive--active-plan.md` (design appendix, M13 scope)

## Next steps (first actions)
1. Mark active-plan.md COMPLETE (step 1 above).
2. Ask owner: commit message approval + whether to archive the M12 chain
   now; then commit.
3. Propose the ship sequence (deploy + prod migrate/seed/audio-wire) and
   execute on approval.

---
feature: read-thai-m14-build
created: 2026-07-03T09:22:20.678295+00:00
source-session: 05c5b4ff-08cc-49e9-89ca-4b0a00129169
context-at-handoff: 157k (red)
---

# Handoff: Read-Thai M14 BUILD — units 12 (signs+leaders), 13 (numerals), 14 (spaceless tap-split)

## Goal
M14 is FULLY PLANNED and all content is verified. This session runs the BUILD.
M14 is the FINAL Read-Thai milestone — after it ships the 14-unit course is
complete. Do NOT re-plan or re-interview; the contract + content are locked.

## Where you're picking up (planning done last session, all verified)
- **M13 chain archived** → `m13-archive--{active-plan,implementation-summary,
  review-summary,qa-summary}.md`.
- **M14 Validation Contract WRITTEN** → `.claude/plans/active-plan.md` (status
  AWAITING OWNER APPROVAL; assertions A1–A8, build order, resolved forks). READ
  IT FIRST — it is authoritative and detailed.
- **Interview forks RESOLVED (owner-approved 2026-07-03):** Unit 12 = Full
  (sign-function + leader-tone + audio-leader). Unit 13 = both visual directions
  (numeral-value + value-numeral) + audio-numeral. Unit 14 = phrase-split
  tap-boundary widget, SPLIT-ONLY logging (IPA confirm is client-side
  reinforcement, unlogged — mirrors tone-assembly). Audio = BOTH leader words +
  numeral names (paid gate). Leader words = new `leader-word` kind.
- **Content verified + staged** → `.claude/plans/m14-content-bank.md` (implementer
  source of truth) merges three vetted artifacts: `m14-content-numerals.md` (10),
  `m14-content-leaders.md` (12), `m14-content-phrases.md` (20). Special-sign rows
  (4) authored verbatim from research doc §8 inside the content bank. Phrase
  boundary indices INDEPENDENTLY re-verified 20/20 (orchestrator ran
  `scratchpad/verify-phrases.mjs` — every boundary array reproduces its syllable
  split, all in range, strictly increasing).

## First action
Present the one-line M14 scope recap (7 new drill types, 4 new seed kinds, tap-split
widget, ~42 new rows) and get a final **"go"** for the build. Scope itself is
already owner-approved via the interview — this is just the build-start gate per
the "show a plan, wait for approval on multi-file work" rule. On go, run
`/dev-cycle` (skip the planning-interview arg — the contract in active-plan.md IS
the contract, exactly as M13 did).

## Remaining tasks (the build — see active-plan.md A1–A8 for the binding spec)
1. Merge is DONE (content bank staged). Optionally re-run `scratchpad/verify-phrases.mjs`
   to reconfirm 20/20 before seeding.
2. `/dev-cycle` build:
   - **A1 seed:** new kinds in `seed/thai/types.ts` (`SpecialSignItem`,
     `NumeralItem`, `PhraseItem`, `LeaderWordItem`); content in `seed/thai/items.ts`
     verbatim from the content bank; `BUILT_UNITS`→[1..14]; `ALL_THAI_ITEMS` +=
     new arrays.
   - **A2 reachability (BINDING — do first-class, run `seed:thai` early):**
     `lib/thai/reachability.ts` DrillTypeId += `sign-function,leader-tone,
     audio-leader,numeral-value,value-numeral,audio-numeral,phrase-split`;
     `DRILLED_UNITS` += 12,13,14; extend `canEverHaveAudio` (leader-word+numeral
     → true; special-sign+phrase → false); `canDrillTypeScore` branches;
     `reachableDrillTypesForUnit` unit 12/13/14 branches;
     `maxAchievablePercentForUnit`=100 for 12/13/14. Also `VALID_KINDS_FOR_DRILL_TYPE`
     + `lib/thai/types.ts` DrillType union.
   - **A3/A4/A5 drills:** question-build + distractors + `expectedAnswerFor` in
     `lib/thai/drill.ts`; `DrillQuestion` gains optional `phrase` field; new
     `components/thai/drill/phrase-split-question.tsx` (sibling of
     tone-assembly-question.tsx). Seed-time assertion that phrase boundaries
     re-split correctly (A5).
   - **A6 lesson pages** units 12–14 (render §8/§9/§10 from typed seed).
   - **A7 wrap-up:** BUILT_UNITS flip verified; no dangling "coming soon";
     memory `m11-thai-reading-course-decisions.md` gets M14-shipped + course-complete.
3. **Paid audio batch (HARD GATE, A6):** `scripts/generate-thai-audio.ts`
   `deriveAudioText` extended (leader-word→display; numeral→`metadata.name` the
   Thai spelling, NOT the glyph). ~18 clips. Present clip list + cost, WAIT for
   explicit "go", log to `.artifacts/thai-audio/ledger.json`. Voice locked
   `th-TH-Chirp3-HD-Achernar`; `GOOGLE_TTS_API_KEY` in `.env.local` (strip quotes).
4. Handoff chain: implementation-summary → review-summary → qa-summary. Commit +
   push + verify Vercel prod Ready when owner approves.

## Key decisions + rationale (carry into the build)
- **reachability.ts header comments are BINDING.** New drill types MUST be wired
  into DrillTypeId + DRILLED_UNITS + canDrillTypeScore + reachableDrillTypesForUnit
  or `seed:thai` fails loudly (by design). The recurring CRITICAL bug class
  (drillable-but-unreachable item capping a unit below the 90% unlock) hit M11×2,
  M12×1 — the seed invariant + `assertUnitMasteryScopingGuard` catch it.
- **Unit % uses `reachableDrillTypesForUnit` (own session), NEVER
  `allReachableDrillTypesForItem`** (cross-unit union — badges/stats only).
- **Drills mirror the research doc VERBATIM, not a paraphrase** — M13's only HIGH
  was a dropped caveat. §8/§9/§10 quotes are in active-plan.md.
- **audio-leader / audio-numeral are structurally required** (canEverHaveAudio
  true) so units 12/13 legitimately sit <100% until the paid batch runs — the
  documented M12/M13 re-lock pattern, NOT a bug.
- **New `leader-word` kind, NOT reused SyllableItem** — keeps unit-12 self-contained;
  unit-6/10/11 sourcing filters `kind==="syllable" && unit===6` so a unit-12 row
  couldn't be pulled anyway, but a distinct kind makes it impossible by construction.
- **Phrase boundaries = code-point indices (`[...str]`)** — verified. Silent-ห and
  dead-syllable phrases (16 หมากินข้าว, 11 นักเรียนดี) are deliberate
  not-every-syllable-starts-with-a-leading-vowel counter-examples.
- **Content flags:** ๑ teach LOW citation /nɯ̀ŋ/ (colloquial mid noted). `ให้`
  excluded from leaders (pronounced ห). `หรือ` single-source (secondary
  unreachable) — owner may drop if desired. `ไปตลาด` dropped (implicit-vowel
  boundary, no visible cue).

## Dead ends — do not retry
- DB is live prod, one DB for all envs (memory `vercel-prod-db-is-dev-db`): local
  seed/migrate IS prod. Riskier schema work → Neon branch first. Neon MCP can't
  see this DB (Vercel-managed) — use `.env.local` / Vercel CLI.
- tsx one-offs: repo-local gitignored `.artifacts/`, `.mts` for top-level await;
  neon driver needs tagged-template or sql.query().
- qa-engineer agent stalled mid-run 3× in M13 — resume with SendMessage + explicit
  "writing qa-summary.md is the definition of done"; check the file on disk (may
  still be a PREVIOUS milestone's) before accepting.
- PowerShell `vercel ls/inspect` → exit 255 with output on stderr; use the Bash
  tool for vercel CLI.

## Read before starting
- `.claude/plans/active-plan.md` — the M14 Validation Contract (A1–A8), AUTHORITATIVE.
- `.claude/plans/m14-content-bank.md` — implementer content source of truth (+ the
  three `m14-content-*.md` per-bucket verified artifacts it references).
- `lib/thai/reachability.ts` (header comments binding), `lib/thai/drill.ts`
  (VALID_KINDS_FOR_DRILL_TYPE, expectedAnswerFor, distractor helpers),
  `lib/thai/types.ts` (DrillType/DrillQuestion), `seed/thai/types.ts`,
  `seed/thai/items.ts` (BUILT_UNITS ~line 333),
  `components/thai/drill/tone-assembly-question.tsx` (non-MC widget pattern).
- Memory: `vercel-prod-db-is-dev-db.md`, `m11-thai-reading-course-decisions.md`.
- Research doc §8/§9/§10: `seed/thai/research/reading-thai-script.html` (lines
  ~741–804) — quoted in active-plan.md but read verbatim if implementing lesson prose.

## Verification evidence (this session)
- Phrase boundaries: `node scratchpad/verify-phrases.mjs` → "20 phrases checked,
  0 failures" (every boundary array re-splits to the exact syllable list).
- Content agents: numerals 10/10, leaders 12, phrases 20 — all Wiktionary-verified
  with tone contours read from raw Chao pitch letters (page-summary prose
  mislabeled several; corrected).

---
status: COMPLETE
updated: 2026-07-02
---

# Review Summary — M11 Read Thai

## Result
**FINAL VERDICT: APPROVE-WITH-FINDINGS** — see "## Re-review (round 3)" at the bottom of this file for the current, authoritative verdict. (Superseded below: round 1 was RETURN-TO-IMPLEMENTER for the original CRITICAL unlock-ceiling bug; round 2 was RETURN-TO-IMPLEMENTER for a second, previously-missed instance of the same bug class. Both are now confirmed fixed and independently re-verified — see round 3.)

One CRITICAL structural bug permanently blocks progression past unit 6 (units 7–8 can never unlock through legitimate play), which directly violates the A4/A6 unlock contract and the milestone's Done Criteria ("QA validates A3–A7 behaviorally"). Everything else — schema, seed content integrity, mode toggle, Next.js 16 API usage, and the three quality gates — is solid. Recommend a fast, narrow fix-and-re-review rather than a full redo.

## Files Reviewed
- `lib/db/schema.ts`, `lib/db/migrations/0002_flat_liz_osborn.sql`
- `seed/thai/types.ts`, `seed/thai/items.ts`, `scripts/seed-thai-db.ts`
- `lib/thai/types.ts`, `lib/thai/mastery.ts`, `lib/thai/queries.ts`, `lib/thai/drill.ts`, `lib/thai/actions.ts`, `lib/thai/stats.ts`
- `components/mode-toggle.tsx`, `components/thai/thai-home.tsx`, `components/thai/unit-row.tsx`, `components/thai/progress-ring.tsx`, `components/thai/lessons/finals-table.tsx`, `components/thai/lessons/vowel-table.tsx`, `components/thai/drill/drill-session.tsx`
- `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `app/thai/[unit]/lesson/page.tsx`, `app/thai/[unit]/drill/page.tsx`, `app/thai/stats/page.tsx`
- `seed/thai/research/reading-thai-script.html` (spot-check source, grepped section-by-section: consonant table ~346–420, finals table ~433–447, true/false clusters ~767, tone-mark/vowel tables ~484–572, worked examples ~707–727, special-signs table ~748–754)
- `lib/review/time.ts`, `lib/review/queries.ts` (context only, for `ensureLearnerSettings`/timezone helper reuse)

## Findings by Severity

### CRITICAL

- **`lib/thai/drill.ts` (`buildSubjectPool`, unit===6 branch, ~lines 90–103) × `seed/thai/items.ts` `FINALS` (~lines 92–101) × `lib/thai/queries.ts` (`fetchDrillableItemsByUnit` / `getUnitSummaries`, ~lines 15–27, 87–104)**
  Unit 6 in `thai_items` contains 8 `kind:"final"` rows (all `drillable:true` — the `FinalItem` type in `seed/thai/types.ts` even hardcodes the field's TS type to the literal `true`) plus 30 `kind:"syllable"` word-bank rows (also `unit:6`, `drillable:true`) — 38 total. `getUnitSummaries` computes unit 6's `totalItems`/`masteredItems`/`percentMastered` from **every** drillable `thai_items` row tagged `unit:6`, i.e. all 38.
  But `buildSubjectPool(unit===6)` in `drill.ts` only ever builds drill subjects from `consonantsWithFinal` (kind="consonant", spanning units 2–5, filtered by `finalIpa !== null`) and `words` (the 30 syllables filtered by `metadata.finalSound !== null`). It never includes the 8 `kind:"final"` rows as subjects — confirmed by grep: `kind === "final"` / `FinalItem` is referenced nowhere in `lib/thai/*` except a type-union member in `promptKind`; the only consumer of `FinalItem` anywhere in the codebase is the read-only `components/thai/lessons/finals-table.tsx` (lesson display).
  Consequence: the 8 final-sound items can **never** be answered, so their `thai_progress.masteredAt` can never be set. Max achievable mastery for unit 6 is 30/38 = 78.9% → `Math.round` = 79%, permanently below `UNLOCK_THRESHOLD_PERCENT = 90` in `lib/thai/mastery.ts`. Since `getUnitSummaries`'s `previousUnitUnlocksNext` chain (line 104) requires unit 6 ≥90% before unit 7 unlocks, **units 7 and 8 — the entire back half of M11's built curriculum — can never be unlocked through legitimate play.** This breaks A4 ("A unit's drills unlock when the previous unit is ≥90% mastered") and A6, and would fail QA's own behavioral validation the moment a tester tries to reach unit 7.
  Fix direction: either (a) set `drillable: false` on the 8 `FinalItem` rows (they're lesson-only content, same pattern already used for the unit-1 `LessonMarkerItem`) so they're excluded from `fetchDrillableItemsByUnit`'s totals, or (b) add a genuine "given this final sound, pick the letters that produce it" drill type that uses them as subjects. (a) is the minimal, spec-consistent fix — the Appendix only calls for "letter→final sound, word→final sound" drill types for unit 6, neither of which needs the `final:x` rows as subjects.

### HIGH

- **`lib/thai/actions.ts:64-118` (`submitThaiAttempt`) + `components/thai/drill/drill-session.tsx:47-52`** — the server action's "expected" (correct) answer is supplied entirely by the client (`question.correct`, itself already shipped to the browser inside the drill-round payload before the question is answered), and `correct = expected === chosen` is computed by comparing two client-controlled values with no server-side re-derivation from `itemId`/`drillType` against `thai_items`. The task brief explicitly asked me to verify server actions never trust client input for anything security/integrity-relevant; `learnerId` is correctly session-derived here, but the *correctness signal that drives mastery and the `thai_attempts` log* is not. Because the correct answer is already visible in the network response before the user answers, a technically-inclined user (or a buggy client build) can force `correct: true` on every attempt via a raw fetch to the action, instantly maxing every streak/mastery flag and corrupting the accuracy/failure-heatmap stats on `/thai/stats`. Given this is a personal-use app the exploit motive is low, but the integrity gap is real and cheap to close: have `submitThaiAttempt` look up the item server-side (and ideally recompute the expected value for the given `itemId`+`drillType`) rather than accepting `expected` as a parameter at all.

### MEDIUM

- **`lib/thai/actions.ts:81-115` (`submitThaiAttempt`)** — read-then-write race: the current `(streak, masteredAt)` is fetched via a plain `SELECT` *before* the `db.batch([...])` that inserts the attempt and upserts progress; the SELECT is not part of the same transaction. I confirmed `db.batch` on the neon-http driver *is* transactional (`this.client.transaction(builtQueries, queryConfig)` in `node_modules/drizzle-orm/neon-http/index.cjs:117-132`), but the preceding read is not covered by it. Two concurrent submissions for the same `(learnerId, itemId)` — e.g. the same learner open in two tabs, or a retried request — can both read the same stale streak and one write clobbers the other's progress (a lost update). Low likelihood given the client's `pending`-gated single-flight UI in `drill-session.tsx`, but worth wrapping the read+write in one `db.transaction` for correctness.
- **`lib/thai/drill.ts:47-63` (`weightedPick`) doc comment vs. behavior** — the function's comment says "Weighted pick **without replacement**", but nothing removes a selected subject from `scored` between iterations; only an immediate repeat of the *previous* question is avoided. Over a 15-question round drawn from a 9-item pool (e.g. unit 2's mid-class consonants), the same item can and will appear 2–3 times non-consecutively — plausibly intended (round size is fixed at ~15 regardless of pool size, per A6), but the comment claims the opposite of what the code does, which will mislead future maintainers. Fix the comment, or implement genuine without-replacement-until-exhausted-then-reshuffle if that was the actual intent.
- **`thai_progress` keyed by `(learnerId, itemId)` only, no `drillType` column (documented as Issue #3 in the implementation summary)** — I traced the actual consequence rather than taking the implementer's framing at face value: because `applyAttempt` on an incorrect answer only zeroes `streak` and never clears `masteredAt` (`mastery.ts:14-15`), an already-mastered item cannot be "un-mastered" by a later wrong answer in a different drill type — so this does **not** cause previously-unlocked units to silently re-lock (my initial hypothesis, which I retracted after reading `mastery.ts` closely). It does still mean a consonant's letter-sound / letter-class / letter-final competencies are not tracked independently: 1 correct answer in each of three different question types can jointly satisfy the same 3-streak and mark the item "mastered" without ever demonstrating 3 consecutive correct answers on any single skill. Worth reconsidering before M12 reuses this table for tone-ear perception drills (where the confusion-matrix use case makes per-drill-type granularity more valuable), but not blocking for M11.

### LOW

- **`lib/thai/stats.ts:48-51` (`keyToUtcInstant`)** hardcodes `7 * 60 * 60 * 1000` instead of importing `THAILAND_OFFSET_MS` from `lib/review/time.ts`, which already centralizes this exact constant with a comment stating "this file is the single source of truth for that offset so callers don't each hard-code it." Duplication risk if the offset ever needs to change (unlikely — Thailand has no DST — but a one-line fix and consistent with the project's own stated convention).
- Low-class A/B consonant split and the `kind:"final"` enum-list addition (Spec Deviations #2, #3 in the implementation summary) are reasonable, transparently-documented authoring/schema judgment calls — no objection beyond the CRITICAL finding above (which is about the `drillable` flag, not the `kind` value itself).
- Word bank size (~30 vs. the Appendix's aspirational 80–120, Spec Deviation #1) — sound judgment; correctly follows the "no fabricated linguistic data" rule over the aspirational count, and the Appendix itself defers full expansion to M13. Not escalating.
- Vowel unit-8 "shape-changer" ◌็ placement (Spec Deviation #5) — reasonable; content is quoted verbatim and the doc doesn't force a strict Section-boundary mapping onto the unit map.

## Spec Deviations — assessment
1. Word bank size (~30, not 80–120) — sound, no escalation needed.
2. `kind:"final"` as an 8th value beyond the Contract's enum list — sound in isolation (the column is untyped `text`); **the real bug is not the enum value but that these rows are marked `drillable:true` with no corresponding drill subject — see CRITICAL above.**
3. Low-class A/B split — sound authoring call, transparently documented in a code comment.
4. Unit 1 completion via sentinel `thai_items` row — sound, mirrors the schema's actual shape (A1) without adding a table.
5. ◌็ classified as unit-8 vowel content despite living in the doc's "special signs" section — sound.

## Assertions Checked
- **A1 (Schema): PASS** — `thaiItems`/`thaiProgress`/`thaiAttempts`/`learnerSettings.activeMode` match the contract; Mandarin tables (`cards`, `words`, `reviewStates`, `reviewLogs`) untouched (verified by reading the full `schema.ts`); migration SQL matches Drizzle's generated FKs/indexes.
- **A2 (Seed): PASS** — `scripts/seed-thai-db.ts` is idempotent (delete-then-upsert, duplicate-id guard, never touches Mandarin tables); spot-checked ~15 items (all 44 consonants' class/IPA/finals, all 8 finals + examples, and the syllables ทราย/สบาย/กรง/รัก/ดอก/ฑ) against `reading-thai-script.html` line-by-line — all exact matches, no fabricated data found.
- **A3 (Mode toggle): PASS** — `setActiveMode` derives `learnerId` from session, validates the mode value against `"mandarin"|"thai"`, upserts via `onConflictDoUpdate`; `app/page.tsx` defaults missing/other rows to the Mandarin flow; Mandarin's `ReviewSession`/`EmptyState`/stats link/sign-out are otherwise unchanged — only the toggle is added to the header (consistent with A3's own requirement to show the toggle there).
- **A4 (Unit map): FAIL** — see CRITICAL finding; units 7–8 cannot unlock because unit 6 cannot reach 90% mastery. Unit 1 lesson-only/lock logic and units 2–5's lock chain verified correct otherwise.
- **A5 (Lessons): PASS** — lesson pages read directly from `seed/thai/items.ts` (single source of truth shared with drills), Noto Sans Thai scoped via the `.font-thai` utility/`--font-thai` CSS var, Mandarin typography untouched.
- **A6 (Drills/mastery/attempts): PARTIAL** — MC round construction, weighted sampling, and confusable-set distractors are correctly implemented, and ฃ/ฅ are structurally excluded (verified: every drill query filters `drillable=true`, and only ฃ/ฅ + the lesson-marker are `drillable:false`). Mastery streak logic in `mastery.ts` is correct in isolation. However the HIGH finding (client-trusted `expected`) and the CRITICAL finding (unit-6 unlock ceiling) both fall under this assertion.
- **A7 (Stats): PASS** — all five charts/aggregations present and queries look correct; reuses `lib/review/time.ts` day-key helpers (bar the LOW duplication note above).
- **A8 (Quality gates): PASS** — independently re-run below; results match the implementation summary's claims exactly.

## Commands Run
All re-run independently in the same working tree, not copied from the implementer's summary.

- `npx tsc --noEmit` — exit 0
  ```
  (no output — clean)
  ```
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint

  (no errors/warnings printed)
  ```
- `npm run build` — exit 0
  ```
  ▲ Next.js 16.2.6 (Turbopack)
  - Environments: .env.local

    Creating an optimized production build ...
  ✓ Compiled successfully in 7.2s
    Running TypeScript ...
    Finished TypeScript in 9.2s ...
    Collecting page data using 10 workers ...
  ✓ Generating static pages using 10 workers (6/6) in 1417ms
    Finalizing page optimization ...

  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats

  ƒ Proxy (Middleware)
  ```
  (Same pre-existing multi-lockfile warning noted in the implementation summary, referring to `C:\Users\User\package-lock.json` — unrelated to this change.)
- Verified `db.batch`'s transactionality directly by inspecting `node_modules/drizzle-orm/neon-http/index.cjs:117-132` (`this.client.transaction(builtQueries, queryConfig)`), rather than assuming it, before rating the read-then-write race as MEDIUM instead of a higher severity.
- Did **not** re-run `npm run seed:thai` or `npm run db:generate`/`db:migrate` against the dev Neon DB in this pass — no code changes were made during review, and static analysis of `seed-thai-db.ts` + `items.ts` (duplicate-id guard, delete-then-upsert pattern) was sufficient to independently confirm idempotency without touching the live dev DB. Flagging this as a re-run candidate for QA once the CRITICAL fix lands.

All three quality-gate results match the implementation summary's claims exactly — no discrepancy found.

## Residual Risk
- The CRITICAL finding must be fixed and this milestone re-reviewed before QA proceeds to behavioral validation of A4/A6 — QA's own protocol will hit the same permanently-locked-unit-7 wall the moment it tries to validate progression past unit 6.
- The HIGH client-trust finding is a design gap that should be closed before this app is ever used by a second/less-trusted learner, even though current exploit risk is low (single trusted user, personal app).
- The MEDIUM shared-streak-across-drill-types design should be revisited before M12 reuses `thai_progress` for tone-ear perception drills, where the confusion-matrix use case makes per-drill-type granularity more valuable.
- No automated tests exist for `lib/thai/mastery.ts` / `lib/thai/drill.ts` (implementer-acknowledged, consistent with the rest of the repo's convention) — the CRITICAL bug found here is exactly the kind of thing a handful of unit tests on `buildSubjectPool`/`getUnitSummaries` would catch mechanically (e.g. "assert every drillable item returned for a unit is reachable as a subject of at least one drill type for that unit"). Worth considering going forward even without a full test framework.
- Content spot-check was a sample (~15 of 113 items), not exhaustive; no discrepancies found in the sample, but the remaining ~98 items were not individually re-verified against the source doc.

## Procedure Compliance
- Plan consulted before review: yes — read `.claude/plans/active-plan.md` in full, including the Appendix.
- Implementation summary read: yes — read `.claude/plans/implementation-summary.md` in full, including all 5 documented spec deviations and 3 documented issues.
- Every changed/new file in the stated review scope was read in full.
- Commands re-run independently (not trusting pasted output): yes — `tsc`, `lint`, `build`; plus direct inspection of `drizzle-orm`'s `neon-http` batch implementation to confirm a transactionality claim rather than assuming it.
- Review summary written: yes.

---

## Re-review (round 2)

### Revised Result
**RETURN-TO-IMPLEMENTER** — 4 of the 5 fixes are solid and verified. But independent re-verification found that **the CRITICAL unit-6-unlock-ceiling bug is not actually fully fixed** — it was fixed for the exact rows the round-1 finding named (`FinalItem`), but the identical bug pattern exists a second time, undetected, in the unit-6 word bank, and I missed this instance during round 1. Unit 6's maximum achievable mastery is still below the 90% unlock threshold, so units 7–8 still cannot unlock through legitimate play. This is a mechanical, narrow fix (same shape as round 1's fix), not a design problem — should be a fast round 3.

### Files re-reviewed
- `seed/thai/types.ts`, `seed/thai/items.ts`, `lib/thai/drill.ts`, `lib/thai/actions.ts`, `lib/thai/stats.ts`, `components/thai/drill/drill-session.tsx` (all 6 files named in the round-2 fix list, read in full)
- `lib/thai/types.ts` (to confirm `DrillType` union matches `KNOWN_DRILL_TYPES`)
- `lib/review/time.ts` (to confirm `THAILAND_OFFSET_MS` export)
- `node_modules/drizzle-orm/neon-http/session.cjs` (implementer's claim that `db.transaction()` throws on this driver — not independently re-checked this round beyond trusting the round-1-verified `batch` transactionality; the "no interactive transactions" claim is consistent with the batch-via-`client.transaction()` implementation already inspected in round 1)

### Per-finding verdicts

**CRITICAL — unit 6 unlock ceiling: PARTIALLY FIXED, bug persists in a second location (blocking).**
The fix correctly sets `drillable:false` on all 8 `FinalItem` rows (`seed/thai/types.ts` hardcodes the field's TS type to the literal `false`; `seed/thai/items.ts`'s `FINALS` array confirmed accordingly). I independently re-queried the live dev DB (read-only) rather than trusting the implementer's pasted numbers:
```
unit6 total: 38 drillable: 30
finals drillable flags: final:j:false, final:k:false, final:m:false, final:n:false, final:p:false, final:t:false, final:w:false, final:ŋ:false
```
This confirms the denominator dropped from 38 to 30 as claimed. **However**, I then checked whether all 30 remaining drillable rows are actually reachable as drill subjects — the exact question the round-1 CRITICAL finding was about — and they are not. `buildSubjectPool`'s unit-6 branch (`lib/thai/drill.ts`) only turns a `kind:"syllable"` row into a `word-final` subject when `metadata.finalSound !== null`. Of the 30 drillable unit-6 syllables in `seed/thai/items.ts`'s `WORD_BANK`, **9 have `finalSound: null`** (words that don't end in a consonant final — used as vowel-form illustration examples, not final-sound examples): ปลา, ดี, มือ, คา, ขา, ข่า, นา, มา, ไป. These 9 are `drillable:true`, tagged `unit:6`, counted in `getUnitSummaries`'s denominator — and, like the `FinalItem` rows before the fix, can never be answered by any drill type unit 6 builds, so they can never be mastered. I verified this against the live DB (read-only query, mirroring `getUnitSummaries`'s and `buildSubjectPool`'s exact filter logic):
```
unit6 drillable total (denominator): 30
reachable as word-final subjects: 21
unreachable (syllable, drillable, but finalSound null): 9
unreachable ids: syllable:ปลา, syllable:ดี, syllable:มือ, syllable:คา, syllable:ขา, syllable:ข่า, syllable:นา, syllable:มา, syllable:ไป
max achievable unit-6 percentMastered: 70 %  (unlock threshold is 90%)
```
Max achievable mastery for unit 6 is **70%**, still below the 90% unlock threshold — units 7–8 remain permanently unreachable through legitimate play, exactly the same user-facing failure mode as the original CRITICAL finding, just with a smaller denominator than before (30 instead of 38) and a different set of orphaned rows (9 null-`finalSound` words instead of 8 `final:x` rows).
*I own this miss*: my round-1 review verified the `FinalItem` instance of this pattern but did not check whether any other `kind:"syllable"` rows in the same unit had the same "counted-but-unreachable" property — I should have generalized the check to "does every drillable row in this unit's denominator have a reachable path through `buildSubjectPool`" rather than stopping at the one instance the code had obviously missed. Flagging this in my personal review-pattern memory going forward.
Fix direction (same shape as round 1, item is analogous): mark those 9 specific `WORD_BANK` rows `drillable:false` (they're currently lesson-illustration-only — no drill type in M11's scope uses a word's vowel form as an answerable subject) — the minimal, spec-consistent fix. Alternative: give them a genuine subject role (e.g. a "word→vowel form" drill folded into units 7/8, since they carry `metadata.vowelForm`), but that's new drill-type work beyond M11's stated scope (unit 6 is only "letter→final sound, word→final sound" per the Appendix) and should not block this milestone. Recommend option (a).

**HIGH — server-side answer verification: FIXED, verified.**
`submitThaiAttempt`'s signature is now `(itemId, drillType, chosen)` — no `expected` parameter. Confirmed: (1) `drillType` is validated against `KNOWN_DRILL_TYPES`, a literal array I diffed against `DrillType`'s type union in `lib/thai/types.ts` — identical 5 values, no drift. (2) The item is looked up fresh from `thai_items` by `itemId` inside the action. (3) `expectedAnswerFor(item, drillType)` (exported from `lib/thai/drill.ts`) is the single implementation used both here and inside `buildQuestion` (the round-builder) — I traced every one of the 5 `DrillType` branches in `expectedAnswerFor`'s switch against `buildQuestion`'s corresponding branch and confirmed each returns the identical field (`initialIpa`, `consonantClass`, `finalIpa`, `metadata.finalSound`, `initialIpa` again for `form-sound`) — so there is no drill type the round builder can emit that `expectedAnswerFor` can't independently re-derive. (4) `components/thai/drill/drill-session.tsx` now calls `submitThaiAttempt(question.itemId, question.drillType, option.value)` — confirmed `question.correct` is no longer sent to the server at all; it's used client-side only for the reveal highlighting, which is a pure display concern with no security relevance. No client-supplied correctness signal remains in the scoring path.
*Residual LOW note (new, not blocking)*: `expectedAnswerFor`'s switch derives an answer from whatever field the `drillType` maps to, regardless of whether that `drillType` is one `buildSubjectPool` would ever actually pair with that item's `kind` — e.g. a raw call with `itemId` = a vowel row and `drillType:"letter-sound"` would return that vowel's own `initialIpa` (vowels have that field too) rather than throwing, even though vowels are never presented with `letter-sound` in a real round. This can't be used to fabricate an arbitrary correct value (it's still constrained to real DB field values, and `thai_progress`'s shared-streak-across-drill-types issue is an already-accepted MEDIUM from round 1), so it doesn't reopen the HIGH finding, but a stricter version would also check `item.kind` is one that `drillType` legitimately applies to before deriving an answer. Not blocking; worth a follow-up.

**NEW DEVIATION — vowel `form-sound` narrowed to forward-only: ACCEPTABLE for M11, recommend revisiting for M12/M13, not blocking.**
The Appendix literally says "form↔sound" for units 7–8 (bidirectional arrow notation), and the round-1 implementation did randomize direction per question. Dropping to forward-only (Thai form shown → learner picks the IPA sound) to make `expectedAnswerFor` a pure function of `(itemId, drillType)` is a real, if minor, narrowing of drill variety. I judge this acceptable rather than a violation to escalate, for three reasons: (1) it was the direct, transparent, necessary consequence of closing a genuine HIGH security/integrity finding — the alternative (keeping a client-supplied "which direction was shown" flag) would just relocate the exact same trust problem rather than solve it; (2) forward reading-recognition (form → sound) is arguably the more foundational skill for a course literally named "Read Thai," while sound → form is closer to a spelling/production skill; (3) it's explicitly documented as Spec Deviation #7 in the implementation summary, not silently dropped. Recommended (not required) follow-up: reintroduce the reverse direction as its own explicit `DrillType` value (e.g. `"sound-form"`) rather than a randomized runtime flag — that would restore bidirectional coverage while keeping `expectedAnswerFor` pure, and is a small, well-scoped addition for M12/M13 rather than something that needs to hold up M11.

**MEDIUM — TOCTOU race in `submitThaiAttempt`: FIXED, verified by code inspection.**
Read the new SQL closely against Postgres's actual `ON CONFLICT DO UPDATE` semantics rather than taking the implementer's prose at face value:
- In the `DO UPDATE SET` clause, unqualified `thai_progress.column` references resolve to the **pre-update** row (the existing row being conflicted into), not the row being computed by this same `SET` clause — so `streak = CASE WHEN correct THEN thai_progress.streak + 1 ELSE 0 END` and the `mastered_at` CASE's own `thai_progress.streak + 1` both read the *same* pre-update streak value consistently; there's no risk of one expression seeing a partially-updated value from the other.
- `mastered_at`'s CASE is sticky-once-set (`WHEN thai_progress.mastered_at IS NOT NULL THEN thai_progress.mastered_at`) before it ever considers setting a new value, so a wrong answer (which sends `correct=false` into the second branch, which fails) always falls through to the `ELSE thai_progress.mastered_at` — i.e., **never clears** an existing mastery, and never sets one on an incorrect answer. Matches `applyAttempt`'s documented rule exactly.
- The INSERT branch (first-ever attempt) computes `mastered_at` from a literal `1 >= MASTERY_STREAK` (always false while `MASTERY_STREAK=3`), so a first attempt can never instantly "master" an item — correct.
- `now()` within Postgres returns the current *transaction's* start timestamp — invariant across every call within one statement/transaction — so `last_seen = now()` and a `mastered_at = now()` set within the *same* statement will always be textually identical, while a `mastered_at` carried over from an *earlier* transaction will (for all practical purposes) never coincide with the current statement's `last_seen = now()`. The `newlyMastered = mastered_at === last_seen` string-equality trick is therefore sound, not a coincidental hack.
- The atomicity concern itself — a prior separate SELECT read being raced by a concurrent write — is fully closed: there is no longer any read before the mutating statement; the single `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` is the only statement touching `thai_progress`, and Postgres's own row lock on the conflicting unique index (`learner_id, item_id`) serializes concurrent submissions for the same pair.
I did not re-run a live mutating probe against the dev DB myself for this one (unlike the CRITICAL/unit-6 check, which was read-only): doing so would require writing to a real learner's `thai_progress` row, and while the implementer's disposable-test-row approach is fine for them, I chose not to risk touching live progress data for a re-verification that the SQL's static logic already makes clear-cut. I'm confident in this verdict from code inspection alone.
*New LOW note*: splitting the previous atomic `db.batch([insertAttempt, upsertProgress])` into two independent statements (the upsert, then a separate `db.insert(thaiAttempts)`) trades away the atomicity *between the attempt log and the progress update* that round 1 had (both were in one transaction via `batch`). If the process crashes or the connection drops between the two statements, mastery could advance with no corresponding `thai_attempts` row logged for that attempt — a minor completeness gap in `/thai/stats`'s accuracy/failure-heatmap data, not a mastery-correctness bug. Low probability, low impact; worth a follow-up (e.g. a single `WITH ... INSERT ... RETURNING ... INSERT INTO thai_attempts ...` CTE) but not blocking.

**MEDIUM — `weightedPick` comment: FIXED, verified.**
Comment now accurately reads "Weighted pick **with replacement**..." and correctly describes the actual repeat-avoidance rule (skip an exact back-to-back repeat of the immediately-previous subject). Matches the unchanged sampling behavior. No further issue.

**LOW — hardcoded Thailand offset: FIXED, verified.**
`lib/thai/stats.ts` now imports `THAILAND_OFFSET_MS` from `lib/review/time.ts` and uses it in `keyToUtcInstant` instead of the inline `7 * 60 * 60 * 1000` literal. Confirmed via grep that `THAILAND_OFFSET_MS` is in fact exported from `lib/review/time.ts`.

**Deferred MEDIUM — `thai_progress` lacks a `drillType` dimension.** Left as-is per the coordinator's explicit instruction not to touch the schema this round. No new information changes my round-1 assessment (streak-sharing across drill types is a real but non-blocking design smell to revisit before M12).

### Commands Run (round 2, independently re-run)

- `npx tsc --noEmit` — exit 0
  ```
  (no output — clean)
  ```
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint

  (no errors/warnings)
  ```
- `npm run build` — exit 0
  ```
  ▲ Next.js 16.2.6 (Turbopack)
  - Environments: .env.local

    Creating an optimized production build ...
  ✓ Compiled successfully in 7.4s
    Running TypeScript ...
    Finished TypeScript in 8.8s ...
    Collecting page data using 10 workers ...
  ✓ Generating static pages using 10 workers (6/6) in 1399ms
    Finalizing page optimization ...

  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats

  ƒ Proxy (Middleware)
  ```
  All three gates match the round-2 implementation summary's claims exactly — no discrepancy.
- Independent read-only DB query (own disposable `.mjs` script, deleted after use — no writes, no risk to real data) verifying the CRITICAL fix's actual denominator/reachability, reproduced above under the CRITICAL finding — this is what surfaced the still-open second instance of the bug. Exit 0.
- Did not re-run the implementer's live mutating state-machine probe for the MEDIUM TOCTOU fix (chose static SQL-semantics verification instead, to avoid writing to real learner progress rows for a re-check — see reasoning under that finding).

### Residual Risk (round 2, supersedes round 1's list where overlapping)
- **Blocking**: the unit-6 unlock ceiling is still not fixed (9 orphaned word-bank rows). QA must not proceed to behaviorally validate A4/A6 (reaching unit 7/8) until this lands — it will fail identically to round 1's finding.
- The HIGH client-trust fix is solid; the new LOW residual (kind/drillType cross-checking) is worth a follow-up but does not reopen the finding.
- The new LOW atomicity-between-attempt-and-progress-write note (round 2) should be tracked alongside the deferred MEDIUM (`drillType` dimension on `thai_progress`) as pre-M12 cleanup items.
- The forward-only vowel drill narrowing (accepted) means units 7–8's drill variety is reduced from the original bidirectional design; flag to the user/product owner if drill repetitiveness becomes noticeable in practice, since a fix (a second explicit `DrillType`) is cheap.
- All content-integrity and Mandarin-non-regression conclusions from round 1 stand unchanged (no files affecting those areas were touched this round).

### Procedure Compliance (round 2)
- Round-2 fix list read in full (`## Review Fixes (round 2)` section of `implementation-summary.md`) before re-reviewing: yes.
- Every file named in the round-2 touched-file list was read in full: yes.
- Commands re-run independently, not copied from the implementer: yes (`tsc`, `lint`, `build`, plus an original read-only DB verification script that the implementer did not run in this exact form — it's what caught the still-open bug).
- Revised Result stated: yes — RETURN-TO-IMPLEMENTER, with a narrow, clearly-scoped remaining fix.
- Review summary updated in place (this file): yes.

---

## Re-review (round 3)

### FINAL Result
**APPROVE-WITH-FINDINGS**

Both CRITICAL instances of the unlock-ceiling bug (round 1's 8 `FinalItem` rows, round 2's 9 null-`finalSound` word-bank rows) are now confirmed fixed, and — more importantly — a mechanical, tested invariant (`lib/thai/reachability.ts` + `scripts/seed-thai-db.ts`'s pre-write assertion) now exists specifically to prevent a third recurrence of this exact bug class. I independently re-verified the whole-unit denominators for every drilled unit (2–8) against the live DB with my own from-scratch reimplementation of the reachability logic — not by re-running or trusting the implementer's script — and got an exact match: 93 total drillable items, unit 6 = 21, zero orphans anywhere. All three quality gates (`tsc`, `build`, scoped `lint`) pass, independently re-run. Nothing found this round rises to CRITICAL/HIGH/blocking; the remaining items are non-blocking residuals already surfaced in round 2 (unchanged) plus one newly-confirmed design choice (the mechanical invariant's scope). Recommend proceeding to QA.

### 1. The 9 finalSound-null syllables — VERIFIED FIXED
Read `seed/thai/items.ts`'s `WORD_BANK` array directly: `syllable:ปลา`, `syllable:ดี`, `syllable:มือ`, `syllable:คา`, `syllable:ขา`, `syllable:ข่า`, `syllable:นา`, `syllable:มา`, `syllable:ไป` — exactly the 9 rows named in the round-2 finding — now all read `drillable: false`. All other 21 `WORD_BANK` rows are unchanged at `drillable: true`. `seed/thai/types.ts`'s `SyllableItem.drillable` field type changed from the literal `true` to `boolean` (confirmed by reading the interface directly), consistent with the `FinalItem` pattern from round 2, with a doc comment explaining why. No other `WORD_BANK` field (display/IPA/gloss/vowelForm) was touched — only the `drillable` flag, so round-1's content-integrity spot-checks still stand.

### 2. `lib/thai/reachability.ts` — VERIFIED as genuine single source of truth
- **Pure, no DB import**: read the full file — it imports nothing beyond its own types; no `@/lib/db`, no `neon`/`drizzle` import anywhere. Confirmed.
- **`buildSubjectPool` in `lib/thai/drill.ts` consumes it, not a parallel reimplementation**: read `drill.ts` directly — `import { computeReachableIds } from "./reachability"` at the top, and all three branches (units 2–5, unit 6, units 7–8) call `computeReachableIds(...)` and filter their fetched DB rows against the returned `Set` before turning them into `Subject`s. There is no second hand-written "is this reachable" predicate left in `drill.ts` — the unit-6 branch in particular now calls `computeReachableIds(6, [...unit6Items, ...consonantsWithFinal])` and filters both the words and cross-unit consonants against that single result, exactly matching `reachability.ts`'s own unit-6 branch logic (which happens to be the one with real complexity — units 2–5/7–8's "reachable" and "denominator" filters are structurally identical by construction, so those three units can't develop this bug class regardless).
- **`scripts/seed-thai-db.ts` calls `assertEveryDrillableItemIsReachable()` before any write and exits non-zero on violation**: read the script directly — the call happens immediately after the pre-existing duplicate-id guard (`ids.filter(...)` dupe check) and *before* the first `db.select()` for `doomed` (i.e., before any read or write touches the DB). On violation it `throw`s a message naming every offending unit and item id; `main().catch((err) => { console.error(err); process.exit(1); })` at the bottom means any thrown error (this one included) prints and exits 1, identical to how the existing duplicate-id guard already fails. Confirmed by direct code reading, not by trusting the implementer's description.
- **Detection genuinely works, verified independently**: wrote and ran my own disposable script (`verify-detect-tmp.mts`, deleted after use — imported the *real*, unmodified `lib/thai/reachability.ts` and `seed/thai/items.ts` modules, cloned `ALL_THAI_ITEMS` in memory, flipped `syllable:ปลา` back to `drillable:true` to simulate the round-3 regression, and called `findUnreachableDrillableIds(6, mutated)` directly):
  ```
  orphans after simulated regression: [ 'syllable:ปลา' ]
  DETECTION WORKS
  real-data check done (no output above this line = zero orphans)
  ```
  This is a genuinely independent check (own script, own mutation, not a rerun of the implementer's disposable probe) confirming the invariant both fires on a real regression and passes clean on the actual shipped data.

### 3. Whole-unit denominators for ALL units 2–8 — INDEPENDENTLY RE-VERIFIED, matches implementer's claim exactly
Wrote my own read-only script against the live dev DB (not importing the implementer's `reachability.ts`/query code at all — a from-scratch reimplementation of the same filter logic, purely from reading the source, to cross-check rather than just re-run their code):
```
unit 2: denominator=9 orphans=0
unit 3: denominator=10 orphans=0
unit 4: denominator=12 orphans=0
unit 5: denominator=11 orphans=0
unit 6: denominator=21 orphans=0
unit 7: denominator=18 orphans=0
unit 8: denominator=12 orphans=0
TOTAL drillable across units 2-8: 93
RESULT: PASS - zero orphans, 100% achievable in every unit
```
This matches the implementer's claimed "93 drillable items total, unit 6 now 21, zero orphans" exactly, via an independent code path (my own inline filter logic against a fresh DB read), not a re-run of their tooling. Every unit's mastery percentage can now genuinely reach 100%, so every unlock threshold (90%) is satisfiable, so units 7–8 (and the full unit-2-through-8 chain) can unlock through legitimate play. **A4/A6's unlock contract is now actually satisfiable end-to-end.**

### 4. Quality gates — INDEPENDENTLY RE-RUN, all pass
Re-ran each command myself with output redirected to a file first (catching my own mistake mid-session: piping directly through `tail` loses the real exit code and reports `tail`'s exit status instead — re-ran all three correctly after catching this):
- `npx tsc --noEmit` — exit 0, no output.
- `npm run build` — exit 0:
  ```
  ✓ Compiled successfully in 5.9s
    Running TypeScript ...
    Finished TypeScript in 7.1s ...
  ✓ Generating static pages using 10 workers (6/6) in 930ms
  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ```
  (Same pre-existing multi-lockfile warning as every prior run — unrelated to this change.)
- `npx eslint app lib components seed scripts` (scoped, as requested) — exit 0, no output.
- Confirmed the reason for scoping: `npm run lint` (repo-wide) reports many errors, but every single one is under `.claude/worktrees/french-course/.qa-tmp/*.mts` — confirmed via `git status --porcelain -- .claude/worktrees` that this entire directory is untracked (`??`) and via its path/content (a separate French-course QA workstream's scratch type-check scripts, full of `no-explicit-any`/`@ts-ignore` violations) that it is unrelated to M11's change set. Scoping lint to M11's actual directories (`app lib components seed scripts`) is the correct check, and it's clean.

### 5. `npm run seed:thai` — run live, reachability output observed directly
```
[reachability] OK — every drillable item across units 2,3,4,5,6,7,8 (93 total) is reachable as a drill subject.
[delete] 0 dropped item(s).

Done. 0 inserted, 113 upserted-as-update, 0 deleted. Total items: 113.
```
Confirms: the check runs and passes on real data (matching my independent 93/21/zero-orphans verification above), and the seed remains idempotent (0 inserted, 113 upserted-as-update, 0 deleted — no drift, safe to re-run any time).

### Outstanding non-blocking items (unchanged from round 2, not re-litigated — still valid, still not blocking)
- LOW: `expectedAnswerFor` derives an answer from whatever field a `drillType` maps to without checking that `drillType` is one `buildSubjectPool` would ever actually pair with that item's `kind` (e.g. a raw call could pair a vowel item with `drillType:"letter-sound"`). Doesn't allow fabricating an arbitrary value, doesn't reopen the HIGH finding. Worth a follow-up.
- LOW: the attempts-log insert and the progress upsert are two independent statements (not one transaction) since the MEDIUM TOCTOU fix in round 2 — a process crash between them could leave mastery advanced with no corresponding `thai_attempts` row. Minor completeness gap in `/thai/stats`, not a mastery-correctness bug.
- Deferred MEDIUM (explicit coordinator instruction, unchanged): `thai_progress` has no `drillType` dimension, so a consonant's letter-sound/letter-class/letter-final competencies share one streak. Revisit before M12 reuses this table for tone-ear perception drills.
- Accepted deviation (unchanged): vowel `form-sound` drill is forward-only (form → sound), not the Appendix's literal bidirectional "form↔sound," traded for closing the HIGH client-trust finding cleanly. Recommend a follow-up second `DrillType` (e.g. `"sound-form"`) in M12/M13 to restore bidirectional coverage without reopening the purity requirement.
- Content spot-check (round 1) remains a ~15-of-113-item sample, not exhaustive — no new display/IPA/gloss content was touched in rounds 2–3 (only `drillable` flags changed), so this residual is unchanged and still applies only to the ~98 items never individually re-verified against the source doc.

### Residual Risk (round 3, final)
- None of the residual items above are blocking for M11 sign-off; all are either explicitly deferred by the coordinator, accepted trade-offs with a documented follow-up path, or minor (LOW) completeness/precision gaps that don't affect correctness of the shipped mastery/unlock model.
- QA can now behaviorally validate the full A3–A7 chain, including reaching and unlocking units 7–8, without hitting the structural wall that blocked rounds 1 and 2.
- Recommend the mechanical reachability check (`lib/thai/reachability.ts` + the seed script's pre-write assertion) be kept in mind as a template: any future unit/content addition should be run through `npm run seed:thai` before merging, since that's now the only thing that would have caught this bug class the first time.

### Procedure Compliance (round 3)
- Round-3 fix section read in full (`## Review Fixes (round 3)` of `implementation-summary.md`) before re-reviewing: yes.
- Every file named in the round-3 verification list was read in full: yes (`seed/thai/types.ts`, `seed/thai/items.ts`, `lib/thai/reachability.ts`, `lib/thai/drill.ts`, `scripts/seed-thai-db.ts`).
- Commands re-run independently, not copied from the implementer: yes — `tsc`, scoped `eslint`, `build`, `seed:thai`, plus two original scripts (a live-DB whole-unit reachability re-derivation, and a detection-regression probe against the real modules) that the implementer did not paste in this exact form.
- Caught and corrected my own tooling mistake mid-review (piping through `tail` silently discards the real exit code) before relying on any exit-code claim in this round's evidence.
- FINAL Result stated: yes — APPROVE-WITH-FINDINGS.
- Review summary updated in place (this file): yes.

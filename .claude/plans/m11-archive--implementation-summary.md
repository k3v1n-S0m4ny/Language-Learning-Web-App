---
status: SUPERSEDED
updated: 2026-07-02
---

# Handoff: M11 â€” Read Thai: schema, seed, mode toggle, unit map, lessons + drills 1â€“8, /thai/stats
Agent: implementer | Date: 2026-07-02 | Status: COMPLETE

## Review Fixes (round 2)

`.claude/plans/review-summary.md` returned RETURN-TO-IMPLEMENTER with one CRITICAL, one HIGH, two MEDIUM, and one LOW finding. All five are fixed in this working tree; the deferred MEDIUM (no `drillType` dimension on `thai_progress`) is left for M12 design per the coordinator's explicit instruction not to change the schema now.

1. **CRITICAL â€” unit 6 unlock ceiling (fixed, reviewer's minimal option (a)).**
   `seed/thai/types.ts`'s `FinalItem.drillable` field type changed from the literal `true` to the literal `false` (with a doc comment explaining why, cross-referencing the CRITICAL finding). `seed/thai/items.ts`'s 8 `FINALS` rows now set `drillable: false` accordingly. This drops unit 6's `getUnitSummaries` denominator from 38 (8 finals + 30 words) to 30 (words only) â€” every one of which is already a real drill subject in `buildSubjectPool`'s unit-6 branch (`word-final`), so 100% is now reachable and units 7â€“8 can unlock. Verified directly against the dev DB post-`seed:thai`: `unit6 total rows: 38 drillable: 30` (see Commands Run). The 8 `final:x` rows remain in the DB and still render correctly in the unit-6 lesson page (`FinalsTable`) â€” only their `drillable` flag changed, no content removed.

2. **HIGH â€” server-side answer verification (fixed).**
   `lib/thai/actions.ts::submitThaiAttempt` no longer takes an `expected` parameter. It now: (a) validates `drillType` against a known-values list, (b) looks up the item row from `thai_items` by `itemId`, (c) calls a new exported `expectedAnswerFor(item, drillType)` in `lib/thai/drill.ts` to derive the correct answer server-side, (d) computes `correct` from that derived value vs. the client's `chosen`. `expectedAnswerFor` is also now used inside `buildQuestion` (the round-building code) so there is exactly one implementation of "what's the right answer for this item+drillType," not two that could drift.
   This required dropping the vowel `form-sound` drill's random forward/reverse direction (previously chosen client-side per question and echoed back as `question.correct`): a server-side re-derivation must be a pure function of `(itemId, drillType)`, and a client-supplied "which direction was shown" flag would just move the trust problem rather than solve it. `form-sound` is now always forward (Thai form shown, IPA sound in the options) â€” noted as a scope simplification in `expectedAnswerFor`'s and `buildQuestion`'s comments. `components/thai/drill/drill-session.tsx` updated to call `submitThaiAttempt(question.itemId, question.drillType, option.value)`; it still uses the client-side `question.correct` value to render the reveal (green/red highlighting is a pure display concern), but that value no longer participates in scoring, `thai_attempts` logging, or mastery â€” the server is authoritative for all three.

3. **MEDIUM â€” TOCTOU race in `submitThaiAttempt` (fixed).**
   Confirmed independently (matching the reviewer's own finding) that `db.transaction()` throws `"No transactions support in neon-http driver"` (`node_modules/drizzle-orm/neon-http/session.cjs:176-183`), so an interactive transaction isn't available. Replaced the SELECT-then-`db.batch` pattern with a single atomic `INSERT ... ON CONFLICT (learner_id, item_id) DO UPDATE` statement (via `db.execute(sql\`...\`)`) whose `SET` expressions reference `thai_progress.streak` / `thai_progress.mastered_at` directly â€” Postgres resolves these under the row lock the upsert itself takes, so there's no separate read to race against; a concurrent submission for the same `(learnerId, itemId)` can no longer clobber another's streak/mastery update.
   `newlyMastered` (needed for the drill summary screen's "newly mastered" count) is derived from the query's own `RETURNING streak, mastered_at, last_seen` by comparing `mastered_at` to `last_seen`: both are set via the same statement-scoped `now()` call when *this* write is the one that crosses the mastery threshold, so they come back byte-identical only in that case; a `mastered_at` written by an earlier attempt won't match this write's `last_seen`. Verified this whole state machine end-to-end against the dev DB with a disposable test row (3x correct â†’ mastered; 1x wrong â†’ streak resets, `mastered_at` preserved; 1x correct after mastery â†’ streak restarts at 1, `mastered_at` stays, `newlyMastered` correctly `false` on all but the exact mastering write) â€” see Commands Run. The `thai_attempts` insert remains a separate, independent statement (append-only, no update-in-place, so it has no TOCTOU exposure to begin with); it is no longer wrapped with the progress write in `db.batch` since the upsert alone is now self-contained/atomic.
   `lib/thai/mastery.ts::applyAttempt` (the pure-JS version of this same rule) is no longer called from `submitThaiAttempt` â€” the SQL CASE expressions are now the executed logic â€” but it's left in place and exported since it documents the rule in a form that's actually unit-testable (per the review's own suggestion that this is exactly the kind of logic a test would catch mechanically), with a comment noting the SQL in `actions.ts` must be kept in sync with it if the mastery rule ever changes.

4. **MEDIUM â€” `weightedPick` comment vs. behavior (fixed: comment corrected, not behavior).**
   Confirmed the reviewer's read: `weightedPick` samples **with** replacement (nothing is removed from `entries`/`scored` between picks; only an exact back-to-back repeat of the immediately-previous subject is skipped). This is the intended behavior â€” round size is fixed at ~15 regardless of a unit's pool size (e.g. unit 2 has only 9 mid-class consonants), so with-replacement sampling is required for smaller pools to ever fill a round. Rewrote the doc comment to say "with replacement" and describe the actual repeat-avoidance rule, rather than changing the sampling algorithm.

5. **LOW â€” hardcoded Thailand offset in `lib/thai/stats.ts` (fixed).**
   `keyToUtcInstant` now imports and uses `THAILAND_OFFSET_MS` from `lib/review/time.ts` instead of the inline literal `7 * 60 * 60 * 1000`, matching that file's own stated convention ("this file is the single source of truth for that offset").

## Review Fixes (round 3)

Round-2 re-review (`.claude/plans/review-summary.md`'s "## Re-review (round 2)" section) confirmed all 5 round-2 fixes but found the CRITICAL unit-6-unlock-ceiling bug recurring in a second, independent location: 9 of the 30 unit-6 word-bank syllables (à¸›à¸¥à¸², à¸”à¸µ, à¸¡à¸·à¸­, à¸„à¸², à¸‚à¸², à¸‚à¹ˆà¸², à¸™à¸², à¸¡à¸², à¹„à¸›) have `metadata.finalSound: null` â€” they illustrate a vowel form, not a final sound â€” and were excluded by `buildSubjectPool`'s `word-final` filter (`finalSound !== null`) while still being `drillable:true` and counted in `getUnitSummaries`' unit-6 denominator. Same bug class as round 2's `FinalItem` fix, different rows. Max achievable unit-6 mastery was 70% (21/30 reachable), still below the 90% unlock threshold.

1. **CRITICAL â€” second unlock-ceiling instance (fixed).**
   `seed/thai/types.ts`'s `SyllableItem.drillable` field type changed from the literal `true` to `boolean` (matching the `FinalItem` pattern from round 2), with a doc comment. `seed/thai/items.ts`'s `WORD_BANK` array: the 9 rows named above now set `drillable: false` â€” they remain in the DB and still render in the unit-6 lesson page as vowel-form illustration examples (`FinalsTable`/lesson prose), only their `drillable` flag changed. Re-ran `npm run seed:thai`: `0 inserted, 113 upserted-as-update, 0 deleted` (all 113 rows still present, 9 of them flipped). Verified directly against the dev DB post-seed: unit 6's drillable count (denominator) is now **21** (down from 30), with **zero** unreachable/orphaned items â€” 100% is genuinely achievable. See Commands Run for the exact query and output.

2. **Prevent recurrence â€” mechanical reachability invariant (required, added).**
   This is the second time the identical bug shape shipped (round 1: 8 `FinalItem` rows; round 3: 9 `SyllableItem` rows) because "is this drillable item reachable as a drill subject" was only ever checked by manual code reading, never mechanically. Fixed by:
   - New file `lib/thai/reachability.ts` â€” a **pure** module (deliberately has zero import of `@/lib/db` or anything that constructs a DB client) exporting `computeReachableIds(unit, allItems)` and `findUnreachableDrillableIds(unit, allItems)`. This is the *one* implementation of "which items does `buildSubjectPool` actually turn into a drill subject for this unit" â€” factored out specifically so it can be shared without duplication.
   - `lib/thai/drill.ts`'s `buildSubjectPool` now calls `computeReachableIds` directly (for all three branches: units 2â€“5, unit 6, units 7â€“8) instead of re-deriving the same filter inline. There is now exactly one implementation of this filter in the codebase, not two that can drift apart (which is precisely how round 2's bug went undetected in round 1's fix).
   - `scripts/seed-thai-db.ts` imports `findUnreachableDrillableIds` (and `DRILLED_UNITS = [2,3,4,5,6,7,8]`) and runs `assertEveryDrillableItemIsReachable()` **before any DB write** (right after the existing duplicate-id guard). For each drilled unit it computes the orphaned-id list; if any unit has orphans, the script throws (naming every unit and every orphan id) and `main().catch(...)` exits non-zero, exactly as the existing duplicate-id guard already does. On success it prints a one-line confirmation with the total drillable count checked.
   - Why this file couldn't just import `lib/thai/drill.ts` directly: `drill.ts` imports `@/lib/db`, which constructs a `neon()` client from `process.env.DATABASE_URL` at module-load time. Standalone scripts run via `tsx` call `dotenv`'s `config({path:".env.local"})` as their first statement specifically so `DATABASE_URL` is set before anything reads it â€” but ES module `import` statements are hoisted above all other top-level statements regardless of source order, so importing `drill.ts` (or anything that transitively imports `@/lib/db`) into a script would construct that DB client *before* `config()` runs, crashing with "No database connection string was provided." (Confirmed this by reproducing the crash with a throwaway import before extracting `reachability.ts`.) This is the same reason `scripts/seed-db.ts`/`scripts/seed-thai-db.ts` have always built their own local `neon()`/`drizzle()` instances rather than importing `lib/db`'s shared one â€” `reachability.ts` follows that existing convention by having no DB dependency at all.
   - Verified the check actually *detects* a regression, not just that it passes trivially: a disposable script (deleted after use) cloned `ALL_THAI_ITEMS`, flipped `syllable:à¸›à¸¥à¸²` back to `drillable:true` (re-simulating the round-3 bug), and called `findUnreachableDrillableIds(6, mutated)` directly â€” it correctly returned `["syllable:à¸›à¸¥à¸²"]`. See Commands Run.

## Completed

**Schema (A1)**
- `lib/db/schema.ts`: added `thaiItems`, `thaiProgress` (unique on learnerId+itemId, indexed on learnerId), `thaiAttempts` (indexed on learnerId and learnerId+itemId), and `learnerSettings.activeMode` (text, default `'mandarin'`). Mandarin tables untouched.
- Migration `lib/db/migrations/0002_flat_liz_osborn.sql` generated via `npm run db:generate` and applied via `npm run db:migrate` against the dev Neon DB.

**Seed content + script (A2)**
- `seed/thai/types.ts`: typed shapes (`ConsonantItem`, `FinalItem`, `VowelItem`, `SyllableItem`, `LessonMarkerItem`).
- `seed/thai/items.ts`: all unit 1â€“8 content, derived verbatim from `seed/thai/research/reading-thai-script.html` â€” 9 mid-class + 11 high-class (incl. à¸ƒ, `drillable:false`) + 12+12 low-class A/B (incl. à¸…, `drillable:false`) = 44 consonants; 8 finals with letters + example word; 18 vowels-A (9 short/long pairs); 12 vowels-B (8 diphthongs + 2 hidden-vowel + 2 shape-changers); a 30-word curated real-word bank; one lesson-marker sentinel for unit 1. 113 rows total.
- `scripts/seed-thai-db.ts` + `npm run seed:thai`: idempotent refresh (delete-then-upsert by id), mirrors `scripts/refresh-seed-db.ts`'s pattern, never touches Mandarin tables. Ran successfully (see Commands Run).

**Mode toggle (A3)**
- `components/mode-toggle.tsx` (client) + `lib/thai/actions.ts::setActiveMode` (server action, session-derived learnerId, validated value, `refresh()` on write).
- `app/page.tsx` now reads `ensureLearnerSettings(learnerId).activeMode` and branches: `'thai'` â†’ `<ThaiHome>`; anything else (including missing rows, which default to `'mandarin'`) â†’ the original Mandarin flow, now with the toggle added next to the existing header (no other Mandarin markup/logic changed).

**Thai unit-map home (A4)**
- `lib/thai/queries.ts::getUnitSummaries` â€” computes all 14 units' state: units 9â€“14 always `built:false`/locked; unit 1 is lesson-only, unlocks unit 2 via a sentinel `thai_progress` row (`markUnit1LessonRead` action) instead of an item-mastery percentage; units 2â€“8 compute `masteredItems/totalItems` (drillable items only) and unlock the next unit at â‰¥90%.
- `components/thai/thai-home.tsx`, `unit-row.tsx`, `progress-ring.tsx` render the vertical map with Lesson/Drill/Repractice actions per A4.

**Lesson framework + units 1â€“8 (A5)**
- `app/thai/[unit]/lesson/page.tsx`: generic per-unit lesson shell; unit 1 renders `Unit1Lesson` (IPA primer + syllable/live-dead explanation + "mark as read" button); units 2â€“5 render `ConsonantTable`; unit 6 renders `FinalsTable`; units 7â€“8 render `VowelTable`. All read directly from `seed/thai/items.ts` (no DB round trip for lesson content â€” single source of truth shared with drills).
- Noto Sans Thai wired via `next/font/google` in `app/layout.tsx`, scoped through a new `font-thai` Tailwind utility (via `--font-thai` in `app/globals.css`'s `@theme inline`) rather than applied globally, so Mandarin typography is untouched.

**MC drills, mastery, attempts (A6)**
- `lib/thai/mastery.ts`: 3-correct-in-a-row mastery, wrong-answer streak reset, 90% unlock threshold, 15-question round size â€” pure functions, unit-testable.
- `lib/thai/drill.ts::buildDrillRound`: builds the ~15-question pool per unit (units 2â€“5: letterâ†’sound / letterâ†’class off `thai_items` for that unit; unit 6: letterâ†’final off all drillable consonants with a final sound, plus wordâ†’final off the unit-6 word bank; units 7â€“8: formâ†”sound, bidirectional, off that unit's vowel items â€” this pool naturally includes the hidden-vowel/shape-changer "special shapes" items). Sampling is weighted toward unmastered + stale-`lastSeen` items; distractors come from confusable sets (same consonant class, same final-sound group i.e. stops/nasals/glides, same vowel category) with a fallback to the wider pool. à¸ƒ/à¸… are excluded structurally â€” every pool query filters `drillable = true`, and those two letters are the only `drillable:false` rows.
- `lib/thai/actions.ts::submitThaiAttempt`: session-derived learnerId, inserts `thai_attempts` + updates `thai_progress` in one `db.batch`, returns `{correct, newlyMastered, streak}`.
- `components/thai/drill/drill-session.tsx` (client): question-by-question flow, reveals the word-bank gloss after answering, ends in a summary screen (score, newly-mastered count, unit %, unlock celebration banner when the round newly crosses 90%).
- `app/thai/[unit]/drill/page.tsx`: 404s for out-of-range/unbuilt units, shows a locked message if the unit isn't unlocked yet, otherwise builds the round server-side and hands it to the client component.

**/thai/stats (A7)**
- `lib/thai/stats.ts::getThaiStats`: items-mastered-over-time (30-day cumulative), accuracy-by-unit, drill-activity history (30-day), per-item failure heatmap (top 24 by failure rate), streak calendar (12-week grid).
- `components/thai/stats/*`: `MasteredOverTimeChart` (recharts Line), `AccuracyByUnitChart` / `DrillActivityChart` (recharts Bar, matching `components/stats/*`'s color/style conventions), `FailureHeatmap` and `StreakCalendar` (custom grid components â€” recharts has no calendar-heatmap primitive, so these follow the existing earthy-palette + rounded-card look instead).
- `app/thai/stats/page.tsx`.

**Quality gates (A8)** â€” see Commands Run.

## Left Undone
- None of A1â€“A8 â€” all implemented. Explicitly out of scope per the task prompt and left untouched: any audio, units 9â€“14 content, tone-confusion matrix.
- The word bank is smaller than the Appendix's aspirational 80â€“120 words (see Spec Deviations) â€” expanding it further with more doc-sourced or freshly-researched vocabulary is flagged as future work in the plan's own "Open items" (word-bank authoring continues through M13).
- No automated tests were added for `lib/thai/mastery.ts` / `lib/thai/drill.ts` (the repo has no existing test runner configured â€” Mandarin's review/scheduler code also ships without a test suite, so this follows the existing project convention rather than a gap I introduced).

## Commands Run

- `npm run db:generate` â€” exit 0
  ```
  14 tables
  ...
  thai_attempts 8 columns 2 indexes 2 fks
  thai_items 10 columns 0 indexes 0 fks
  thai_progress 6 columns 2 indexes 2 fks
  ...
  [âœ“] Your SQL migration file âžœ lib\db\migrations\0002_flat_liz_osborn.sql ðŸš€
  ```

- `npm run db:migrate` â€” exit 0
  ```
  Using '@neondatabase/serverless' driver for database querying
  [âœ“] migrations applied successfully!
  ```

- `npm run seed:thai` (first run, before the unit-1 lesson-marker item existed) â€” exit 0
  ```
  [delete] 0 dropped item(s).

  Done. 112 inserted, 0 upserted-as-update, 0 deleted. Total items: 112.
  ```

- `npm run seed:thai` (second run, after adding the lesson-marker sentinel item) â€” exit 0
  ```
  [delete] 0 dropped item(s).

  Done. 1 inserted, 112 upserted-as-update, 0 deleted. Total items: 113.
  ```

- `npx tsc --noEmit` â€” exit 0
  ```
  (no output â€” clean)
  ```

- `npm run lint` â€” exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint

  (no errors/warnings)
  ```

- `npm run build` â€” exit 0
  ```
  âœ“ Compiled successfully in 6.4s
    Running TypeScript ...
    Finished TypeScript in 6.2s ...
    Collecting page data using 10 workers ...
  âœ“ Generating static pages using 10 workers (6/6) in 920ms
    Finalizing page optimization ...

  Route (app)
  â”Œ Æ’ /
  â”œ â—‹ /_not-found
  â”œ Æ’ /api/auth/[...nextauth]
  â”œ Æ’ /stats
  â”œ Æ’ /thai/[unit]/drill
  â”œ Æ’ /thai/[unit]/lesson
  â”” Æ’ /thai/stats

  Æ’ Proxy (Middleware)
  ```
  (The "workspace root inferred" warning about multiple lockfiles is pre-existing/unrelated to this change â€” present before M11.)

- Manual smoke test â€” started `npm run dev`, curled `/`, `/thai/stats`, `/thai/2/lesson` â€” exit 0
  ```
  home: 307
  thai-stats: 307
  thai-lesson-2: 307
  âœ“ Ready in 872ms
  ```
  All three routes correctly redirect (307) to sign-in via `proxy.ts` for an unauthenticated request â€” confirms no route throws a 500 at request time. Full authenticated-session behavioral testing (mode toggle round-trip, drill round â†’ mastery â†’ unlock, /thai/stats charts with real data) is QA's job per the workflow and was not performed here beyond this smoke check.

### Round 2 (post-review fixes)

- `npm run seed:thai` (after setting `drillable:false` on the 8 `FinalItem` rows) â€” exit 0
  ```
  [delete] 0 dropped item(s).

  Done. 0 inserted, 113 upserted-as-update, 0 deleted. Total items: 113.
  ```
- Direct DB verification of the drillable-flag fix (disposable script, deleted after use) â€” exit 0
  ```
  finals: [{"id":"final:k","drillable":false},{"id":"final:p","drillable":false},{"id":"final:m","drillable":false},{"id":"final:n","drillable":false},{"id":"final:Å‹","drillable":false},{"id":"final:j","drillable":false},{"id":"final:w","drillable":false},{"id":"final:t","drillable":false}]
  unit6 total rows: 38 drillable: 30
  ```
  Confirms unit 6's `getUnitSummaries` denominator is now 30 (word bank only, all reachable as drill subjects), not 38 â€” the CRITICAL unlock-ceiling bug is fixed.
- `npx tsc --noEmit` (re-run after all 5 fixes) â€” exit 0
  ```
  (no output â€” clean)
  ```
- `npm run lint` (re-run after all 5 fixes) â€” exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint

  (no errors/warnings)
  ```
- `npm run build` (re-run after all 5 fixes) â€” exit 0
  ```
  âœ“ Compiled successfully in 6.1s
    Running TypeScript ...
    Finished TypeScript in 7.3s ...
    Collecting page data using 10 workers ...
  âœ“ Generating static pages using 10 workers (6/6) in 829ms
    Finalizing page optimization ...

  Route (app)
  â”Œ Æ’ /
  â”œ â—‹ /_not-found
  â”œ Æ’ /api/auth/[...nextauth]
  â”œ Æ’ /stats
  â”œ Æ’ /thai/[unit]/drill
  â”œ Æ’ /thai/[unit]/lesson
  â”” Æ’ /thai/stats

  Æ’ Proxy (Middleware)
  ```
- Atomic-upsert state-machine verification (disposable test row against a real user id + `vowel:oe-short`, deleted after use) â€” exit 0
  ```
  1st correct: { streak: 1, masteredAt: null, newlyMastered: false }
  2nd correct: { streak: 2, masteredAt: null, newlyMastered: false }
  3rd correct (expect newlyMastered=true): {
    streak: 3,
    masteredAt: '2026-07-02 14:28:12.211315+00',
    newlyMastered: true
  }
  4th WRONG (expect streak=0, masteredAt kept, newlyMastered=false): {
    streak: 0,
    masteredAt: '2026-07-02 14:28:12.211315+00',
    newlyMastered: false
  }
  5th correct (post-mastery, expect streak=1, masteredAt kept, newlyMastered=false): {
    streak: 1,
    masteredAt: '2026-07-02 14:28:12.211315+00',
    newlyMastered: false
  }
  cleaned up test progress row
  ```
  Exercises the exact SQL used in `submitThaiAttempt`: streak increments on correct, resets to 0 on wrong, `mastered_at` is set exactly once (3rd correct) and preserved thereafter, and `newlyMastered` is `true` only on the write that crosses the threshold â€” matching `lib/thai/mastery.ts::applyAttempt`'s documented rule.

### Round 3 (second unlock-ceiling instance + invariant check)

- `npx tsc --noEmit` (after adding `lib/thai/reachability.ts`, wiring it into `buildSubjectPool`, and flagging the 9 word rows `drillable:false`) â€” exit 0
  ```
  (no output â€” clean)
  ```
- `npm run lint` â€” exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint

  (no errors/warnings)
  ```
  **Note**: a later re-run of this exact command in the same session (after further verification steps) reported 4 `@typescript-eslint/no-explicit-any` errors, but all 4 are in `.claude/worktrees/french-course/.qa-tmp/*.mts` â€” scratch files for a completely unrelated feature (French course), created by a concurrent process during this session (file timestamps land inside my working window) in a separate git worktree that isn't excluded by `eslint.config.mjs`'s `globalIgnores`. None of these files were created or touched by this M11 task. Confirmed no M11 regression by scoping eslint to only the directories this milestone touches: `npx eslint app lib components seed scripts` â€” exit 0, no output. `npm run build` (which does its own TypeScript/lint-adjacent checks via Next.js, not full eslint) also stayed clean throughout, confirming this is an eslint-repo-wide-scan artifact from unrelated concurrent activity, not a regression in this codebase area.
- `npm run seed:thai` â€” exit 0
  ```
  [reachability] OK â€” every drillable item across units 2,3,4,5,6,7,8 (93 total) is reachable as a drill subject.
  [delete] 0 dropped item(s).

  Done. 0 inserted, 113 upserted-as-update, 0 deleted. Total items: 113.
  ```
  The `[reachability]` line is the new invariant check (`scripts/seed-thai-db.ts::assertEveryDrillableItemIsReachable`) â€” it runs before any DB write and would throw (naming every orphaned id) and exit non-zero if any unit had an unreachable drillable item.
- Direct DB verification post-seed (disposable script, deleted after use) â€” exit 0
  ```
  unit6 drillable count (denominator): 21
  unit6 orphans (should be empty): []
  100% achievable: true
  unit 2: drillable=9 orphans=0
  unit 3: drillable=10 orphans=0
  unit 4: drillable=12 orphans=0
  unit 5: drillable=11 orphans=0
  unit 6: drillable=21 orphans=0
  unit 7: drillable=18 orphans=0
  unit 8: drillable=12 orphans=0
  ```
  Confirms unit 6's denominator dropped from 30 (round 2) to 21 (round 3), with zero orphans in every drilled unit â€” 100% mastery is now genuinely achievable for unit 6, so units 7â€“8 can unlock.
- Invariant-check negative test â€” does the check actually catch a regression, not just print OK unconditionally? (disposable script, deleted after use) â€” exit 0
  ```
  orphans detected after re-introducing the bug: ["syllable:à¸›à¸¥à¸²"]
  PASS: invariant check correctly detects a reintroduced orphan
  ```
  Cloned `ALL_THAI_ITEMS`, flipped `syllable:à¸›à¸¥à¸²` back to `drillable:true` (re-simulating the exact round-3 bug), and called `findUnreachableDrillableIds(6, mutated)` directly â€” it correctly flagged the one orphan. This is the same function `scripts/seed-thai-db.ts` calls in `assertEveryDrillableItemIsReachable`, which would `throw` (naming the id) and cause `main().catch(...)` to `process.exit(1)` in this scenario.
- `npm run build` (final re-run after all round-3 changes) â€” exit 0
  ```
  âœ“ Compiled successfully in 7.0s
    Running TypeScript ...
    Finished TypeScript in 8.9s ...
    Collecting page data using 10 workers ...
  âœ“ Generating static pages using 10 workers (6/6) in 1317ms
    Finalizing page optimization ...

  Route (app)
  â”Œ Æ’ /
  â”œ â—‹ /_not-found
  â”œ Æ’ /api/auth/[...nextauth]
  â”œ Æ’ /stats
  â”œ Æ’ /thai/[unit]/drill
  â”œ Æ’ /thai/[unit]/lesson
  â”” Æ’ /thai/stats

  Æ’ Proxy (Middleware)
  ```

## Issues Discovered

- **`kind` enum vs. finals**: the Validation Contract's `kind` list (`consonant|vowel|tone-rule|numeral|special-sign|syllable|phrase`) has no bucket for the 8 final-sound entries (unit 6). `thai_items.kind` is a plain `text` column (not a pg enum), so I added a `"final"` kind value to cover this â€” see Spec Deviations. **Round 2 update**: the actual bug this enabled (these 8 rows counting toward unit 6's unlock denominator with no way to ever answer them) is fixed â€” see "Review Fixes (round 2)" #1. The `kind:"final"` value itself is unchanged and still fine.
- **Split of the doc's 24 low-class consonants into "Low A (12)" / "Low B (12)"**: the source document lists all 24 low-class letters as one group; the plan's Appendix names two units of 12 (with à¸… specifically in "Low B") but doesn't specify how to split them. I split by keeping the doc's own letter order and moving only à¸… out of its natural position 2 to the front of group B, so Group A = à¸„ à¸† à¸‡ à¸Š à¸‹ à¸Œ à¸ à¸‘ à¸’ à¸“ à¸— à¸˜ and Group B = à¸… à¸™ à¸ž à¸Ÿ à¸  à¸¡ à¸¢ à¸£ à¸¥ à¸§ à¸¬ à¸®. Documented in a code comment at `seed/thai/items.ts`.
- **`thai_progress` is keyed per item, not per (item, drill type)**: a consonant like à¸ gets one shared mastery streak across all drill types that touch it (letterâ†’sound and letterâ†’class in units 2â€“5, and letterâ†’final again in unit 6). This is a direct reading of the schema in A1 (`unique(learnerId, itemId)`, no drill-type column) â€” flagging it because it means unit 6's "letterâ†’final" drills reinforce/consume the *same* streak as unit 2â€“5's drills on that letter, rather than tracking final-sound mastery independently. **Round 2 note**: per the coordinator's explicit instruction, this is deferred to M12 design and the schema was not touched in this round.

## Spec Deviations

1. **Word bank size**: the Appendix describes a "hand-curated real Thai words (~80â€“120)" bank "seeded from the doc's ~40 examples, expanded." I seeded exactly the ~30 real example words that actually appear in `reading-thai-script.html`'s running text (à¸›à¸¥à¸², à¸›à¸²à¸, à¸£à¸–, à¸šà¸²à¸›, à¸¢à¸²à¸¡, à¸à¸´à¸™, à¸¢à¸²à¸‡, à¸ªà¸²à¸¢, à¸”à¸²à¸§, à¸žà¸£, à¸£à¸±à¸, à¸ à¸²à¸ž, à¸”à¸µ, à¸¡à¸·à¸­, à¸„à¸², à¸‚à¸², à¸‚à¹ˆà¸², à¸„à¸™, à¹€à¸”à¹‡à¸, à¸™à¸², à¸à¸£à¸‡, à¸—à¸£à¸²à¸¢, à¸ªà¸šà¸²à¸¢, à¸¡à¸², à¹„à¸›, à¹à¸¡à¸§, à¸™à¹‰à¸³, à¹‚à¸£à¸‡, à¹€à¸£à¸µà¸¢à¸™, à¸”à¸­à¸) and did **not** fabricate additional vocabulary to reach 80â€“120. This follows the task prompt's explicit instruction ("Do NOT invent linguistic data from memory") and the user's global "no placeholder/fake data" rule, which I judged to override the Appendix's aspirational word count. One consequence: final `t` has only one example word (à¸£à¸–) instead of "several" â€” the doc simply doesn't supply more running examples of it. The Appendix itself flags word-bank expansion as ongoing work through M13 ("Open items"), so I'm treating the ~30-word set as the correct, honest M11 baseline rather than blocking on it.
2. **`kind: "final"`**: added as an 8th value beyond the Contract's enum list, for the reason in Issues Discovered. `thai_items.kind` is unconstrained `text`, so this doesn't require a schema change, just a documented extension.
3. **Low-class A/B split**: an authoring decision not specified by either the doc or the plan â€” see Issues Discovered.
4. **Unit 1 completion tracking**: rather than adding a new column/table for "has the learner read unit 1," I added one sentinel `thai_items` row (`kind: "lesson-marker"`, `drillable: false`) and reuse the existing `thai_progress` table (`masteredAt` = "read"). This keeps the schema exactly as specified in A1 (no extra table) while still giving unit 1 a durable, per-learner completion flag.
5. **Vowel unit-8 "shape-changer" â—Œà¹‡ (mai tai khu)**: the doc places this mark in section 8 ("Special signs & irregularities"), not section 5 ("Vowels"). I included it as a unit-8 vowel item anyway because the plan's Appendix explicitly lists "shape-changers" as vowels-B content for unit 8, and this is the only shape-changing mark in the doc besides â—Œà¸± (which the doc does cover under vowels). Both marks' Thai forms and IPA/behavior are quoted verbatim from the doc.
6. **`FinalItem.drillable` now fixed at `false`** (round 2): all 8 `kind:"final"` rows are lesson-only content going forward â€” they will never be drill subjects (see Review Fixes #1). If a future milestone wants a genuine "given this final sound, pick the letters that produce it" drill (the reviewer's alternative option (b)), that's new drill-type work, not a flip of this flag.
7. **Vowel `form-sound` drill is now forward-only** (round 2): dropped the earlier random forward/reverse direction to make server-side answer verification a pure function of `(itemId, drillType)` â€” see Review Fixes #2. Minor reduction in drill variety for units 7â€“8, traded for closing the HIGH client-trust finding.
8. **9 `WORD_BANK` rows now `drillable: false`** (round 3): à¸›à¸¥à¸², à¸”à¸µ, à¸¡à¸·à¸­, à¸„à¸², à¸‚à¸², à¸‚à¹ˆà¸², à¸™à¸², à¸¡à¸², à¹„à¸› remain in the DB and lesson content as vowel-form illustration examples but are permanently excluded from unit 6's wordâ†’final drill pool and its mastery denominator, since they have no final consonant to quiz. Same shape as deviation #6, found in a second content set â€” see Review Fixes (round 3) #1.

## Procedure Compliance
- Plan consulted before coding: yes â€” read `.claude/plans/active-plan.md` in full before touching any file.
- Next.js 16 docs read before writing Next.js code: yes. Specifically read (all under `node_modules/next/dist/docs/01-app/`):
  - `01-getting-started/07-mutating-data.md` (Server Functions/Actions, `refresh()` vs `revalidatePath`/`revalidateTag` â€” confirmed the existing `lib/review/actions.ts` pattern of calling `refresh()` from `next/cache` after a mutation is still the current API, and reused it in `lib/thai/actions.ts`).
  - `01-getting-started/13-fonts.md` (`next/font/google` usage for `app/layout.tsx`'s Noto Sans Thai addition).
  - `01-getting-started/09-revalidating.md` (confirmed Cache Components/`use cache` is an opt-in feature via `cacheComponents` in `next.config.ts`; this repo doesn't enable it, so dynamic route params can be awaited directly without a `<Suspense>` boundary, matching the existing `app/page.tsx`/`app/stats/page.tsx` style).
  - `03-api-reference/03-file-conventions/dynamic-routes.md` (confirmed `params` is a `Promise` in this Next version and must be awaited â€” used in both `app/thai/[unit]/lesson/page.tsx` and `app/thai/[unit]/drill/page.tsx`).
- Tests run before finishing: cited above under Commands Run â€” `npx tsc --noEmit` (clean), `npm run lint` (clean), `npm run build` (succeeded, route table printed). No dedicated unit-test runner exists in this repo (no `test` script in `package.json`, no existing `*.test.ts` files), so "tests" here means the three quality gates named in A8 plus the manual dev-server smoke check.
- Round 2: `review-summary.md` read in full before making any fix; all 5 required findings addressed (not the deferred 6th, per explicit instruction); `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm run seed:thai` all re-run after the fixes and all pass (verbatim output under "Review Fixes (round 2)" â†’ Commands Run, round 2 subsection) â€” plus two additional disposable-script verifications against the live dev DB (unit-6 drillable-count fix, and the full mastery/streak/newlyMastered state machine for the new atomic upsert), both cleaned up after use.
- Round 3: `review-summary.md`'s "## Re-review (round 2)" section read in full before making any fix; the CRITICAL finding (recurrence of the unlock-ceiling bug) fixed, plus the required mechanical invariant check added and wired into both `buildSubjectPool` (so there's one filter implementation, not two) and `scripts/seed-thai-db.ts` (so it runs on every seed). `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm run seed:thai` all re-run after the fix and all pass, plus three additional disposable-script verifications: (1) direct DB confirmation that unit 6's denominator is 21 with zero orphans across every drilled unit, (2) a negative test proving the invariant check actually detects a reintroduced orphan rather than passing unconditionally, (3) the seed script's own `[reachability] OK` line. All verbatim output is under "Review Fixes (round 3)" â†’ Commands Run, round 3 subsection.
- Handoff written: yes (this file).

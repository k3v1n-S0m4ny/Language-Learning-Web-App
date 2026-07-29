---
name: new-pure-logic-no-colocated-test
description: implementer added a new pure/testable function (e.g. queue-selection helper) without a colocated node:test file, even though the repo has an established pattern for exactly this kind of function
metadata:
  type: feedback
---

This repo's `package.json` test script is `tsx --test lib/**/*.test.ts` — it auto-discovers any `*.test.ts` placed next to its source, no wiring required. There are existing precedents for pure-logic unit tests in exactly this style: `lib/review/hsk-gate.test.ts`, `lib/mandarin/pinyin-tone.test.ts`, `lib/thai/flashcard-mastery.test.ts`. When an implementer adds a new pure, easily-unit-testable function (no DB, no I/O) to fix a subtle bug — e.g. `lib/review/queue.ts`'s `pickFutureToday` (2026-07-17), which required 6+ hand-traced edge cases to verify by reading alone — and does not add a matching `*.test.ts`, flag it as a MEDIUM finding even if `tsc`/`lint` pass clean.

**Why:** the CLAUDE.md global rule ("Tests live next to source") plus the repo's own precedent means the omission isn't "no test culture here" (which would make it a non-issue) — it's an inconsistency with an established, cheap-to-follow pattern for exactly this kind of code. Read-path bugs like the just-rated-card exclusion are also the kind most likely to regress silently on the next unrelated refactor, since there's no execution path (manual or automated) that exercises the edge cases short of rating real cards against the production DB.

**How to apply:** whenever a diff adds a new exported pure function to `lib/**`, check `Glob` for a sibling `*.test.ts` before accepting "tsc + lint" as sufficient verification. If missing, recommend one covering the edge cases the review itself needed to reason through — that reasoning is exactly what the test should encode.

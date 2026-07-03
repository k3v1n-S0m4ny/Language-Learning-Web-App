# Handoff: Glass Redesign — Phase 1 (Study flow, Mandarin)
Agent: implementer | Date: 2026-07-04 | Status: COMPLETE

> **Update (post-review round):** Code review came back PASS-WITH-NITS
> (`.claude/plans/glass-redesign-phase1.review.md`). All flagged items are
> fixed on this branch — see "Review-Round Fixes" below, which also
> **corrects a false claim in the original text of this handoff** (the
> "Spec Deviations" bullet about the empty-`card.words` fallback was wrong:
> `tokenizePhrasePinyin` was never actually wired in; it is now).

## Completed
- `lib/mandarin/pinyin-tone.ts` (new) — `toneOf`, `stripTones`, `splitWordPinyin` (count-guided pinyin syllable segmenter: consonant initials + finals table, zero-initial y/w-glide table, apostrophe hard-breaks, backtracking to hit an exact syllable count, even-split fallback), `tokenizePhrasePinyin` (whitespace word-chunking + per-chunk split, with or without count hints).
- `lib/mandarin/pinyin-tone.test.ts` (new) — 12 tests: tone reading (incl. ü), diacritic stripping, single/multi-syllable splits (regular, zero-initial/y-w, apostrophe-boundary using the real "一百二十二" deck value), whole-phrase tokenization with and without hints.
- `lib/mandarin/tone-sandhi.ts` (new) — `computeSandhi`/`computeSandhiByWord`: 3rd-tone adjacent-pair sandhi (literal next syllable, neutral tones never skipped-over); 一/不 sandhi scoped to STANDALONE one-syllable words (via the card's own word segmentation) so compound numerals (十一, 一百二十二) are correctly left alone.
- `lib/mandarin/tone-sandhi.test.ts` (new) — 9 tests: 你好, 我喜欢喝茶 (incl. cross-word context), 早上好 (neutral-in-middle false-sandhi guard), 一 before 1-3 vs before 4, 一 standalone, 一 inside a numeral (not sandhi'd), 不 before 4 vs elsewhere, `computeSandhiByWord` per-word slicing (我 shows tone-2 in context vs tone-3 alone).
- `package.json` — added `"test": "tsx --test lib/**/*.test.ts"` (no test runner existed in the repo; used Node's native `node:test` + `tsx`, no new dependency).
- `app/globals.css` — Phase 1 additions: FSRS rating-ramp tokens (`--rate-again/-hard/-good/-easy`, AA-tuned vs `--color-on-earthy`); spoken-tone hues restructured to the file's existing light-default/dark-override convention, with BOTH themes' tone-1/2/3/4 retuned so every hue clears the full 4.5:1 small-text AA minimum (not just the 3:1 large-text floor) against the actual card surfaces — documented in an extended AA table at the top of the file. New `.rate-press` utility (glass specular flash on `:active` for solid rating buttons).
- `components/top-bar.tsx` (new) — floating glass pill (sticky, `.glass`): Kai "你好, {name}" greeting (Thai path present but unwired per scope), `ModeToggle`, `ThemeToggle`, Stats link, `SignOutButton`. Dims to 50% opacity while a session is active, restoring on hover/focus-within.
- `components/mode-toggle.tsx` — rewritten on the `SegmentedControl` glass primitive (shared file per the plan's critical-files list; Thai's home also renders this, so its mode toggle picks up the glass look too — documented as an accepted minimal spillover, Thai's OWN surfaces/unit-map/drills untouched).
- `components/sign-out-button.tsx` — added a `variant` prop (`"default"` keeps the original bordered pill for Thai's untouched header; `"ghost"` is the borderless glass-bar look used by `TopBar`).
- `components/session-header.tsx` — simplified to just the Due/New counts row (greeting + nav moved into `TopBar`).
- `components/card-front.tsx` — solid elevated face (`bg-surface`, bordered, `--glass-shadow` elevation); headword in `.font-hanzi` at display scale; "Tap to reveal" hint. No longer owns the click handler (moved to the shared flip wrapper — see below).
- `components/card-back.tsx` — tone-coloured whole-phrase pinyin (`computeSandhi` over `card.words`; see "Review-Round Fixes" for the corrected empty-`card.words` fallback), gloss + audio, leech badge as a glass chip, word-chip row, pinyin show/hide toggle (unchanged mechanic) + new tone-colour on/off toggle (default on).
- `components/word-chip.tsx` — preserves per-word tap-to-reveal gloss and per-word audio verbatim; now takes `syllables`/`toneColorOn` props (its slice of the phrase-level sandhi computation, so 我 renders tone-2 in context) and pinyin gating is unchanged (global toggle).
- `components/pinyin-syllables.tsx` (new) — shared renderer: tone-coloured spans + dotted-underline sandhi cue, `toneColorOn`-gated; used by both card-back and word-chip so the two never drift.
- `components/rating-buttons.tsx` — solid vivid fills (`--rate-*`) + glass press (`.rate-press` specular flash + `motion` spring squash, reduced-motion gated); explicit `text-on-earthy` on every button.
- `components/empty-state.tsx` — quiet glass "all caught up" card.
- `components/audio-button.tsx` — glass circle, accent-coloured icon; added a `size="sm"|"md"` variant (chip-level vs whole-phrase) — `playAudio` export and disabled-when-no-url behavior unchanged.
- `components/review-session.tsx` — real 3D spring flip via `motion` (both faces mounted, `backfaceVisibility: hidden`, `rotateY` animated with a spring transition) with a `useReducedMotion`-gated instant-swap fallback (only one face ever mounted). The reveal gesture (click/Enter/Space) lives on the flip wrapper only while unrevealed, avoiding a nested-interactive ARIA violation once the back face's own buttons are live. Both faces stay mounted through the flip so the currently-invisible one is excluded from the tab order via `inert` + `aria-hidden` (prevents keyboard users tabbing into hidden buttons). Whole-phrase audio still plays inside the same user-gesture click/keydown handler as before.
- `app/page.tsx` (Mandarin branch only) — wired `<TopBar>` + the trimmed `<SessionHeader>`; removed `bg-background` from `<main>` so the ambient mesh (Phase 0, `-z-10`) is now visible behind the translucent glass chrome, per the Phase 0 handoff's own note that this was deferred to Phase 1. Thai branch (`settings.activeMode === "thai"`) untouched.

## Review-Round Fixes
Fixing `.claude/plans/glass-redesign-phase1.review.md` (PASS-WITH-NITS), in the order it lists them:

1. **HIGH — empty-`card.words` fallback garbled multi-word pinyin, AND the original handoff's claim about it was false.** Confirmed the reviewer's repro independently before fixing: the old fallback wrapped the WHOLE phrase into one fake "word" (`{ hanzi: card.headword, pinyin: card.wholePinyin }`) and fed it to `splitWordPinyin`, whose segmenter only knows about apostrophe hard-breaks, not whitespace — for "我喜欢喝茶" / `"wǒ xǐhuan hē chá"` this produced `["wǒ ", "xǐh", "uan", " hē", " chá"]` (garbled, embedded spaces), exactly as the reviewer reported.
   - **`lib/mandarin/tone-sandhi.ts`** — added `computeSandhiFromSyllables(citationSyllables: string[])`, a new entry point that takes an ALREADY-tokenized syllable list and applies only the (word-boundary-independent) 3rd-tone rule; 一/不 are deliberately left un-sandhi'd here since this path has no word-segmentation data to safely scope them (guessing would reintroduce the exact wrong-boundary risk this fallback exists to avoid — documented inline and in the function's own tests). Refactored the shared rule logic into a private `applyRules()` so `computeSandhi` and `computeSandhiFromSyllables` never diverge. Also added `sliceSandhiByWord(flatResult, words)` — the slicing logic factored out of `computeSandhiByWord` so it can be called on an already-computed flat result (see item 3 below).
   - **`components/card-back.tsx`** — the fallback branch now actually calls `tokenizePhrasePinyin(card.wholePinyin)` (whitespace-word-chunking, confirmed against real data — see "Issues Discovered") and feeds the result through `computeSandhiFromSyllables`. Verified independently for the reviewer's exact repro: `tokenizePhrasePinyin("wǒ xǐhuan hē chá")` → `["wǒ", "xǐ", "huan", "hē", "chá"]` (correct), then sandhi'd to `[wǒ→2(sandhi), xǐ→3, huan→0, hē→1, chá→2]` — same 3rd-tone-sandhi result as the real-word-data path would give for this phrase. New regression tests added (see below) lock this in.
   - **This handoff's own false claim (former "Spec Deviations" bullet)** is corrected: `tokenizePhrasePinyin` **is now actually wired into `card-back.tsx`** as the fallback (it wasn't before, despite the earlier text saying so).
2. **LOW — `ModeToggle` lost its pending/disabled visual affordance.** Added an optional `disabled` prop to `components/ui/segmented-control.tsx` (default `false`, so `ThemeToggle` — the other consumer — is unaffected): dims the whole control to `opacity-60` and sets `disabled` on every option button while `true`. `mode-toggle.tsx` now passes `disabled={pending}`, restoring the pre-redesign busy affordance (double-click during the transition now visibly reads as busy again, matching the original component's `opacity-60`/`disabled` behavior).
3. **LOW — redundant double `computeSandhi` call.** `card-back.tsx` previously called `computeSandhi(sandhiWords)` for the phrase-level colouring AND `computeSandhiByWord(sandhiWords)` for the per-word chip slices — the latter silently recomputed `computeSandhi` from scratch on the same input. Fixed by exporting `sliceSandhiByWord(flatResult, words)` (pure slicing, no recomputation) and having `card-back.tsx` call `computeSandhi` once, then slice that same result. `computeSandhiByWord` is kept as a convenience one-shot wrapper (`sliceSandhiByWord(computeSandhi(words), words)`) for any other caller that only needs the per-word view — its existing tests are unchanged and still pass.
4. **LOW — redundant duplicate reveal control.** `review-session.tsx`'s flip wrapper previously had its own `role="button"`/`tabIndex={0}`/`onKeyDown` in addition to the sibling "Show answer" `<button>` — two consecutive keyboard tab stops performing the identical action. Removed the `role`/`tabIndex`/`aria-label`/`onKeyDown` from the wrapper, keeping only its `onClick` (a pointer-only convenience shortcut for tapping the card directly) and updated the comment to explain the "Show answer" button is now the SOLE keyboard-focusable reveal control. Mouse/touch tap-the-card behavior is unchanged.
5. **Left as directed — 一-before-neutral-tone residual risk.** Per the coordinator's instruction, this (LOW finding #4 in the review, re: 一个-type "yí ge" words where the underlying tone of a now-neutral syllable can't be recovered from citation pinyin) is left as-is, simplified-textbook-rule behavior. It was already implicitly covered by the general 一/不 doc comment in `tone-sandhi.ts`; added an explicit note there naming the 一个 case directly, matching the review's specific language, so it's documented rather than merely implied.

New/updated tests (`lib/mandarin/tone-sandhi.test.ts`, now 12 tests in that file / 24 total across both lib test files):
- `sliceSandhiByWord slices an ALREADY-COMPUTED flat result (no recomputation)` — same expected output as the existing `computeSandhiByWord` test, exercising the new lower-level entry point.
- `computeSandhiFromSyllables (the empty-card.words fallback path) correctly tokenizes a multi-word phrase via tokenizePhrasePinyin` — the direct regression test for the HIGH finding: asserts `tokenizePhrasePinyin("wǒ xǐhuan hē chá")` equals `["wǒ", "xǐ", "huan", "hē", "chá"]`, then asserts the sandhi'd result.
- `computeSandhiFromSyllables does NOT apply 一/不 sandhi (no word-boundary data to scope it safely)` — locks in the deliberate, documented scope-out for this fallback path.

## Left Undone
- Nothing required for Phase 1 scope was skipped. Two pre-existing, documented LOW items carried over from Phase 0 (segmented-control roving-tabindex, the two-lockfile Turbopack workspace-root warning) were left as-is — out of Phase 1 scope.
- Did not add a real browser/Chrome-DevTools screenshot pass (light+dark, flip animation, reduced-motion emulation) — that is explicitly a code-reviewer/qa-engineer verification step per the plan's "Verification (end-to-end)" section, not an implementer deliverable. Recommend the QA pass include: flip in both themes, reduced-motion emulation (`prefers-reduced-motion: reduce`), tone-colour toggle on/off, and a Tab-key walk through a revealed card to confirm the `inert` fix actually excludes the hidden face.

## Commands Run

### Original implementation round
- `npx tsx --test lib/mandarin/pinyin-tone.test.ts lib/mandarin/tone-sandhi.test.ts` — exit 0
  ```
  ℹ tests 21
  ℹ pass 21
  ℹ fail 0
  ```
- `npm run lint` (run 4 times across the session, after each batch of edits) — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  (no output = clean)
- `npm run build` (run 3 times: after component work, after the tone-hue AA fix, after the `inert` a11y fix) — exit 0, latest run:
  ```
  ✓ Compiled successfully in 3.5s
    Running TypeScript ...
    Finished TypeScript in 3.6s ...
  ✓ Generating static pages using 10 workers (6/6) in 473ms
    Finalizing page optimization ...
  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ```
- `npm test` (final run of the original round, before the review-round fixes) — exit 0
  ```
  ℹ tests 21
  ℹ pass 21
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 214.2124
  ```
- Dev-server smoke check: attempted `npm run dev` — a pre-existing dev server (PID 40328, not started by me) was already bound to :3000; my invocation correctly detected the conflict and exited without binding :3001 (verified via `netstat -ano`, no stray process left running). That existing server's log (`.next/dev/logs/next-development.log`) showed a transient `ReferenceError: ModeToggle is not defined` at a timestamp coinciding with an in-progress multi-file edit (mid-save HMR artifact); subsequent compiles in the same log succeeded, and the from-scratch `npm run build` afterward was clean — treated as a stale Turbopack HMR artifact, not a real defect, but flagged for the QA pass to double-check with a fresh reload.

### Review-round fixes (final re-verification — all green)
- `npm run build` — exit 0
  ```
  > language-learning-web-app@0.1.0 build
  > next build

  ▲ Next.js 16.2.6 (Turbopack)
  - Environments: .env.local

    Creating an optimized production build ...
  ✓ Compiled successfully in 3.7s
    Running TypeScript ...
    Finished TypeScript in 3.7s ...
    Collecting page data using 10 workers ...
    Generating static pages using 10 workers (0/6) ...
  ✓ Generating static pages using 10 workers (6/6) in 448ms
    Finalizing page optimization ...

  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ƒ /api/auth/[...nextauth]
  ├ ƒ /stats
  ├ ƒ /thai/[unit]/drill
  ├ ƒ /thai/[unit]/lesson
  └ ƒ /thai/stats
  ```
- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  (no output = clean)
- `npm test` — exit 0
  ```
  > language-learning-web-app@0.1.0 test
  > tsx --test lib/**/*.test.ts

  ✔ toneOf reads the tone from a single-vowel diacritic (0.8231ms)
  ✔ toneOf returns 0 (neutral) for a toneless syllable (0.1143ms)
  ✔ toneOf reads ü diacritics (folds to the u vowel family) (0.0771ms)
  ✔ stripTones removes diacritics 1:1 (ü folds to u), preserving length (0.1108ms)
  ✔ splitWordPinyin returns the input unchanged for a single-syllable word (0.6522ms)
  ✔ splitWordPinyin splits a concatenated two-syllable word (regular initial+final) (0.3719ms)
  ✔ splitWordPinyin splits a zero-initial (y/w glide) concatenation (0.1163ms)
  ✔ splitWordPinyin respects an apostrophe as a hard syllable boundary (0.1132ms)
  ✔ tokenizePhrasePinyin splits a whole-phrase string into per-word chunks, then syllables (0.2513ms)
  ✔ tokenizePhrasePinyin falls back to greedy per-chunk splitting without count hints (0.2798ms)
  ✔ 你好 — adjacent 3rd-tone pair: 你 sandhis to 2nd, 好 stays 3rd (1.1815ms)
  ✔ 我喜欢喝茶 — 我 sandhis to 2nd (before 喜's 3rd), 喜 stays 3rd (喜欢's 欢 is neutral, not 3rd) (0.3408ms)
  ✔ 早上好 — neutral tone in the middle prevents a false 3rd-tone sandhi (0.1467ms)
  ✔ 一 sandhi: yī -> yì (4th) before a 1st/2nd/3rd-tone syllable (0.093ms)
  ✔ 一 sandhi: yī -> yí (2nd) before a 4th-tone syllable (0.0937ms)
  ✔ 一 does not sandhi when standalone (no following syllable) (0.5104ms)
  ✔ 一 inside a multi-character numeral (not a standalone word) is left unchanged (0.1381ms)
  ✔ 不 sandhi: bù -> bú (2nd) before a 4th-tone syllable (0.1ms)
  ✔ 不 stays bù (unchanged) before a non-4th-tone syllable (0.3454ms)
  ✔ computeSandhiByWord slices the phrase-level computation per word (cross-word context preserved) (0.3462ms)
  ✔ 我 alone (no phrase context) does NOT sandhi — demonstrates context-dependence (0.0903ms)
  ✔ sliceSandhiByWord slices an ALREADY-COMPUTED flat result (no recomputation) (0.1207ms)
  ✔ computeSandhiFromSyllables (the empty-card.words fallback path) correctly tokenizes a multi-word phrase via tokenizePhrasePinyin (0.3597ms)
  ✔ computeSandhiFromSyllables does NOT apply 一/不 sandhi (no word-boundary data to scope it safely) (0.0679ms)
  ℹ tests 24
  ℹ suites 0
  ℹ pass 24
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 274.1882
  ```

## Issues Discovered
- **Real pinyin data shape confirmed against `seed/mandarin/deck.generated.json`**: `wholePinyin` is whitespace-delimited PER WORD (not per syllable) — multi-syllable words are concatenated with no separator except an occasional (inconsistently-applied) apostrophe (e.g. `"yībǎièrshí'èr"`). This directly shaped `pinyin-tone.ts`'s design: a real initial/final-table syllable segmenter guided by the word's own hanzi character count, rather than naive whitespace splitting.
- **GPT-generated citation pinyin sometimes already bakes in 一/不 sandhi** (e.g. the deck's own `"一点"` → `"yìdiǎn"`, `"一遍"` → `"yí biàn"`) while never baking in 3rd-tone sandhi (`"你"` is always `"nǐ"` even before another 3rd tone, confirmed by scanning the whole deck). `computeSandhi`'s 一/不 rule only fires when the citation literally still reads `yī`/`bù` — so it's a no-op (correctly) on already-adjusted data and only does real work on the still-unadjusted majority.
- **Tone-hue AA was NOT satisfied by the Phase 0 defaults or by the north-star mock's own approach.** Computed contrast ratios (WCAG relative-luminance formula, verified via a throwaway Node script, not committed): the Phase 0 single-set tone-1/3/4 hues only cleared ~3.4-4.1:1 against the light/dark card surfaces — enough for the 3:1 "large text" AA floor, but chip-level pinyin renders far smaller than the large-text threshold, so this was a real, not theoretical, AA gap. The north-star mock itself only special-cases tone-2 for light mode and leaves 1/3/4 alone; I went further and re-tuned all four hues per theme to clear the full 4.5:1 (see the extended table in `globals.css`).

## Spec Deviations
- **`computeSandhi`'s 一/不 rule is scoped to standalone one-syllable words** (per the card's own word segmentation), not applied inside multi-character numerals (十一, 一百二十二) even though those also literally start with a `一` syllable. Justification: the real deck data confirms compound numerals are segmented as ONE word entry (not word-boundary-adjacent to what follows), and applying the naive rule there would have produced wrong results (e.g. incorrectly recolouring the leading 一 in 一百 as if it were the quantifier case). This is the "defensible standard renderings, don't guess" carve-out the spec itself calls for.
- **Card-level rendering derives pinyin display from `card.words` (always present, confirmed even for non-phrase cards), not by re-parsing the literal `card.wholePinyin` string's own word-chunk boundaries at render time.** `pinyin-tone.ts`'s `tokenizePhrasePinyin` (operating on a raw string) is used as the defensive fallback if `card.words` is ever empty — the primary path is more robust because it reuses the deck's own authoritative word segmentation instead of re-deriving it. **Correction (post code-review):** the original version of this bullet claimed `tokenizePhrasePinyin` was already wired in as that fallback — it was not (the fallback silently mis-segmented instead, see "Review-Round Fixes" item 1). It is now actually imported and called from `card-back.tsx`, verified with a regression test and the reviewer's own repro case.
- **AA target for spoken-tone hues raised from the mock's implicit "3:1 large-text" to a strict 4.5:1 in both themes** (see Issues Discovered) — required all four hues retuned per theme, not just tone-2 as the mock did. Colours are the same hue family, changes are barely perceptible.
- **`--glass-shadow` reused for the solid card faces' elevation shadow** rather than adding a new dedicated `--card-shadow` token — a "genuinely new token" judgment call; visually equivalent to what the mock's separate `--shadow` token would have produced, avoids token proliferation for Phase 1.
- **`ModeToggle` and `SignOutButton` (shared, non-Thai-specific files)** were restyled as directed by the plan's critical-files list; `SignOutButton` got an opt-in `variant="ghost"` so Thai's own header keeps its original bordered look unchanged, but `ModeToggle`'s glass segmented-control look does carry over to Thai's home header (no equivalent escape hatch was worth adding for a single shared control) — flagged as a minor, accepted spillover, not a Thai surface regression.
- **`AudioButton` gained a `size` variant** (not explicitly requested) to match the mock's larger whole-phrase button vs. smaller per-word chip button — same exported `playAudio`/props otherwise, no behavior change.
- Added `"test"` script to `package.json` (none existed) using Node's native `node:test` via `tsx` — no new dependency, minimal footprint. Chose this over adding vitest/jest given only two small pure-function test files exist so far.

## Procedure Compliance
- Plan consulted before coding: yes — read `act-like-a-designer-toasty-yao.md`, `.claude/plans/glass-redesign.handoff.md`, the north-star HTML mock, and every file listed under "READ FIRST" before writing any code.
- Tests run before finishing: yes — original round `npm test` result `ℹ tests 21 / ℹ pass 21 / ℹ fail 0`; final review-round re-verification `ℹ tests 24 / ℹ pass 24 / ℹ fail 0` (see Commands Run, both rounds), plus `npm run build` and `npm run lint` both exit 0 on the final code state.
- Handoff written: yes (this file, updated in place after the review-round fixes rather than as a separate file, per the coordinator's instruction).
- Review findings addressed: yes — all 1 HIGH + 3 LOW items from `.claude/plans/glass-redesign-phase1.review.md` fixed (or, for the one item the coordinator said to leave as-is, explicitly documented) — see "Review-Round Fixes" above. Did not commit, per instruction.

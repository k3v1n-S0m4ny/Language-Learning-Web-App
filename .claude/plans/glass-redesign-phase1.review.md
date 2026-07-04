# Review Summary - Glass Redesign Phase 1 (Mandarin study flow)

## Result
PASS-WITH-NITS

## Files Reviewed
- `.claude/plans/glass-redesign-phase1.impl.md` (handoff)
- `C:\Users\User\.claude\plans\act-like-a-designer-toasty-yao.md` (design spec)
- `lib/mandarin/pinyin-tone.ts`, `lib/mandarin/pinyin-tone.test.ts`
- `lib/mandarin/tone-sandhi.ts`, `lib/mandarin/tone-sandhi.test.ts`
- `app/globals.css` (diff only), `app/page.tsx`
- `components/top-bar.tsx` (new), `components/mode-toggle.tsx`
- `components/sign-out-button.tsx`, `components/session-header.tsx`
- `components/card-front.tsx`, `components/card-back.tsx`, `components/word-chip.tsx`
- `components/pinyin-syllables.tsx` (new)
- `components/rating-buttons.tsx`, `components/review-session.tsx`
- `components/audio-button.tsx`, `components/empty-state.tsx`
- `components/ui/segmented-control.tsx` (read for context, unmodified in this diff)
- `package.json`

## Findings

### CRITICAL
None.

### HIGH
- **`components/card-back.tsx:36-39` + implementation handoff line 77 — false claim about the empty-`card.words` fallback, and the real fallback silently garbles multi-word pinyin.**
  The handoff states: *"`tokenizePhrasePinyin`... is used as a defensive fallback if `card.words` is ever empty."* This is not true — `tokenizePhrasePinyin` is defined and unit-tested in `pinyin-tone.ts` but is **never imported by any component** (confirmed via `grep -rn "tokenizePhrasePinyin"` — only the lib file and its own test reference it).
  The actual fallback in `card-back.tsx` is:
  ```ts
  const sandhiWords: SandhiWord[] =
    card.words.length > 0 ? card.words : [{ hanzi: card.headword, pinyin: card.wholePinyin }];
  ```
  This treats the **entire multi-word phrase** as a single "word" and feeds it through `splitWordPinyin(pinyin, hanziLength(headword))`, whose segmenter has no concept of whitespace (only apostrophes are treated as hard breaks). Reproduced independently:
  ```
  input:  headword "我喜欢喝茶", wholePinyin "wǒ xǐhuan hē chá"
  actual fallback output: ["wǒ ", "xǐh", "uan", " hē", " chá"]   (wrong boundaries, embedded spaces)
  tokenizePhrasePinyin(wholePinyin) (what the handoff claims is used): ["wǒ", "xǐ", "huan", "hē", "chá"]  (correct)
  ```
  Residual risk is low today only because `card.words` is confirmed always populated in the real seed data (per the implementer's own note) — but the code path is real, reachable if that invariant ever breaks (bad seed data, a future card source, a bug elsewhere), and would render garbled pinyin with literal embedded space characters instead of gracefully degrading. Separately from the bug, the handoff's description of its own fallback is simply inaccurate — the kind of claim-vs-code mismatch this review process exists to catch.
  **Fix direction:** either call `tokenizePhrasePinyin(card.wholePinyin)` (with per-word hanzi-length hints derived from `card.headword`/word count where available) in the fallback branch, or drop the fallback's pretense of correctness and render plain uncoloured `card.wholePinyin` text when `card.words` is empty.

### MEDIUM
None beyond the above (downgraded candidate items below to LOW given confirmed test coverage and design-spec carve-outs).

### LOW
- **`components/card-back.tsx:40-41`** — `computeSandhi(sandhiWords)` and `computeSandhiByWord(sandhiWords)` are both called; `computeSandhiByWord` internally recomputes `computeSandhi` from scratch. Redundant work on every render (cheap for these array sizes, but avoidable — `computeSandhiByWord` could accept a precomputed flat result, or `card-back.tsx` could slice `phraseSyllables` itself using the same per-word hanzi-length accumulation it already needs).
- **`components/mode-toggle.tsx`** — the pre-redesign toggle visually disabled itself (`disabled={pending}`, `opacity-60`) while the `setActiveMode` transition was in flight. The new `SegmentedControl`-based version has no disabled/pending visual state (double-submits are still logically guarded in `choose()` via `if (mode === activeMode || pending) return;`, so no functional regression) — but a user who double-clicks during the transition gets no visual feedback that the first click registered. Minor UX regression versus the pre-redesign component, inherited from the shared Phase-0 primitive not exposing a `disabled` prop.
- **`components/review-session.tsx:82-146`** — while unrevealed, there are two separate, redundant focusable controls that both call `reveal()`: the whole-card `role="button"` wrapper (`tabIndex=0`) and the sibling "Show answer" `<button>`. Not a correctness bug (matches the design's "tap card OR press button" intent) but keyboard users get two consecutive tab stops performing the identical action.
- **`lib/mandarin/tone-sandhi.ts:86-96`** — the 一/不 sandhi rule branches only on whether `next.citationTone === 4`; when `next` is a **neutral-tone** syllable (`citationTone === 0`) whose *underlying* tone (before its own neutralization) was historically 4th (the classic textbook case: 一个 "yí ge", since 个 is underlyingly 4th tone), the code cannot recover that information from citation pinyin alone and defaults 一 to yì (4th) — the simplified/naive textbook rule, not the historically-correct yí. This is a genuine instance of exactly the "prosody-dependent, don't guess" ambiguity class the design spec calls out, but it is not the specific case the implementer's "Issues Discovered" / "Spec Deviations" notes mention (those cover multi-character numerals and cross-word 3rd-tone sandhi only) — worth documenting explicitly as a known limitation rather than leaving implicit, since 一个-type words are common vocabulary. No seed-deck example currently exercises this exact shape (checked), so it is a residual-risk item, not a live regression.

## Assertions Checked
1. **Learning mechanics preserved** — PASS. Verified in diff + component read: `word-chip.tsx` keeps per-word tap-to-reveal gloss (`setGlossShown(true)`, one-way reveal, same as pre-redesign) and per-word `AudioButton` (now `size="sm"`, same `playAudio`/disabled-when-no-url contract). Global pinyin show/hide toggle intact in `card-back.tsx` (`onTogglePinyin`, same boolean-driven conditional render). FSRS Again/Hard/Good/Easy ratings intact in `rating-buttons.tsx` (same four `RatingValue`s, same `onRate`/`hints` contract, `disabled={pending}` guard preserved). Whole-phrase audio still plays on reveal — `reveal()` in `review-session.tsx` calls `playAudio(card.wholeAudioUrl)` synchronously inside both the card-tap and "Show answer"-button gesture handlers.
2. **Sandhi engine correctness** — PASS for the tested/real-data cases, with the two residual-risk notes above (LOW: 一-before-neutral defaults to the simplified rule; HIGH: the empty-`card.words` fallback path is broken/mislabeled). Independently re-derived and confirmed correct: 你好 (nǐ→2nd before hǎo's 3rd); 我喜欢喝茶 (我→2nd before 喜's 3rd, 喜 stays 3rd because 欢/huan is neutral not 3rd — literal-next-syllable rule correctly does not skip over the neutral); 早上好 (neutral 上 correctly blocks a false zǎo→2nd sandhi); 一 before 1st/2nd/3rd → 4th, before 4th → 2nd (matches standard rule); 一 standalone unchanged; 一 inside 十一 (multi-char numeral, single word entry) correctly NOT sandhi'd; 不 before 4th → 2nd, otherwise unchanged. Citation spelling is preserved verbatim in every case (only `tone`/`sandhi` metadata is derived; `pinyin` field is untouched) — confirmed by reading `PinyinSyllables` (renders `syllable.pinyin` unchanged, only `color`/underline vary) and every test's `assert.deepEqual` including the literal citation string. Chips carry phrase-context sandhi — confirmed `computeSandhiByWord` slices the phrase-level array (我 renders tone-2 in "我喜欢喝茶" context vs tone-3 standalone), consumed correctly in `card-back.tsx` (`byWord[i]` aligned 1:1 with `card.words[i]` since both are indexed off the same array).
3. **No DB/schema/migration changes** — PASS. `git status`/`git diff --stat` shows zero touches to `lib/db/`, drizzle config, migrations, or seed scripts. `lib/mandarin/*.ts` imports nothing from a DB layer (only intra-module imports). Tone/sandhi data is derived at render time from `card.words`/`card.wholePinyin`, which are unchanged fields.
4. **3D flip reduced-motion fallback + no focus trap** — PASS. `useReducedMotion()` gates an entirely different render branch (only one face ever mounted, no 3D transform) versus the full spring-flip branch (`review-session.tsx:100-135`). In the animated branch, both faces stay mounted (required for the 3D rotation) but the currently-hidden face is excluded via `inert={...}` + `aria-hidden={...}` — confirmed `inert` is a supported boolean JSX prop in the installed `@types/react` (React 19.2.4) and the project's own `npm run build` TypeScript pass is clean, so this compiles and type-checks correctly. The reveal gesture (click/Enter/Space) is scoped to the wrapper only while `!revealed`, avoiding a nested-interactive violation once the back face's real `<button>`s become part of the tab order.
5. **Contrast (AA), explicit button text colors** — PASS. Independently recomputed every claimed ratio in `app/globals.css`'s Phase 1 AA table using the standard WCAG relative-luminance formula (script run separately from the implementer's, not trusting their numbers) — all values matched exactly: rate-again 4.57, rate-hard 6.03, rate-good 5.13, rate-easy 8.20 (all `on-earthy` #1A1A1A); tone hues light 4.54/4.65/4.54/4.54, dark 4.56/5.59/4.52/4.56 — all ≥4.5:1 as claimed. Also independently checked the "Show answer" gradient button (`--accent`→`--accent-3`, jade→gold) against its `text-on-earthy` label: 6.82:1 and 9.24:1, both comfortably passing (this button/gradient pairing wasn't in the implementer's own table, so this is new verification, not a re-check). Every `<button>` reviewed (`rating-buttons.tsx`, `word-chip.tsx`, `card-back.tsx` toggles, `audio-button.tsx`, `top-bar.tsx`'s `SignOutButton`/`Stats` link) sets an explicit text/color class — no bare/UA-default text color found.
6. **Scope discipline (Thai/stats/celebrations unchanged)** — PASS. `git status --porcelain` filtered for thai/stats/celebration/db/migrate/drizzle/seed returned nothing. `components/thai/thai-home.tsx` still renders its own `<main bg-background>` and its own default-variant `SignOutButton` (no `variant` prop passed), unaffected by the Mandarin-side TopBar work. The one acknowledged, documented spillover — `ModeToggle`'s glass look also appearing on Thai's home header, since it's a shared file on the plan's own critical-files list — matches the implementer's disclosed deviation and is a cosmetic-only exception, not a functional Thai regression.
7. **General bug/perf/style pass** — see LOW findings above (double sandhi computation, ModeToggle pending-state visual regression, redundant reveal tab-stop) and the HIGH finding (broken/mislabeled fallback path).

## Commands Run
All re-run independently by the reviewer, not copy-pasted from the implementer.

- `npm test` — exit 0
  ```
  ℹ tests 21
  ℹ suites 0
  ℹ pass 21
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 161.3364
  ```
  Matches the handoff's claimed "21 passed" exactly.

- `npm run lint` — exit 0
  ```
  > language-learning-web-app@0.1.0 lint
  > eslint
  ```
  (no warnings/errors emitted). Matches handoff.

- `npm run build` — exit 0
  ```
  ▲ Next.js 16.2.6 (Turbopack)
  ✓ Compiled successfully in 3.1s
    Running TypeScript ...
    Finished TypeScript in 3.3s ...
  ✓ Generating static pages using 10 workers (6/6) in 411ms
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
  Matches handoff. Pre-existing two-lockfile Turbopack workspace-root warning also reproduced (not a Phase 1 regression, previously documented).

- Independent WCAG contrast re-derivation (Node script, standard relative-luminance formula, not the implementer's script) — all Phase 1 table values matched exactly (see Assertion 5).

- `grep -rn "tokenizePhrasePinyin"` across the repo — confirmed it is defined + tested but never imported by any component, contradicting the handoff's claim it's used as the empty-`card.words` fallback (see HIGH finding).

- Reproduced the actual (broken) fallback output and the correct `tokenizePhrasePinyin` output side-by-side for a real deck-shaped phrase ("我喜欢喝茶") via a scratch script importing the real `lib/mandarin/*.ts` modules — see HIGH finding for both outputs.

No disagreement found between my re-run results and the implementer's claimed results for build/lint/test. The disagreement is specifically in the **handoff's prose description** of the fallback mechanism (Spec Deviations, line 77), not in the pasted command output.

## Residual Risk
- The empty-`card.words` fallback bug (HIGH finding) is currently unreachable in production given the seed data's confirmed invariant (every non-phrase card has exactly one word entry), but is untested and will silently render garbled pinyin (including literal embedded space characters) if that invariant is ever violated by future seed/data changes.
- The 一-before-neutral-tone sandhi simplification (LOW finding) is an inherent data-model limitation (citation pinyin loses the pre-neutralization tone), not something Phase 1 can fully resolve without a richer data source — flagging for awareness rather than as a blocking defect.
- No end-to-end browser/Chrome DevTools pass (light+dark screenshots, Lighthouse, actual reduced-motion emulation, mobile viewport, real focus-order Tab walk) was performed by this review — this was explicitly out of scope for the implementer per the plan and is called out in the plan's "Verification (end-to-end)" section as a qa-engineer/browser-based step, not a static code review step. Recommend the qa-engineer stage specifically drive a Tab-key walk through a revealed card to confirm the `inert` exclusion behaves as expected in a real browser (spec-compliant per HTML `inert` semantics, but browser support/edge cases are worth a live check), and toggle `prefers-reduced-motion` live rather than relying on static code inspection.

## Procedure Compliance
- Plan consulted before review: yes
- Implementation summary read: yes
- Review summary written: yes

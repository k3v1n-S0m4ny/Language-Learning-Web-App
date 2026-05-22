# Inspection Report — Review/Study Loop (ast-code-inspection)

Date: 2026-05-22 · Mode: **Self-review** (Claude as the inspection team; weaker than a team review by design — checklist run aggressively to compensate). Method: Myers Ch. 3, 7-category checklist.

Scope: `lib/review/{queries,actions,scheduler,types}.ts`, `app/page.tsx`, `components/review-session.tsx`, `components/{rating-buttons,card-back,audio-button}.tsx`, `auth.ts`, `proxy.ts`, `lib/db/{index,schema}.ts`. Not individually inspected (presentational): `card-front.tsx`, `empty-state.tsx`, `word-chip.tsx`, `session-header.tsx`, `sign-out-button.tsx`.

> Per the method, this pass **finds** defects; it does not fix them. Severity: `bug` (will misbehave) · `risk` (bug under some inputs / by-design hazard) · `style` (no defect, maintainability).

---

## Interface

**[bug] [Interface §9, Other §4] actions.ts:79 — `setNewCardsPerDay` is an unauthenticated server action with a caller-supplied `learnerId`**
- What was found: Every export in `actions.ts` is a server action (`"use server"` at top of file). `submitReview` checks `auth()` and derives `learnerId` from the session; `setNewCardsPerDay(learnerId, value)` does **neither** — no auth check, and the target learner is a parameter.
- Why it is suspect: The file's own comment notes server actions are reachable by direct POST. As written, an unauthenticated request can set any learner's `new_cards_per_day` to any value. "Not yet surfaced in UI" does not remove the endpoint — it is live in production.
- Suggested fix: Add `const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized");` and write to `session.user.id`, not a parameter. Validate `value` is a non-negative integer within a sane bound.

## Other / Robustness

**[risk] [Other §4] actions.ts:19 — `submitReview` does not validate `rating` is 1–4**
- What was found: `rating` flows straight into `RATING_BY_VALUE[rating]` in `scheduler.applyRating`. The type says `RatingValue`, but a direct POST is untyped at runtime.
- Why it is suspect: An out-of-range value yields `RATING_BY_VALUE[x] === undefined`, passed to `scheduler.next(card, now, undefined)` — an unhandled throw or undefined scheduling behavior, on a production write path.
- Suggested fix: Guard at the top: `if (![1,2,3,4].includes(rating)) throw new Error("Invalid rating");`.

## Computation / Control Flow

**[risk] [Computation §8, by-design] queries.ts:21 — new-card daily cap resets at UTC midnight ≈ 07:00 Thailand, not local midnight**
- What was found: `startOfUtcDay` defines "today" by UTC. `fetchRawCounts` counts `reviewStates.createdAt >= dayStart` against it.
- Why it is suspect: For learners in Thailand (UTC+7), the new-card cap resets at ~07:00 local. A late-evening session and the next early-morning session count as the *same* day; the cap "refreshes" mid-morning. Documented as intended (active-plan A9), but it is a real usability quirk worth a conscious decision.
- Suggested fix: If local-midnight reset is wanted, compute the day boundary in a fixed `Asia/Bangkok` offset rather than UTC. Otherwise leave, and keep the A9 note.

## Input / Output

**[risk] [I-O §8] audio-button.tsx:14 — `play()` promise rejection is swallowed**
- What was found: `void new Audio(url).play();` discards the returned promise.
- Why it is suspect: A missing/!ok Blob URL or decode failure rejects silently — the learner taps 🔊 and nothing happens, with no signal. Audio is core to the product.
- Suggested fix: `.play().catch(() => { /* surface a subtle error state */ })`, or at minimum log. Optional: reuse one `Audio` element to avoid overlapping playback on rapid taps.

## Data Reference

**[risk] [Data Ref §6] scheduler.ts:26 — `hydrateFsrsCard` casts `stored as Card` without shape validation**
- What was found: The jsonb `fsrs_card` is trusted to match the ts-fsrs `Card` shape; only `due`/`last_review` are coerced to `Date`.
- Why it is suspect: If a stored card predates a ts-fsrs field change (or is hand-edited), downstream scheduling reads undefined fields. Low risk for fully controlled data, but there is no guard.
- Suggested fix: Acceptable as-is given controlled writes; if ts-fsrs is ever upgraded, add a version check or zod parse here.

## Style / Clarity

**[style] queries.ts:100 — `getSessionCounts` is now dead code.** `page.tsx` calls `getStudyScreenData`; nothing else imports `getSessionCounts`. Leftover from the pre-optimization path. Remove, or keep intentionally and note why.

**[style] review-session.tsx + rating-buttons.tsx — `disabled={pending}` is unreachable.** `ReviewSession` early-returns the spinner when `pending`, so `RatingButtons` never renders with `pending === true`. Harmless redundancy; keep as defense-in-depth or drop the prop.

**[style] actions.ts:28 vs queries.ts:198 — fsrs state is read twice per rating** (once for hints in `getStudyScreenData`, again in `submitReview`). This is *correct* (submit re-reads the freshest row → no lost update), but worth a one-line comment so it is not "optimized" away.

---

## Error-prone sections (Myers Principle 9 — errors cluster)

1. **`actions.ts`** — 2 findings including the only `bug` (the unauthenticated action) and the input-validation `risk`. The server-action trust boundary is the weak spot; prioritize during execution-based testing (try direct POSTs with bad/missing auth and out-of-range ratings).
2. **`queries.ts`** — the timezone semantics and dead code. Logic is otherwise sound; the parallelized counts/selection were re-derived and match the original behavior.

## Re-inspection recommendation

One genuine bug + three risks warrant a follow-up review **after fixes**, focused on `actions.ts`. This human-inspection pass does not replace execution-based testing — add tests that POST to the server actions directly (bad auth, bad rating) and a test that the new-card cap counts correctly across the day boundary.

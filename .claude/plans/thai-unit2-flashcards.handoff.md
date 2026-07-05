---
feature: thai-unit2-flashcards
created: 2026-07-05T06:49:04.888235+00:00
source-session: a2fef87a-6b7e-4923-918c-1dd6389bb4bf
context-at-handoff: 307k (red)
---

# Handoff: Read-Thai Unit 2 flashcard pilot (+ ป audio fix)

## Goal
Convert Read-Thai **unit 2 only** from a multiple-choice drill to a self-graded flashcard "clear-the-deck" loop (owner-approved pilot; units 3–14 unchanged). Model: all 9 mid consonants revealed, shuffled, no "due"; front = glyph, flip → sound + name + gloss + audio; "Knew it" masters immediately, "Missed it" → back of queue; clear the deck once → unit 2 100% → unit 3 unlocks. Self-graded (server trusts the per-card report). Grandfather legacy `letter-sound` mastery so existing learners aren't re-locked. Feature is **built + code-review PASS**; the only open thread is regenerating ป's bad audio clip, which is blocked on a rotated Vercel Blob token.

Working in git worktree at cwd `C:\Users\User\Software Projects\Language-Learning-App\.claude\worktrees\thai-unit2-flashcards`, branch `worktree-thai-unit2-flashcards` (off origin/main). **Nothing committed, pushed, merged, or deployed.**

## Completed (this session) — all VERIFIED (tsc + tests + lint + review)
- New `letter-read` drill type; unit 2 requires only it. `lib\thai\types.ts`, `lib\thai\reachability.ts` (split unit 2 out of the 2–5 branch; canDrillTypeScore; grandfather helper `isRequiredTypeMastered`).
- `lib\thai\flashcards.ts` (new) — `buildFlashcardDeck(learnerId, 2)`.
- `lib\thai\actions.ts` — `submitFlashcardGrade(itemId, knewIt)` (validates unit-2 consonant, re-checks unlock gate, immediate-mastery upsert, logs attempt). `letter-read` excluded from `KNOWN_DRILL_TYPES` so it can't route through `submitThaiAttempt`.
- `components\thai\drill\flashcard-session.tsx` (new) — flip-card queue UI + `if (!current)` completion guard.
- `app\thai\[unit]\drill\page.tsx` — branches unit 2 → `FlashcardSession`.
- Grandfather routed through ALL 3 mastery sites (unitMasteryStats, buildDrillRound sampling in `lib\thai\drill.ts`, submitThaiAttempt badge in actions.ts).
- Tests: `lib\thai\flashcard-mastery.test.ts` (7 tests).
- Review fixes applied for CRITICAL (completion crash) + MEDIUM (grandfather single-site). Review verdict PASS — see `.claude\plans\review-summary.md`.
- ป audio fix STAGED (not run): `spokenName: "ปอ ปลา"` added to consonant:ป in `seed\thai\items.ts`; `metadata.spokenName?` added to ConsonantItem in `seed\thai\types.ts`; `scripts\generate-thai-audio.ts` buildManifest now uses `metadata.spokenName ?? metadata.name` for consonants. Dry-run confirms manifest emits ป → "ปอ ปลา".

## Remaining tasks (most important first)
1. Regenerate ป's audio clip (blocked on Blob token — see Next steps).
2. Decide commit/merge of the flashcard branch (owner has NOT authorized commit yet — ask first).
3. (Deferred, owner said "later") give the other 8 mid consonants a `spokenName` if the whole set should say full letter names.

## Next steps (start here)
1. **Ask the owner if he refreshed `BLOB_READ_WRITE_TOKEN`** in the MAIN checkout's `.env.local` (`C:\Users\User\Software Projects\Language-Learning-App\.env.local`). The prod Blob token was rotated server-side (rejected with "Access denied"). Reads (DATABASE_URL) work; only Blob list/put fail.
2. Once refreshed: re-copy env into the worktree — `cp ../../../.env.local .env.local` — then re-run the paid batch (owner already gave EXPLICIT prod approval this session; re-confirm since it's a new session): `npx tsx scripts/generate-thai-audio.ts` with `dangerouslyDisableSandbox: true` (needs network + prod). It regenerates ONLY ป (~$0.0002), uploads to prod Blob, writes ป's new `audioUrl` to prod DB.
3. Verify ป's new `audioUrl` differs from the old (rollback) blob `…/audio/thai/7351f00e8ae8e3b00e5b2a27ed1102cd.mp3`. A throwaway query script must wrap DB calls in `async function main(){…}` (tsx here is CJS — top-level await fails); put temp scripts in `scripts\_*-tmp.ts` and `rm` after.
4. Report; then ask the owner about committing the branch.

## Key decisions + rationale
- **New `letter-read` type + grandfather** (not reuse letter-sound, not a DB backfill) — clean semantics; grandfather (legacy letter-sound satisfies letter-read, one-directional, single helper `isRequiredTypeMastered`) prevents re-locking existing learners with zero migration.
- **Unit 2 only** (owner) — pilot; units 3–5 keep MCQ. Roll out later if it feels good.
- **Clear-the-deck-once = 100% = unlock** (owner) — one "knew it" masters a card immediately (NOT the 3-streak MCQ rule).
- **Self-graded** (owner) — server trusts the per-card report; still gated (must be a unit-2 consonant + unit unlocked), and unit 3 only unlocks at 9/9, so it can't be abused.
- **ป audio: decouple `spokenName` from displayed `name`** — clip says "ปอ ปลา" but card still shows "ป ปลา", so ป stays visually consistent with the other 8 ("ก ไก่" style). Blob path hash = (provider|model|voice|lang|**text**), so changing text → new blob; same voice `th-TH-Chirp3-HD-Achernar` kept for consistency.

## Dead ends — do not retry
- Regenerating ป with SAME voice+text is a NO-OP: the pipeline reuses existing blobs by hash. Must change text (done via spokenName) or force-delete the blob.
- tsx `.ts` here compiles as CJS → **top-level await fails** ("not supported with cjs output"). Wrap in `async function main(){…}; main().catch(...)`.
- Blob token in `.env.local` (mtime Jul 3) is UNCHANGED from the last working run → it was rotated on Vercel's side, not a local edit. Don't debug the file value; pull a fresh token.

## Verification evidence
- `npm test` → 37 pass, 0 fail (incl. 7 new flashcard-mastery tests).
- `npx tsc --noEmit` → clean (exit 0).
- `npx eslint <8 changed files>` → clean (exit 0).
- `npx tsx scripts/generate-thai-audio.ts --dry` → "[manifest] 204 clips … est cost $0.0220"; manifest has ป → "ปอ ปลา".
- Real batch → **failed safely** at pre-flight `list()` with `BlobAccessError: Access denied` (no TTS call, no charge, no DB write). Prod is UNCHANGED.
- code-reviewer (agent a1e4315478276cbbf) → PASS after fixes.

## Read before starting
- `C:\Users\User\Software Projects\Language-Learning-App\.claude\worktrees\thai-unit2-flashcards\.claude\plans\implementation-summary.md`
- `C:\Users\User\Software Projects\Language-Learning-App\.claude\worktrees\thai-unit2-flashcards\.claude\plans\review-summary.md`
- `C:\Users\User\Software Projects\Language-Learning-App\.claude\worktrees\thai-unit2-flashcards\lib\thai\reachability.ts` (isRequiredTypeMastered, reachableDrillTypesForUnit unit-2 branch, unitMasteryStats)
- `C:\Users\User\Software Projects\Language-Learning-App\.claude\worktrees\thai-unit2-flashcards\scripts\generate-thai-audio.ts`

Memory already written: `read-thai-unit2-flashcard-pilot.md` (indexed in MEMORY.md).

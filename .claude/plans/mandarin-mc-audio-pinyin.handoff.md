---
feature: mandarin-mc-audio-pinyin
created: 2026-07-30T03:31:49.217051+00:00
source-session: d864259d-606c-4d1e-aea6-3517a437fa52
context-at-handoff: 252137 (red)
---

# Handoff: Mandarin MC autoplay + pinyin toggle

## Goal

Mandarin's step-1 multiple-choice card should PLAY the pronunciation on arrival, so
step 1 trains listening and not just reading, with a toggleable pinyin line beside
it. Built, merged and deployed — but **the owner reports the autoplay produces no
sound in the real app.** That bug is the whole remaining task.

Repo: `C:\Users\User\Software Projects\Language-Learning-App`, branch **`main`**
(clean, pushed). Prod: `https://thepolyglot.vercel.app`.

## Completed (this session)

All VERIFIED unless marked.

- **`b38f157` — the feature.** `components/review-session.tsx` (MC prompt gains
  pinyin line + 🔊 replay + two pills, and the autoplay effect),
  `components/toggle-pill.tsx` (new), `components/card-back.tsx`,
  `lib/ux/prefs.ts` (rebuilt on one `pref()` factory; 2 settings → 5),
  `lib/mandarin/tone-sandhi.ts` (+`spokenSyllablesForPhrase`), and its test file.
- **`e3d99c1` — round-tail lockup fix**, both courses:
  `components/review-session.tsx` + `components/advanced-thai/advanced-review-session.tsx`.
  Reset-on-arrival (compare incoming card object vs last served, clear state during
  render) replaces relying on a remount that never happens when the same `card.id`
  comes back. **Not yet exercised by a human** — needs a real round.
- Earlier in the session: the FSRS→ladder redesign shipped to prod (migrations
  `0009`+`0010` applied, `main` deployed). Rollback branch still alive:
  Neon `pre-ladder-fsrs-backup` = `br-shy-dew-appfcklu`.

## Remaining tasks

1. **Fix the autoplay silence** (below).
2. Confirm the round-tail fix by playing a round to its last card.
3. Deferred, optional: `Left N` counting EXPOSURES rather than cards.
4. Delete `pre-ladder-fsrs-backup` once the ladder is trusted in prod.

## Next steps (start here)

**Do not start editing. Ask the owner these three questions first — they discriminate
between the remaining hypotheses in one round trip:**

1. Does the 🔊 **replay button** next to the hanzi play sound when tapped? (Yes ⇒ the
   asset and URL are fine, it is purely an autoplay-permission problem. No ⇒ the URL
   or Blob access is the problem, a different bug.)
2. Is it silent on **every** card, or only the **first** card after loading the page?
   (First-only ⇒ browser user-activation, and the rest works.)
3. Which **device/browser** — desktop Chrome, or iOS Safari / Android? (iOS Safari
   refuses `new Audio().play()` without a gesture far more aggressively.)

Also worth having them open the browser console and look for
`Audio playback failed` — `lib/ux/audio.ts:15` logs exactly that string with the URL
and the error, so a `NotAllowedError` there confirms the policy diagnosis outright.

Then read `components/review-session.tsx:75-142` (pref → ref → effect) and
`lib/ux/audio.ts`.

## Key decisions + rationale

- **Autoplay is gated to `recognise-mc` and never fires on a produce step** — there
  the options ARE the Chinese, so speaking it would read the answer aloud. Same rule
  the flip card follows by only playing on reveal. Keep this when fixing.
- **The guard records WHICH serve it played for** (`autoplayedFor` holds the card
  object, `review-session.tsx:81`), not a boolean. A new arrival is a new object, so
  it self-resets and nothing is ever written to a ref during render.
- **The effect depends on `served` (the arriving object), not `card.id`** — a
  re-served card has an identical id and audio url, so keying on those would make the
  tail-of-round repeat the one case that never autoplays.
- **Pinyin + tone colour are remembered device-local prefs**, not per-card state: the
  component is keyed by `card.id`, so `useState` there was wiped every question.

## Dead ends — do not retry

- **A null `wholeAudioUrl` is NOT the cause.** Measured against prod
  (`br-old-cell-apciruzj`): `SELECT count(*), count(whole_audio_url) FROM cards` →
  **515 / 515, 0 missing**. `lib/review/queries.ts:203` puts it on the payload. Do not
  re-investigate missing audio data.
- **Resetting the autoplay ref during render fails lint** —
  `react-hooks/refs: Cannot access refs during render`. That is why the guard holds an
  object instead of a boolean. Do not reintroduce a render-phase ref write.
- **`npm run db:migrate` and (sometimes) `git push` are blocked by the permission
  classifier.** Migrations went through `mcp__Neon__run_sql_transaction` on owner
  instruction; when push is blocked, ask the owner to run `! git push origin main`.
- **The drizzle ledger hash is LF-normalised**, not the CRLF bytes on this Windows
  disk — `tr -d '\r' < file.sql | sha256sum`. Only matters if writing ledger rows by
  hand again.

## Leading hypothesis (start here mentally, but confirm with Q1–Q3)

Browser **autoplay policy**. `playAudio` (`lib/ux/audio.ts:12`) does
`new Audio(url).play()` from inside a `useEffect`, which is not a user gesture.
Chrome allows this only once the document has sticky activation (any prior click);
iOS Safari is stricter still. Consequence: the FIRST card after a page load is
silent, and `play()` rejects with `NotAllowedError` — which `playAudio` catches and
only `console.error`s, so the UI shows nothing at all. That matches "the autoplay
doesn't play the sound" exactly.

Candidate fixes, cheapest first:
1. **Unlock one reusable `HTMLAudioElement` on the first user gesture** (the standard
   web-audio unlock): create it once, play a silent/zero-length source inside a real
   click, then reuse that element for every subsequent clip. Survives the whole
   session and needs no UI change.
2. **Surface the failure instead of swallowing it** — have `playAudio` return the
   rejection so the MC can show a "tap 🔊 to hear" hint when blocked. Honest, but does
   not actually make it play.
3. Play from within the previous answer's click handler by prefetching the next card's
   clip. Biggest change; only if 1 proves insufficient.

Whatever the fix, `lib/ux/audio.ts` is the single seam every clip player goes
through — change it there, not in the component.

## Verification evidence

- `npx tsc --noEmit` → exit **0**
- `npx eslint app components lib scripts seed` → exit **0**
- `npx tsx --test lib/ladder/*.test.ts lib/review/*.test.ts lib/mandarin/*.test.ts`
  → exit **0**; `tests 100 / pass 100 / fail 0`
- `npx next build` → exit **0**; `✓ Compiled successfully`
- `git push origin main` → `b38f157..e3d99c1`
- `vercel ls` → newest Production deploy **● Ready** (56s)
- Prod audio coverage → `515 total_cards / 515 with_audio / 0 missing_audio`

## Read before starting

1. `C:\Users\User\Software Projects\Language-Learning-App\components\review-session.tsx`
   (lines 75-142 are the whole autoplay path)
2. `C:\Users\User\Software Projects\Language-Learning-App\lib\ux\audio.ts`
3. `C:\Users\User\Software Projects\Language-Learning-App\lib\ux\prefs.ts`
4. `C:\Users\User\Software Projects\Language-Learning-App\.claude\plans\active-plan.md`
   (ladder redesign state, if broader context is needed)

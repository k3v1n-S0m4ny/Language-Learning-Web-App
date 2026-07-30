# Implementation summary — iOS autoplay silence (Mandarin MC pronunciation)

Date: 2026-07-30. Branch: `main`. Follows `b38f157` (the feature) and `e3d99c1`
(round-tail lockup), which shipped the autoplay but silent on the owner's iPhone.

## Diagnosis

Owner-reported symptoms, gathered before touching code:

| Question | Answer | What it ruled out |
| --- | --- | --- |
| Does the 🔊 replay button play? | **Yes** | Clip, Blob URL and `wholeAudioUrl` payload are all fine |
| Every card, or only the first? | **Every card** | Not a one-off sticky-activation warm-up |
| Device? | **Chrome on iPhone** | = WebKit; the strictest media policy there is |

Root cause: on iOS every browser is WebKit, and WebKit refuses
`HTMLAudioElement.play()` unless the call is **synchronous inside a user gesture**.
Not "after a gesture has happened" — awaiting anything first spends the activation.
So of the four call sites, only the ones invoked straight from an `onClick` worked:

- `review-session.tsx:141` autoplay effect on card arrival — no gesture → refused
- `review-session.tsx:183` on-commit clip — sits behind `await submitChoice` → refused
- `advanced-review-session.tsx:137` on-commit clip — same, so **Advanced Thai was
  silently affected too** (not part of the original report)
- `AudioButton` / `reveal()` — synchronous in the handler → worked

`playAudio` only `console.error`d the `NotAllowedError`, so the UI showed nothing.

## Changes

**`lib/ux/audio.ts` — rewritten. The seam now has two entry points, split by how
playback was triggered:**

- `playAudio(url)` — for calls synchronous inside a gesture. Still a media element,
  **deliberately**: on iOS an `<audio>` element plays through the physical ringer
  switch, while Web Audio is silenced by it. Routing the 🔊 button through Web Audio
  would have broken it for anyone studying with the phone on silent.
- `autoplayAudio(url)` — for gesture-less calls. Goes through Web Audio: one
  `AudioContext`, unlocked by the first `pointerdown`/`keydown` anywhere in the app
  (capture phase, `resume()` + a 1-sample silent buffer for older WebKit, **not**
  `once` — iOS re-suspends on backgrounding). Falls back to the media element when
  the context cannot be resumed, i.e. today's behaviour, which fails harmlessly.
- Return type changed from `HTMLAudioElement | null` to `ClipPlayback | null`
  (`whenDone(cb)`), since the Web Audio path has no element to hand back.
- Decoded-clip cache, **bounded to 24**. The probe measured a 35KB mp3 decoding to
  2.16s mono 48kHz float32 ≈ **384KB in memory**; unbounded across the 515-clip
  Mandarin deck is ~200MB on a phone. Map insertion order gives LRU eviction.

**Call sites:** `review-session.tsx` (arrival effect + on-commit),
`advanced-review-session.tsx` (on-commit) → `autoplayAudio`. `reveal()` in both
stays `playAudio`. `audio-button.tsx` re-exports both.
`thai/audio-play-button.tsx` uses `clip.whenDone()` instead of `addEventListener`.

Autoplay stays gated to `recognise-mc` and never fires on a produce step — kept
from the original design, since there the options *are* the Chinese.

## Verification

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | exit **0** |
| `npx eslint app components lib scripts seed` | exit **0** |
| `npx tsx --test lib/ladder/*.test.ts lib/review/*.test.ts lib/mandarin/*.test.ts` | exit **0** — `tests 100 / pass 100 / fail 0` |
| `npx next build` | exit **0** |
| `curl -D-` on a Blob clip | `200`, `access-control-allow-origin: *`, `audio/mpeg`, 34560 bytes — so `fetch` + `decodeAudioData` is permitted |

**Real-browser probe of the mechanism** (scratch page, driven via chrome-devtools,
`probe()` called from a `setTimeout` so there is no gesture behind it):

```
state before=running
state after resume=running
fetch ok=true status=200 type=audio/mpeg
bytes=34560
decoded: duration=2.160s channels=1 rate=48000
start() called at ctx time 4.792
ended after 2.160s of context time
```

The `ended` event firing after exactly the buffer duration of context time proves
playback actually progressed — not merely that `start()` did not throw.

## Left undone / residual risk

- **Not verified on the owner's iPhone.** That is the only surface that reproduces
  the bug, and Vercel previews 500 (auth vars are Production-only), so confirming it
  requires a prod deploy. Committed locally, not pushed — awaiting the owner's go.
- **If the iPhone ringer switch is off, autoplay stays silent** and cannot be fixed:
  Web Audio obeys the switch, and it is the only gesture-less API iOS allows. The 🔊
  button remains the fallback. Worth checking the switch when testing.
- No automated test covers the seam — it is `AudioContext`/`Audio` only, and the
  suite is plain `node:test` with no DOM. The probe above is the evidence instead.
- Round-tail fix from `e3d99c1` still needs a human to play a round to its last card.
- Deferred: `Left N` counting exposures rather than cards; deleting the
  `pre-ladder-fsrs-backup` Neon branch once the ladder is trusted.

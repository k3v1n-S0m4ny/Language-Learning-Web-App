"use client";

// The single "play a URL clip" seam. Every clip player (AudioButton,
// AudioPlayButton, review-session, advanced-review-session, word-chip) goes
// through here. Distinct from lib/ux/sfx.ts, which synthesises UI tones with no
// asset files; this plays real recorded audio and is never gated by the sound
// preference (it is content, not a UI sound effect).
//
// TWO ENTRY POINTS, BECAUSE iOS TREATS THE TWO CASES DIFFERENTLY.
//
// On iOS — which means every browser on an iPhone, Chrome included, since they
// are all WebKit — `HTMLAudioElement.play()` is refused unless the call is
// SYNCHRONOUS inside a user gesture. Not "after a gesture happened": awaiting
// anything first spends the activation. That is why the 🔊 button worked while
// the multiple-choice autoplay (a useEffect on card arrival) and the on-commit
// clip (which follows `await submitChoice`) were both silent on an iPhone, with
// only a swallowed NotAllowedError to show for it.
//
// Web Audio has no such rule: an AudioContext resumed once inside a gesture stays
// running for the life of the page, and a BufferSource started on it needs no
// gesture of its own. So gesture-less playback goes through Web Audio.
//
// The gesture-driven path deliberately KEEPS the media element rather than moving
// everything to Web Audio: on iOS an <audio> element plays through the physical
// ringer/silent switch, while Web Audio output is silenced by it. Routing the 🔊
// button through Web Audio would have broken it for anyone studying with their
// phone on silent. Autoplay for those learners is genuinely impossible — the OS
// says no sound — and the 🔊 button remains the fallback.

/** What a caller gets back: one-shot notification that the clip is over. */
export interface ClipPlayback {
  /** Runs `callback` when the clip ends, errors, or is refused. Fires at most once. */
  whenDone: (callback: () => void) => void;
}

function completion() {
  let fired = false;
  const waiting: Array<() => void> = [];
  return {
    handle: {
      whenDone: (callback: () => void) => {
        if (fired) callback();
        else waiting.push(callback);
      },
    } satisfies ClipPlayback,
    fire: () => {
      if (fired) return;
      fired = true;
      for (const callback of waiting.splice(0)) callback();
    },
  };
}

// --- Web Audio, for playback with no gesture behind it -----------------------

type ContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
// Decoded clips, so the tail of a round — which re-serves the same Card several
// times — replays for free. BOUNDED, because decoding inflates a clip enormously:
// the 35KB mp3 measured 2.16s of mono 48kHz float32, ~384KB in memory, and the
// Mandarin deck alone is 515 clips. A Map iterates in insertion order, so the
// oldest key is simply the first one; a hit re-inserts to make the eviction LRU.
const CLIP_CACHE_MAX = 24;
const decoded = new Map<string, AudioBuffer>();
const decoding = new Map<string, Promise<AudioBuffer | null>>();

function remember(url: string, buffer: AudioBuffer): void {
  decoded.set(url, buffer);
  while (decoded.size > CLIP_CACHE_MAX) {
    const oldest = decoded.keys().next();
    if (oldest.done) break;
    decoded.delete(oldest.value);
  }
}

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor: ContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: ContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

// Unlock on the first interaction anywhere in the app. iOS wants the context
// created or resumed inside a gesture, and older WebKit additionally wants a
// buffer actually played, so this does all three. NOT `once`: an iPhone
// suspends the context again when the tab is backgrounded or a call comes in,
// so every gesture is allowed to revive it.
function unlock() {
  const context = audioContext();
  if (!context || context.state === "running") return;
  void context.resume().catch(() => {
    /* still locked — the next gesture tries again */
  });
  const silence = context.createBufferSource();
  silence.buffer = context.createBuffer(1, 1, context.sampleRate);
  silence.connect(context.destination);
  silence.start();
}

if (typeof window !== "undefined") {
  // Capture phase, so a handler that stops propagation cannot cost us the unlock.
  window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  window.addEventListener("keydown", unlock, { capture: true });
}

function decodeClip(context: AudioContext, bytes: ArrayBuffer): Promise<AudioBuffer> {
  // Safari only grew the promise-returning form of decodeAudioData late, and the
  // callback form is still the one every version accepts. Passing both and taking
  // whichever answers covers old iOS without a version check.
  return new Promise<AudioBuffer>((resolve, reject) => {
    const maybePromise = context.decodeAudioData(bytes, resolve, reject);
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.then(resolve, reject);
    }
  });
}

function bufferFor(context: AudioContext, url: string): Promise<AudioBuffer | null> {
  const ready = decoded.get(url);
  if (ready) {
    decoded.delete(url);
    decoded.set(url, ready);
    return Promise.resolve(ready);
  }

  // One fetch per url even when two plays race (the arrival autoplay and a
  // tapped replay of the same clip).
  const inflight = decoding.get(url);
  if (inflight) return inflight;

  const work = (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await decodeClip(context, await response.arrayBuffer());
      remember(url, buffer);
      return buffer;
    } catch (err) {
      console.error("Audio decode failed", url, err);
      return null;
    } finally {
      decoding.delete(url);
    }
  })();
  decoding.set(url, work);
  return work;
}

// --- The two entry points ---------------------------------------------------

function playElement(url: string, done: () => void): void {
  const audio = new Audio(url);
  audio.addEventListener("ended", done);
  audio.addEventListener("error", done);
  audio.play().catch((err) => {
    console.error("Audio playback failed", url, err);
    done();
  });
}

/**
 * Play a clip from a call that is SYNCHRONOUS inside a user gesture — a button's
 * onClick, a card's reveal handler. Uses a media element, so it is audible on an
 * iPhone even with the ringer switch off. Returns null when there is no url (a
 * safe no-op, so callers need no guard of their own).
 */
export function playAudio(url: string | null): ClipPlayback | null {
  if (!url) return null;
  const { handle, fire } = completion();
  playElement(url, fire);
  return handle;
}

/**
 * Play a clip with NO user gesture behind it — an effect on card arrival, or a
 * play that follows an `await`. Goes through Web Audio, the only API iOS permits
 * here, and falls back to a media element when the context cannot be resumed
 * (Web Audio missing, or no interaction with the page yet).
 */
export function autoplayAudio(url: string | null): ClipPlayback | null {
  if (!url) return null;
  const { handle, fire } = completion();
  const context = audioContext();

  if (!context || context.state === "closed") {
    playElement(url, fire);
    return handle;
  }

  void (async () => {
    if (context.state !== "running") {
      try {
        await context.resume();
      } catch {
        /* handled by the state check below */
      }
    }
    if (context.state !== "running") return playElement(url, fire);

    const buffer = await bufferFor(context, url);
    if (!buffer) return playElement(url, fire);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.addEventListener("ended", fire);
    source.start();
  })();

  return handle;
}

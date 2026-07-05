"use client";

import { getSoundEnabled } from "./prefs";

// Synthesised UI sound effects — no audio asset files (licensing out of scope).
// Short oscillator + gain-envelope blips via a lazily-created, module-singleton
// AudioContext. Gated on the sound preference ONLY (default OFF) — NOT on
// reduced-motion: audio is not motion, and a user who explicitly opted sound IN
// should still hear it. The context is created lazily inside the first play()
// (which only runs from a user gesture, satisfying the autoplay policy) and is
// never created while muted.

type SfxKind = "correct" | "incorrect" | "unlock";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    // A context created before a gesture can start "suspended"; resume is safe
    // to call once we're inside a gesture-initiated play().
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// One oscillator note with a short attack/decay envelope, scheduled at `start`
// (seconds, on the context clock). type=triangle keeps the blips soft.
function note(
  audio: AudioContext,
  freq: number,
  start: number,
  duration: number,
  peak = 0.14,
): void {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playSfx(kind: SfxKind): void {
  try {
    if (!getSoundEnabled()) return;
    const audio = getCtx();
    if (!audio) return;
    const t = audio.currentTime;
    switch (kind) {
      case "correct":
        // Rising two-note (E5 → B5).
        note(audio, 659.25, t, 0.12);
        note(audio, 987.77, t + 0.09, 0.16);
        break;
      case "incorrect":
        // Brief low buzz (A2), quieter.
        note(audio, 110, t, 0.22, 0.1);
        break;
      case "unlock":
        // Ascending triad (C5 → E5 → G5).
        note(audio, 523.25, t, 0.14);
        note(audio, 659.25, t + 0.1, 0.14);
        note(audio, 783.99, t + 0.2, 0.2);
        break;
    }
  } catch {
    /* WebAudio unavailable or scheduling failed — non-essential, ignore. */
  }
}

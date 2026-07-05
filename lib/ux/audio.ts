"use client";

// Single low-level "play a URL clip" seam. This is the ONE place that
// constructs an HTMLAudioElement from a Blob/URL and starts playback — every
// clip player (AudioButton, AudioPlayButton, review-session, word-chip) goes
// through here. Distinct from lib/ux/sfx.ts, which synthesises UI tones with no
// asset files; this plays real recorded audio and is never gated by the sound
// preference (it is content, not a UI sound effect).
//
// Returns the element so a caller that tracks playing state can attach
// ended/error listeners; returns null when there is no url (a safe no-op).
export function playAudio(url: string | null): HTMLAudioElement | null {
  if (!url) return null;
  const audio = new Audio(url);
  audio.play().catch((err) => {
    console.error("Audio playback failed", url, err);
  });
  return audio;
}

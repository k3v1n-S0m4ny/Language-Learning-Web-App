"use client";

import { useState } from "react";

// Shared "hear it" control for anywhere a thai_items.audioUrl needs to be
// played back — unit-9 listen-and-repeat tiles, audio-* drill prompts, and
// the optional reveal-time playback on text drills once audio exists (A2/A4).
export function AudioPlayButton({
  url,
  label = "▶ Listen",
  size = "md",
}: {
  url: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const [playing, setPlaying] = useState(false);

  function play() {
    if (playing) return;
    const audio = new Audio(url);
    setPlaying(true);
    audio.addEventListener("ended", () => setPlaying(false));
    audio.addEventListener("error", () => setPlaying(false));
    void audio.play();
  }

  const sizeClass = size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm";

  // Glass pill (Phase 2): quiet glass chrome reading as an audio affordance
  // atop the flat drill/lesson content. Label text stays text-foreground
  // rather than the raw accent hue — saffron text measures ~2.15:1 on the
  // near-white glass surface (checked with a throwaway script), nowhere
  // near the 4.5:1 small-text AA floor; the .glass recipe's own border/
  // specular edge is what marks the button, not a colour tint on the text.
  // Behavior unchanged.
  return (
    <button
      type="button"
      onClick={play}
      disabled={playing}
      className={`glass rounded-[var(--r-pill)] font-medium text-foreground transition-colors hover:bg-[var(--glass-bg-strong)] disabled:opacity-60 ${sizeClass}`}
    >
      {playing ? "Playing…" : label}
    </button>
  );
}

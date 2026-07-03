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

  return (
    <button
      type="button"
      onClick={play}
      disabled={playing}
      className={`rounded-full border border-border-base bg-surface font-medium text-foreground-muted transition-colors hover:bg-background disabled:opacity-60 ${sizeClass}`}
    >
      {playing ? "Playing…" : label}
    </button>
  );
}

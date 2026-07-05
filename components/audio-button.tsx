"use client";

// The low-level clip player now lives in lib/ux/audio.ts (the single URL-clip
// seam). Re-exported here for back-compat with existing importers
// (review-session, word-chip) that reach for it via this module.
export { playAudio } from "@/lib/ux/audio";
import { playAudio } from "@/lib/ux/audio";

// Plays an Audio Clip from its Blob URL. Disabled (not hidden) when no clip
// exists, so the layout stays stable. `size="sm"` is the compact per-word
// chip variant; the default is the larger whole-phrase control.
export function AudioButton({
  url,
  label,
  size = "md",
}: {
  url: string | null;
  label: string;
  size?: "sm" | "md";
}) {
  function play() {
    playAudio(url);
  }

  const dimensions = size === "sm" ? "h-6 w-6 text-[11px]" : "h-11 w-11 text-lg";

  return (
    <button
      type="button"
      onClick={play}
      disabled={!url}
      aria-label={label}
      title={url ? label : "No audio"}
      className={`glass inline-flex items-center justify-center rounded-full text-[var(--accent)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 ${dimensions}`}
    >
      <span aria-hidden>🔊</span>
    </button>
  );
}

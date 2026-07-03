"use client";

// Imperatively start playback from a URL. Safe to call with null — a no-op.
// Intended for programmatic play triggered inside a user-gesture handler.
export function playAudio(url: string | null): void {
  if (!url) return;
  new Audio(url).play().catch((err) => {
    console.error("Audio playback failed", url, err);
  });
}

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

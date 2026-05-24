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
// exists, so the layout stays stable.
export function AudioButton({
  url,
  label,
}: {
  url: string | null;
  label: string;
}) {
  function play() {
    playAudio(url);
  }

  return (
    <button
      type="button"
      onClick={play}
      disabled={!url}
      aria-label={label}
      title={url ? label : "No audio"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-base text-foreground-muted transition-colors hover:bg-surface hover:text-brand disabled:opacity-30 disabled:hover:bg-transparent active:scale-95"
    >
      <span aria-hidden>🔊</span>
    </button>
  );
}

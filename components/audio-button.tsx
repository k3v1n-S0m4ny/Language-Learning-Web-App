"use client";

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
    if (!url) return;
    // A missing/!ok Blob URL or decode failure rejects this promise; surface it to
    // the console rather than failing the tap silently.
    new Audio(url).play().catch((err) => {
      console.error("Audio playback failed", url, err);
    });
  }

  return (
    <button
      type="button"
      onClick={play}
      disabled={!url}
      aria-label={label}
      title={url ? label : "No audio"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      <span aria-hidden>🔊</span>
    </button>
  );
}

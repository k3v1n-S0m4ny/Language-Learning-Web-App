"use client";

// The small outlined pill used for in-session display toggles (pinyin, tone
// colour, audio autoplay). Extracted from card-back.tsx once the multiple-choice
// prompt needed the same control, so the two surfaces cannot drift apart.
//
// `pressed` is OPTIONAL on purpose. A pill whose label names the ACTION ("Show
// pinyin") must not also claim a pressed state — the label already changes, and
// announcing both reads as contradictory. A pill whose label names the STATE
// ("Tone colour on") is a genuine toggle and passes it.
export function TogglePill({
  label,
  onToggle,
  pressed,
  title,
}: {
  label: string;
  onToggle: () => void;
  pressed?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={pressed}
      title={title}
      className="focus-ring rounded-[var(--r-pill)] border border-border-base px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-foreground"
    >
      {label}
    </button>
  );
}

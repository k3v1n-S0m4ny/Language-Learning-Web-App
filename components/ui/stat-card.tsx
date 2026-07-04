import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  hero?: boolean;
  accent?: boolean;
  className?: string;
};

// Glass-language metric card (Phase 3 stats hero + tiles). Server-safe shell
// (no hooks) so it can sit directly in the server-rendered stats pages — the
// count-up animation lives INSIDE it only where the caller passes a client
// <CountUp/> as `value`.
//
// This is a CONTENT surface (a number the learner reads), not floating
// chrome, so it reuses the same "solid elevated" recipe already established
// for the flip-card faces (border + bg-surface + var(--glass-shadow)) rather
// than the translucent `.glass` blur recipe — computed contrast (see the
// "Phase 3" note in globals.css) shows the accent hues fail AA as text on a
// light glass tint, and solid-elevated keeps this text unconditionally
// legible in both themes regardless (the "flat ≠ invisible" a11y rule).
//
// `accent`: the value text itself stays `text-foreground` always (raw
// --accent measures ~2:1-2.5:1 on a light surface — nowhere near the 4.5:1
// floor, see globals.css). Accent is instead applied as a small decorative
// left rule on the label — a non-text graphical flourish, not a data
// encoding, so it isn't held to the text-contrast floor.
export function StatCard({
  label,
  value,
  sub,
  hero = false,
  accent = false,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-[var(--r-lg)] border border-border-base bg-surface shadow-[var(--glass-shadow)] ${
        hero ? "gap-2 p-6" : "p-4"
      } ${className}`}
    >
      <span
        className={`text-xs font-medium uppercase tracking-wide text-foreground-muted ${
          accent ? "border-l-2 border-[var(--accent)] pl-2" : ""
        }`}
      >
        {label}
      </span>
      <span
        className={`font-semibold tabular-nums text-foreground ${
          hero ? "text-display" : "text-lg"
        }`}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-foreground-muted opacity-70">{sub}</span>}
    </div>
  );
}

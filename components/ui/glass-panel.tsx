import type { HTMLAttributes } from "react";

// Floating-chrome glass surface primitive (glass redesign, Phase 0). Applies the
// `.glass` recipe (blur + saturate + specular top edge + border + shadow) from
// globals.css at the large concentric radius. For FLOATING CHROME only — reading
// and content surfaces stay solid (bg-surface), never glass behind script.
type GlassPanelProps = HTMLAttributes<HTMLDivElement> & {
  /** Use the more-opaque variant for denser content that must stay legible. */
  strong?: boolean;
};

export function GlassPanel({
  strong = false,
  className = "",
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={`glass${strong ? " glass-strong" : ""} rounded-[var(--r-lg)] ${className}`}
      {...props}
    />
  );
}

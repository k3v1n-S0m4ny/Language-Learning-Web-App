// Shared glass-native intensity ramp (Phase 3) — one sequential 5-stop warm
// scale (`--heat-0`..`--heat-4`, tuned in globals.css, AA-verified per stop
// in both themes) reused by failure-heatmap.tsx (full 0-4 range) and
// tone-confusion-matrix.tsx (1-4; its zero/no-data cells stay the existing
// neutral `bg-background` treatment, unchanged, since no text renders in an
// empty cell). This is a GENERIC severity/magnitude scale, not a class/tone
// colour — it must stay independent of the per-language `--accent` tokens.
export type HeatStop = 0 | 1 | 2 | 3 | 4;

// Written as complete, static class strings (not template-literal-built) so
// Tailwind's build-time source scanner can actually discover them — a
// dynamically-interpolated `bg-[var(--heat-${stop})]` would never be
// generated, since the scanner only recognises whole class names that
// appear verbatim in source.
const HEAT_CELL_CLASS: Record<HeatStop, string> = {
  0: "bg-[var(--heat-0)] text-[var(--heat-0-ink)]",
  1: "bg-[var(--heat-1)] text-[var(--heat-1-ink)]",
  2: "bg-[var(--heat-2)] text-[var(--heat-2-ink)]",
  3: "bg-[var(--heat-3)] text-[var(--heat-3-ink)]",
  4: "bg-[var(--heat-4)] text-[var(--heat-4-ink)]",
};

// Each stop pairs a background with an "ink" (text) colour tuned so the
// pairing clears 4.5:1 in both light and dark mode — see the "Phase 3" AA
// table in globals.css for the computed ratios.
export function heatCellClass(stop: HeatStop): string {
  return HEAT_CELL_CLASS[stop];
}

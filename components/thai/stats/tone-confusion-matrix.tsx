import type { Tone } from "@/seed/thai/types";
import type { ToneConfusionCell } from "@/lib/thai/stats";
import { TONE_LABELS, TONE_ORDER } from "@/lib/thai/tone";
import { heatCellClass } from "./heat-scale";

// Header text colour keyed to the glass-native --thai-tone-* palette
// (Phase 2) — ties the matrix's row/column headers back to the same tone
// hues used by ToneSparkline/ClassBadge elsewhere. AA-verified as 4.5:1+
// small text in both themes (see the table in globals.css).
const TONE_HEADER_CLASS: Record<Tone, string> = {
  mid: "text-thai-tone-mid",
  low: "text-thai-tone-low",
  falling: "text-thai-tone-falling",
  high: "text-thai-tone-high",
  rising: "text-thai-tone-rising",
};

// 5x5 grid: expected tone (row) vs chosen tone (column) — A5. Same shared
// glass-native heat ramp as FailureHeatmap (Phase 3), keyed off each row's
// own max so one heavily-drilled tone doesn't wash out the rest of the grid.
//
// The zero-count text colour is folded in HERE (not left to a static
// `text-foreground` on the <td>) so the returned class string is always the
// ONLY text-colour utility applied to the cell. Post-review fix: a
// co-present static `text-foreground` on the <td> collided with this same
// `text-[var(--heat-N-ink)]` utility at identical specificity — Tailwind's
// compiled output orders `.text-foreground` after the heat-ink rules, so it
// silently won the cascade and defeated the AA-tuned ink for every non-empty
// cell (harmless at stops 0-3, where --foreground happens to match the
// intended ink, but a real AA failure at stop 4 — see globals.css's Phase 3
// note). Never let two text-color classes coexist on the same element again.
function cellColor(count: number, rowMax: number): string {
  if (count === 0) return "bg-background text-foreground";
  const ratio = rowMax > 0 ? count / rowMax : 0;
  if (ratio < 0.25) return heatCellClass(1);
  if (ratio < 0.5) return heatCellClass(2);
  if (ratio < 0.75) return heatCellClass(3);
  return heatCellClass(4);
}

export function ToneConfusionMatrix({ cells }: { cells: ToneConfusionCell[] }) {
  const total = cells.reduce((sum, c) => sum + c.count, 0);
  if (total === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-[var(--r-md)] bg-background text-sm text-foreground-muted">
        No tone drills answered yet
      </div>
    );
  }

  const byExpected = new Map<string, ToneConfusionCell[]>();
  for (const cell of cells) {
    const list = byExpected.get(cell.expected) ?? [];
    list.push(cell);
    byExpected.set(cell.expected, list);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
              Expected \ Chosen
            </th>
            {TONE_ORDER.map((tone) => (
              <th
                key={tone}
                className={`px-2 py-1 text-center text-xs font-semibold uppercase tracking-wide ${TONE_HEADER_CLASS[tone]}`}
              >
                {TONE_LABELS[tone]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TONE_ORDER.map((expected) => {
            const row = byExpected.get(expected) ?? [];
            const rowMax = Math.max(0, ...row.map((c) => c.count));
            return (
              <tr key={expected}>
                <th className={`px-2 py-1 text-left text-xs font-semibold ${TONE_HEADER_CLASS[expected]}`}>
                  {TONE_LABELS[expected]}
                </th>
                {TONE_ORDER.map((chosen) => {
                  const cell = row.find((c) => c.chosen === chosen);
                  const count = cell?.count ?? 0;
                  return (
                    <td
                      key={chosen}
                      className={`h-10 w-10 rounded-[var(--r-sm)] text-center text-xs font-semibold ${cellColor(count, rowMax)}`}
                      title={`Expected ${expected}, chose ${chosen}: ${count}`}
                    >
                      {count || ""}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import type { ToneConfusionCell } from "@/lib/thai/stats";
import { TONE_LABELS, TONE_ORDER } from "@/lib/thai/tone";

// 5x5 grid: expected tone (row) vs chosen tone (column) — A5. Same earthy
// intensity scale as FailureHeatmap, keyed off each row's own max so one
// heavily-drilled tone doesn't wash out the rest of the grid.
function cellColor(count: number, rowMax: number): string {
  if (count === 0) return "bg-background";
  const ratio = rowMax > 0 ? count / rowMax : 0;
  if (ratio < 0.25) return "bg-easy";
  if (ratio < 0.5) return "bg-sage";
  if (ratio < 0.75) return "bg-highlight";
  return "bg-clay";
}

export function ToneConfusionMatrix({ cells }: { cells: ToneConfusionCell[] }) {
  const total = cells.reduce((sum, c) => sum + c.count, 0);
  if (total === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg bg-background text-sm text-foreground-muted">
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
                className="px-2 py-1 text-center text-xs font-medium uppercase tracking-wide text-foreground-muted"
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
                <th className="px-2 py-1 text-left text-xs font-medium text-foreground-muted">
                  {TONE_LABELS[expected]}
                </th>
                {TONE_ORDER.map((chosen) => {
                  const cell = row.find((c) => c.chosen === chosen);
                  const count = cell?.count ?? 0;
                  return (
                    <td
                      key={chosen}
                      className={`h-10 w-10 rounded-md text-center text-xs font-semibold text-on-earthy ${cellColor(count, rowMax)}`}
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

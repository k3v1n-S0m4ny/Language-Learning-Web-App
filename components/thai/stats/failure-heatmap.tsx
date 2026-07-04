import type { FailureHeatmapRow } from "@/lib/thai/stats";
import { heatCellClass } from "./heat-scale";

// Intensity scale for failure rate (Phase 3: shared glass-native heat ramp,
// 0 = perfect / quiet, 4 = highest failure rate).
function cellColor(rate: number): string {
  if (rate === 0) return heatCellClass(0);
  if (rate < 25) return heatCellClass(1);
  if (rate < 50) return heatCellClass(2);
  if (rate < 75) return heatCellClass(3);
  return heatCellClass(4);
}

export function FailureHeatmap({ rows }: { rows: FailureHeatmapRow[] }) {
  if (!rows.length) {
    return (
      <div className="flex h-24 items-center justify-center rounded-[var(--r-md)] bg-background text-sm text-foreground-muted">
        No drill attempts yet
      </div>
    );
  }

  const top = rows.slice(0, 24);

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {top.map((row) => (
        <div
          key={row.itemId}
          title={`${row.failures}/${row.attempts} missed`}
          className={`flex flex-col items-center justify-center gap-0.5 rounded-[var(--r-md)] p-2 ${cellColor(row.failureRate)}`}
        >
          <span className="font-thai text-lg leading-none">{row.display}</span>
          <span className="text-[10px] font-semibold">{row.failureRate}%</span>
        </div>
      ))}
    </div>
  );
}

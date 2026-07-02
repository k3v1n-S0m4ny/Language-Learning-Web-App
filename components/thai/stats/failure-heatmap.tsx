import type { FailureHeatmapRow } from "@/lib/thai/stats";

// Intensity scale for failure rate — earthy palette, darker = worse.
function cellColor(rate: number): string {
  if (rate === 0) return "bg-easy";
  if (rate < 25) return "bg-sage";
  if (rate < 50) return "bg-highlight";
  if (rate < 75) return "bg-peach";
  return "bg-clay";
}

export function FailureHeatmap({ rows }: { rows: FailureHeatmapRow[] }) {
  if (!rows.length) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg bg-background text-sm text-foreground-muted">
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
          className={`flex flex-col items-center justify-center gap-0.5 rounded-lg p-2 text-on-earthy ${cellColor(row.failureRate)}`}
        >
          <span className="font-thai text-lg leading-none">{row.display}</span>
          <span className="text-[10px] font-semibold">{row.failureRate}%</span>
        </div>
      ))}
    </div>
  );
}

"use client";

// Bar chart showing cards due on each of the next 7 Thai days (A7, A9).
// Client component because Recharts uses browser APIs internally.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DayCount } from "@/lib/review/stats";

interface ForecastChartProps {
  data: DayCount[];
}

// Success green (#1A7A40) — darkened from original #1F8A4C to pass WCAG AA
// (white-on-success 5.4:1 ≥ 4.5:1). Matches --color-success in globals.css.
const BAR_FILL = "#1a7a40";

export function ForecastChart({ data }: ForecastChartProps) {
  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-background text-sm text-foreground-muted">
        Nothing due in the next 7 days
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip
          formatter={(value) => [value, "Due"]}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="count" fill={BAR_FILL} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

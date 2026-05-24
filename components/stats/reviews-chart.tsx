"use client";

// Bar chart of daily review counts over the last 30 Thai days (A5, A9).
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

interface ReviewsChartProps {
  data: DayCount[];
}

// Brand color (#62736F) used instead of the old #6366f1 indigo — matches the
// earthy palette established in globals.css.
const BAR_FILL = "#62736f";

export function ReviewsChart({ data }: ReviewsChartProps) {
  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-background text-sm text-foreground-muted">
        No reviews yet
      </div>
    );
  }

  // Show only every 5th label to avoid X-axis crowding on 30 bars.
  const tickFormatter = (_: string, index: number) =>
    index % 5 === 0 ? data[index]?.label ?? "" : "";

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10 }}
          tickFormatter={tickFormatter}
          interval={0}
        />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip
          formatter={(value) => [value, "Reviews"]}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="count" fill={BAR_FILL} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

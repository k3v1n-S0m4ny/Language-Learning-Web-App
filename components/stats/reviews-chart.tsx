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
import { useReducedMotion } from "motion/react";
import type { DayCount } from "@/lib/review/stats";
import {
  glassTooltipContentStyle,
  glassTooltipItemStyle,
  glassTooltipLabelStyle,
} from "./glass-tooltip";

interface ReviewsChartProps {
  data: DayCount[];
}

// Series colour is the per-language accent (Phase 3) — resolves to Mandarin
// jade via [data-lang="mandarin"], set by <LangSync> on this page.
const BAR_FILL = "var(--accent)";

export function ReviewsChart({ data }: ReviewsChartProps) {
  const reduceMotion = useReducedMotion();
  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <div className="flex h-40 items-center justify-center rounded-[var(--r-md)] bg-background text-sm text-foreground-muted">
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
          contentStyle={glassTooltipContentStyle}
          labelStyle={glassTooltipLabelStyle}
          itemStyle={glassTooltipItemStyle}
        />
        <Bar
          dataKey="count"
          fill={BAR_FILL}
          radius={[4, 4, 0, 0]}
          isAnimationActive={!reduceMotion}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

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
import { useReducedMotion } from "motion/react";
import type { DayCount } from "@/lib/review/stats";
import {
  glassTooltipContentStyle,
  glassTooltipItemStyle,
  glassTooltipLabelStyle,
} from "./glass-tooltip";

interface ForecastChartProps {
  data: DayCount[];
}

// Series colour is the per-language accent (Phase 3), replacing the old
// hardcoded success-green hex — resolves to Mandarin jade here.
const BAR_FILL = "var(--accent)";

export function ForecastChart({ data }: ForecastChartProps) {
  const reduceMotion = useReducedMotion();
  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <div className="flex h-40 items-center justify-center rounded-[var(--r-md)] bg-background text-sm text-foreground-muted">
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

"use client";

import {
  Bar,
  BarChart,
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
} from "@/components/stats/glass-tooltip";

// Series colour is the per-language accent (Phase 3) — resolves to Thai
// saffron via [data-lang="thai"], set by <LangSync> on this page.
const BAR_FILL = "var(--accent)";

export function DrillActivityChart({ data }: { data: DayCount[] }) {
  const reduceMotion = useReducedMotion();
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) {
    return (
      <div className="flex h-40 items-center justify-center rounded-[var(--r-md)] bg-background text-sm text-foreground-muted">
        No drill activity yet
      </div>
    );
  }

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
          formatter={(value) => [value, "Attempts"]}
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

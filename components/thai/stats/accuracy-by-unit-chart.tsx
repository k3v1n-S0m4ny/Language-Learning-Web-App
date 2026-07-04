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
import type { UnitAccuracy } from "@/lib/thai/stats";
import {
  glassTooltipContentStyle,
  glassTooltipItemStyle,
  glassTooltipLabelStyle,
} from "@/components/stats/glass-tooltip";

// Series colour is the per-language accent (Phase 3) — resolves to Thai
// saffron via [data-lang="thai"], set by <LangSync> on this page.
const BAR_FILL = "var(--accent)";

export function AccuracyByUnitChart({ data }: { data: UnitAccuracy[] }) {
  const reduceMotion = useReducedMotion();
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-[var(--r-md)] bg-background text-sm text-foreground-muted">
        No drill attempts yet
      </div>
    );
  }

  const chartData = data.map((d) => ({ label: `Unit ${d.unit}`, percent: d.percent, total: d.total }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} allowDecimals={false} />
        <Tooltip
          formatter={(value) => [`${value}%`, "Accuracy"]}
          contentStyle={glassTooltipContentStyle}
          labelStyle={glassTooltipLabelStyle}
          itemStyle={glassTooltipItemStyle}
        />
        <Bar
          dataKey="percent"
          fill={BAR_FILL}
          radius={[4, 4, 0, 0]}
          isAnimationActive={!reduceMotion}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

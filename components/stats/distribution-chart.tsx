"use client";

// A horizontal labelled bar chart, used twice on the stats page: the ladder
// spread (how many cards sit at each step) and the interval histogram (how far
// out the graduated cards are scheduled).
//
// It replaces rating-chart.tsx, which could only ever show the Again/Hard/Good/
// Easy split. Both of its successors are distributions over a small labelled set,
// so they are one component rather than two near-identical ones.
//
// Client component because Recharts uses browser APIs internally.

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useReducedMotion } from "motion/react";
import {
  glassTooltipContentStyle,
  glassTooltipItemStyle,
  glassTooltipLabelStyle,
} from "./glass-tooltip";

export interface DistributionSlice {
  label: string;
  count: number;
}

export function DistributionChart({
  data,
  colors,
  unit = "Cards",
  emptyLabel = "Nothing here yet",
}: {
  data: DistributionSlice[];
  /**
   * One fill per bar, cycled if shorter. Omit for a single accent fill — colour
   * only earns its place when the categories carry an order the reader should
   * feel (the ladder does; interval buckets do not).
   */
  colors?: string[];
  unit?: string;
  emptyLabel?: string;
}) {
  const reduceMotion = useReducedMotion();
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-28 items-center justify-center rounded-[var(--r-md)] bg-background text-sm text-foreground-muted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(90, data.length * 28)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 0, right: 8, bottom: 0, left: 8 }}
      >
        <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={78} />
        <Tooltip
          formatter={(value) => [value, unit]}
          contentStyle={glassTooltipContentStyle}
          labelStyle={glassTooltipLabelStyle}
          itemStyle={glassTooltipItemStyle}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={!reduceMotion}>
          {data.map((_, index) => (
            <Cell
              key={index}
              fill={colors ? colors[index % colors.length] : "var(--accent)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

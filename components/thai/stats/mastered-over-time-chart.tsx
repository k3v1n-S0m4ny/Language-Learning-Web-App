"use client";

import {
  Area,
  AreaChart,
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
const LINE_COLOR = "var(--accent)";

export function MasteredOverTimeChart({ data }: { data: DayCount[] }) {
  const reduceMotion = useReducedMotion();
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) {
    return (
      <div className="flex h-40 items-center justify-center rounded-[var(--r-md)] bg-background text-sm text-foreground-muted">
        No items mastered yet
      </div>
    );
  }

  const lastIndex = data.length - 1;
  // Emphasized endpoint: only the LAST point gets a persistent dot; every
  // interior point stays dot-free (per the brief's "keep dot={false} for
  // interior points").
  const endpointDot = ({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) => {
    if (index !== lastIndex || cx === undefined || cy === undefined) {
      return <circle key={`dot-${index}`} cx={0} cy={0} r={0} fill="none" />;
    }
    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r={4}
        fill={LINE_COLOR}
        stroke="var(--surface)"
        strokeWidth={2}
      />
    );
  };

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
        <defs>
          <linearGradient id="mastered-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.35} />
            <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip
          formatter={(value) => [value, "Mastered"]}
          contentStyle={glassTooltipContentStyle}
          labelStyle={glassTooltipLabelStyle}
          itemStyle={glassTooltipItemStyle}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={LINE_COLOR}
          strokeWidth={2}
          fill="url(#mastered-gradient)"
          dot={endpointDot}
          activeDot={{ r: 4 }}
          isAnimationActive={!reduceMotion}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

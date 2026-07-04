"use client";

// Horizontal bar chart showing the Again/Hard/Good/Easy rating breakdown (A8, A9).
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
import type { RatingCounts } from "@/lib/review/stats";
import {
  glassTooltipContentStyle,
  glassTooltipItemStyle,
  glassTooltipLabelStyle,
} from "./glass-tooltip";

interface RatingChartProps {
  ratingCounts: RatingCounts;
}

// FUNCTIONAL rating ramp — NOT decorative, never recoloured to the language
// accent (per the Phase 3 brief). Phase 3 retokens this from its previous
// standalone earthy hex set onto the SAME --rate-* tokens the on-screen
// rating buttons already use (rating-buttons.tsx), so "Again/Hard/Good/Easy"
// means the same colour everywhere in the app rather than two competing
// palettes for one semantic ramp. Already AA-verified against
// --color-on-earthy in the Phase 1 table in globals.css.
const RATING_COLORS = [
  "var(--rate-again)",
  "var(--rate-hard)",
  "var(--rate-good)",
  "var(--rate-easy)",
];

export function RatingChart({ ratingCounts }: RatingChartProps) {
  const reduceMotion = useReducedMotion();
  const data = [
    { name: "Again", count: ratingCounts.again },
    { name: "Hard", count: ratingCounts.hard },
    { name: "Good", count: ratingCounts.good },
    { name: "Easy", count: ratingCounts.easy },
  ];

  const total = data.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-28 items-center justify-center rounded-[var(--r-md)] bg-background text-sm text-foreground-muted">
        No reviews yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={110}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 0, right: 8, bottom: 0, left: 8 }}
      >
        <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={38} />
        <Tooltip
          formatter={(value) => [value, "Reviews"]}
          contentStyle={glassTooltipContentStyle}
          labelStyle={glassTooltipLabelStyle}
          itemStyle={glassTooltipItemStyle}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={!reduceMotion}>
          {data.map((_, index) => (
            <Cell key={index} fill={RATING_COLORS[index]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

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
import type { RatingCounts } from "@/lib/review/stats";

interface RatingChartProps {
  ratingCounts: RatingCounts;
}

// Palette-aligned colors: Again=clay, Hard=peach, Good=success, Easy=easy.
// Replaces the old ad-hoc [#ef4444, #f97316, #22c55e, #6366f1] array.
// Good (#1A7A40) darkened from original #1F8A4C to pass WCAG AA (5.4:1 white-on-success).
const RATING_COLORS = ["#db846e", "#e8b5a7", "#1a7a40", "#3baf7a"];

export function RatingChart({ ratingCounts }: RatingChartProps) {
  const data = [
    { name: "Again", count: ratingCounts.again },
    { name: "Hard", count: ratingCounts.hard },
    { name: "Good", count: ratingCounts.good },
    { name: "Easy", count: ratingCounts.easy },
  ];

  const total = data.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-28 items-center justify-center rounded-lg bg-background text-sm text-foreground-muted">
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
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="count" radius={[0, 2, 2, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={RATING_COLORS[index]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

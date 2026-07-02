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
import type { UnitAccuracy } from "@/lib/thai/stats";

const BAR_FILL = "#1a7a40";

export function AccuracyByUnitChart({ data }: { data: UnitAccuracy[] }) {
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-background text-sm text-foreground-muted">
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
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="percent" fill={BAR_FILL} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

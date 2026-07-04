import type { CSSProperties } from "react";

// Shared Recharts tooltip styling (Phase 3) — every chart on both stats
// pages passes these style objects to its <Tooltip>, so a tooltip reads as
// the same glass surface regardless of which product's page renders it.
// Recharts (v3.8.1) types contentStyle/labelStyle/itemStyle as plain
// CSSProperties, so no custom `content` render component (and its
// version-sensitive generics) is needed to get the glass look.
export const glassTooltipContentStyle: CSSProperties = {
  background: "var(--glass-bg-strong)",
  backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
  WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
  border: "1px solid var(--glass-brd)",
  borderRadius: "var(--r-md)",
  boxShadow: "var(--glass-shadow)",
  color: "var(--foreground)",
  fontSize: 12,
  padding: "8px 12px",
};

export const glassTooltipLabelStyle: CSSProperties = {
  color: "var(--foreground)",
  fontWeight: 600,
  marginBottom: 2,
};

export const glassTooltipItemStyle: CSSProperties = {
  color: "var(--foreground)",
};

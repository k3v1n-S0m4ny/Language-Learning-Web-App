import type { SessionCounts } from "@/lib/review/types";

// Top-of-screen counts for the current study session, in glossary terms.
export function SessionHeader({
  learnerName,
  counts,
}: {
  learnerName: string | null | undefined;
  counts: SessionCounts;
}) {
  return (
    <header className="flex items-center gap-4 text-sm text-foreground-muted">
      <span>你好{learnerName ? `, ${learnerName}` : ""} 👋</span>
      <span>Due: {counts.dueCount}</span>
      <span>New: {counts.newRemaining}</span>
    </header>
  );
}

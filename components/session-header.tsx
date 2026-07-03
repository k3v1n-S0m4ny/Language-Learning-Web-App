import type { SessionCounts } from "@/lib/review/types";

// Session meta row: Due/New counts for the current study session. The
// greeting + nav controls that used to live here moved to the floating
// glass <TopBar> (Phase 1) — this keeps just the small, centered counts line
// from the north-star reference.
export function SessionHeader({ counts }: { counts: SessionCounts }) {
  return (
    <p className="flex items-center gap-2.5 text-xs font-semibold text-foreground-muted">
      <span>
        Due <b className="font-semibold tabular-nums text-foreground">{counts.dueCount}</b>
      </span>
      <span aria-hidden className="text-foreground-muted/50">
        ·
      </span>
      <span>
        New <b className="font-semibold tabular-nums text-foreground">{counts.newRemaining}</b>
      </span>
    </p>
  );
}

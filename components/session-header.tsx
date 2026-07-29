import type { SessionCounts } from "@/lib/review/types";

// Session meta row for the current round.
//
// Left / Repeats, not Due / New. The pair now describes the ROUND rather than the
// queue: everything owed today, split by whether it has been asked yet — which is
// what makes the finish line legible while you are still walking toward it. New
// cards are not called out separately because they are inside `Left` from the
// moment the round admits them; they are work owed today like any other card.
//
// Identical in shape to the Advanced Thai header (advanced-study-screen.tsx), and
// deliberately so: one Learner, two courses, one reading of "how much is left".
export function SessionHeader({ counts }: { counts: SessionCounts }) {
  return (
    <p className="flex items-center gap-2.5 text-xs font-semibold text-foreground-muted">
      <span>
        Left <b className="font-semibold tabular-nums text-foreground">{counts.remaining}</b>
      </span>
      <span aria-hidden className="text-foreground-muted/50">
        ·
      </span>
      <span>
        Repeats <b className="font-semibold tabular-nums text-foreground">{counts.repeats}</b>
      </span>
    </p>
  );
}

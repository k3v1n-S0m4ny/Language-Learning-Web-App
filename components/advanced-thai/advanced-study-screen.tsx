"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { addNewCardsToday } from "@/lib/advanced-thai/actions";
import type { AtSessionCounts, AtStudyCard } from "@/lib/advanced-thai/types";
import type { IntervalHints } from "@/lib/review/types";
import { AdvancedReviewSession } from "./advanced-review-session";
import { ThaiFontProvider, type ThaiFont } from "./kit";

// The client shell around one theme's session.
//
// It exists to hold two things that must OUTLIVE the individual card, and so
// cannot live in AdvancedReviewSession (which is keyed by card.id and therefore
// remounts on every rating):
//
//   1. The letterform choice. Thai is set in two very different cuts — the
//      classical LOOPED forms you learn to read in, and the modern LOOPLESS ones
//      most signage and UI actually uses. Read-Thai's exam offers the same toggle.
//      If this lived in the session it would snap back to the default on every
//      card, which is worse than not offering it.
//   2. The counts header and the way out.
export function AdvancedStudyScreen({
  themeTitle,
  counts,
  card,
  hints,
}: {
  themeTitle: string;
  counts: AtSessionCounts;
  card: AtStudyCard | null;
  hints: IntervalHints | null;
}) {
  const [font, setFont] = useState<ThaiFont>("looped");

  return (
    <ThaiFontProvider value={font}>
      <main className="flex min-h-dvh flex-col items-center gap-5 page-gutter pb-[calc(5rem+var(--safe-bottom))] sm:pb-8">
        <header className="glass sticky top-3 z-20 flex w-full max-w-2xl items-center gap-2 rounded-[var(--r-pill)] px-3 py-2">
          <Link
            href="/"
            className="rounded-[var(--r-pill)] px-2 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-foreground"
          >
            ← Themes
          </Link>
          <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold tracking-tight text-foreground">
            {themeTitle}
          </span>
          <SegmentedControl<ThaiFont>
            ariaLabel="Thai letterform"
            value={font}
            onChange={setFont}
            options={[
              { value: "looped", label: "ก", title: "Classical (looped)" },
              { value: "loopless", label: "ก", title: "Modern (loopless)" },
            ]}
          />
        </header>

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

        <div className="flex w-full flex-1 flex-col items-center justify-center">
          {card && hints ? (
            <AdvancedReviewSession key={card.id} card={card} hints={hints} />
          ) : (
            <AllCaughtUp unseenRemaining={counts.unseenRemaining} />
          )}
        </div>
      </main>
    </ThaiFontProvider>
  );
}

// Advanced Thai's own empty state rather than components/empty-state.tsx.
// That one is not reusable here without lying: its whole job is to explain the
// HSK BAND GATE (it takes a GateStatus and renders hskLabel), and Advanced Thai
// is ungated — there is no band, nothing is being withheld, and the only reason
// to see this screen is that the day's cards are done.
const TOP_UP_BATCH = 10;

function AllCaughtUp({ unseenRemaining }: { unseenRemaining: number }) {
  const [pending, startTransition] = useTransition();
  const canTopUp = unseenRemaining > 0;

  function addMore() {
    startTransition(async () => {
      await addNewCardsToday(TOP_UP_BATCH);
    });
  }

  return (
    <div className="glass flex w-full max-w-md flex-col items-center gap-2 rounded-[var(--r-lg)] p-8 text-center animate-slide-up-fade">
      <p className="text-lg font-semibold text-foreground">All caught up</p>
      <p className="text-sm text-foreground-muted">
        {canTopUp ? (
          <>
            Nothing due in this theme right now, and today&apos;s new cards are done. Come
            back tomorrow, or add more new cards for today.
          </>
        ) : (
          <>
            Nothing due in this theme right now, and you&apos;ve seen every card in it. Come
            back tomorrow.
          </>
        )}
      </p>
      {canTopUp && (
        <button
          type="button"
          onClick={addMore}
          disabled={pending}
          className="mt-2 rounded-[var(--r-pill)] px-6 py-2.5 text-sm font-semibold text-on-earthy shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] transition-transform active:scale-95 disabled:opacity-70"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-3))" }}
        >
          {pending ? "Adding…" : `Add ${TOP_UP_BATCH} more cards for today`}
        </button>
      )}
      <Link
        href="/"
        className="mt-2 rounded-[var(--r-pill)] border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-background hover:text-foreground"
      >
        Back to themes
      </Link>
    </div>
  );
}

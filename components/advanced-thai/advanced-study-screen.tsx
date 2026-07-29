"use client";

import { useState } from "react";
import Link from "next/link";
import { RoundComplete } from "@/components/ladder/round-complete";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { addNewCardsToday } from "@/lib/advanced-thai/actions";
import type { AtRoundCounts, AtStudyCard } from "@/lib/advanced-thai/types";
import { AdvancedReviewSession } from "./advanced-review-session";
import { ThaiFontProvider, type ThaiFont } from "./kit";

// The client shell around one theme's round.
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
}: {
  themeTitle: string;
  counts: AtRoundCounts;
  card: AtStudyCard | null;
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

        {/* Left / Repeats, not Due / New. The pair now describes the ROUND rather
            than the queue: everything owed today, split by whether it has been
            asked yet — which is what makes the finish line legible while you are
            still walking toward it. */}
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

        <div className="flex w-full flex-1 flex-col items-center justify-center">
          {card ? (
            <AdvancedReviewSession key={card.id} card={card} />
          ) : (
            // The shared finish screen directly, rather than Mandarin's wrapper
            // (components/mandarin-round-complete.tsx). That wrapper exists only to
            // explain the HSK BAND GATE — it takes a GateStatus and renders
            // hskLabel — and Advanced Thai is ungated, so there is nothing for it
            // to say here.
            <RoundComplete
              unseenRemaining={counts.unseenRemaining}
              onTopUp={addNewCardsToday}
            />
          )}
        </div>
      </main>
    </ThaiFontProvider>
  );
}
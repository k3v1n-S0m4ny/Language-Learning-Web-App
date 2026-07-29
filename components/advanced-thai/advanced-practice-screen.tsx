"use client";

import { useState } from "react";
import Link from "next/link";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { AtCardKind, AtPracticeCounts, AtStudyCard } from "@/lib/advanced-thai/types";
import { AdvancedReviewSession } from "./advanced-review-session";
import { ThaiFontProvider, type ThaiFont } from "./kit";

const KIND_LABEL: Record<AtCardKind, string> = {
  vocab: "Vocabulary",
  phrase: "Phrases",
};

// The client shell around a cross-theme practice-by-kind drill. Deliberate
// sibling of AdvancedStudyScreen (see queries.ts's header comment on why the
// duplication across this flow is not laziness) rather than a shared component
// with branching props — the two now differ in more than styling.
//
// THIS FLOW IS READ-ONLY AND HAS NO FINISH LINE. It writes no ladder state, so
// nothing here can climb, drop or come due; the pool never shrinks and the drill
// never ends. That is why there is no Left/Repeats pair, no round-complete
// screen, and no `?since=` session identity in the URL — none of them have
// anything to measure. What is left to say is how big the pool is and how many
// cards this sitting has been through, and the second of those is client state
// because it belongs to the sitting rather than to the database.
//
// Holds the letterform choice for the same reason AdvancedStudyScreen does: it
// must outlive the individual card, which AdvancedReviewSession does not (it
// remounts on every answer, keyed by card.id).
export function AdvancedPracticeScreen({
  kind,
  counts,
  card,
}: {
  kind: AtCardKind;
  counts: AtPracticeCounts;
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
            {KIND_LABEL[kind]} · practice
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
            Drilling{" "}
            <b className="font-semibold tabular-nums text-foreground">{counts.poolSize}</b> cards
          </span>
          <span aria-hidden className="text-foreground-muted/50">
            ·
          </span>
          <span>nothing recorded</span>
        </p>

        <div className="flex w-full flex-1 flex-col items-center justify-center">
          {card ? (
            <AdvancedReviewSession key={card.id} card={card} mode="practice" />
          ) : (
            <NothingToPractice kind={kind} />
          )}
        </div>
      </main>
    </ThaiFontProvider>
  );
}

// The only empty state this flow has. A drill over an existing pool cannot run
// out — the draw is random and with replacement — so the sole way to reach a null
// card is for the pool to be empty in the first place.
function NothingToPractice({ kind }: { kind: AtCardKind }) {
  const label = KIND_LABEL[kind].toLowerCase();

  return (
    <div className="glass flex w-full max-w-md flex-col items-center gap-2 rounded-[var(--r-lg)] p-8 text-center animate-slide-up-fade">
      <p className="text-lg font-semibold text-foreground">Nothing to practice yet</p>
      <p className="text-sm text-foreground-muted">
        No {label} cards have been introduced in any theme yet. Study a theme first, then come
        back here.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-[var(--r-pill)] border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-background hover:text-foreground"
      >
        Back to themes
      </Link>
    </div>
  );
}

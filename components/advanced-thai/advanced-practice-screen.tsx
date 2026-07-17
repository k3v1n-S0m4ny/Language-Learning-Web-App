"use client";

import { useState } from "react";
import Link from "next/link";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { AtCardKind, AtPracticeCounts, AtStudyCard } from "@/lib/advanced-thai/types";
import type { IntervalHints } from "@/lib/review/types";
import { AdvancedReviewSession } from "./advanced-review-session";
import { ThaiFontProvider, type ThaiFont } from "./kit";

const KIND_LABEL: Record<AtCardKind, string> = {
  vocab: "Vocabulary",
  grammar: "Grammar",
  phrase: "Phrases",
};

// The client shell around a cross-theme practice-by-kind session. Deliberate
// sibling of AdvancedStudyScreen (see queries.ts's header comment on why the
// duplication across this flow is not laziness) rather than a shared
// component with branching props — the counts shape genuinely differs
// (remaining/repeats vs due/new) and so does the empty state (no top-up here:
// this flow never introduces an unseen card, so there is nothing to top up).
//
// Holds the same two things AdvancedStudyScreen holds outside the card
// (letterform choice + the counts header/way out) for the same reason: both
// must outlive the individual card, which AdvancedReviewSession does not
// (it remounts on every rating, keyed by card.id).
export function AdvancedPracticeScreen({
  kind,
  counts,
  card,
  hints,
}: {
  kind: AtCardKind;
  counts: AtPracticeCounts;
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
            Left <b className="font-semibold tabular-nums text-foreground">{counts.remaining}</b>
          </span>
          <span aria-hidden className="text-foreground-muted/50">
            ·
          </span>
          <span>
            Repeats{" "}
            <b className="font-semibold tabular-nums text-foreground">{counts.repeatCount}</b>
          </span>
        </p>

        <div className="flex w-full flex-1 flex-col items-center justify-center">
          {card && hints ? (
            <AdvancedReviewSession key={card.id} card={card} hints={hints} />
          ) : (
            <PracticeComplete kind={kind} poolSize={counts.poolSize} />
          )}
        </div>
      </main>
    </ThaiFontProvider>
  );
}

// Advanced Thai's per-theme AllCaughtUp has a top-up CTA because that flow can
// legitimately be short on cards (the daily cap). This flow cannot: the pool
// is fixed to already-introduced cards, and there is no unseen-card cap to
// raise — so there is deliberately no button here, only a way out.
function PracticeComplete({ kind, poolSize }: { kind: AtCardKind; poolSize: number }) {
  const label = KIND_LABEL[kind].toLowerCase();

  return (
    <div className="glass flex w-full max-w-md flex-col items-center gap-2 rounded-[var(--r-lg)] p-8 text-center animate-slide-up-fade">
      {poolSize > 0 ? (
        <>
          <p className="text-lg font-semibold text-foreground">Session complete</p>
          <p className="text-sm text-foreground-muted">
            You practiced all <b className="tabular-nums text-foreground">{poolSize}</b> {label}{" "}
            cards. Every rating counted toward the real schedule, same as the per-theme flow.
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold text-foreground">Nothing to practice yet</p>
          <p className="text-sm text-foreground-muted">
            No {label} cards have been introduced in any theme yet. Study a theme first, then come
            back here.
          </p>
        </>
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

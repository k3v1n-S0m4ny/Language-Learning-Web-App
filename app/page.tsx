import Link from "next/link";
import { auth } from "@/auth";
import { ensureLearnerSettings, getStudyScreenData } from "@/lib/review/queries";
import { EmptyState } from "@/components/empty-state";
import { LangSync } from "@/components/lang-sync";
import { ModeToggle } from "@/components/mode-toggle";
import { ReviewSession } from "@/components/review-session";
import { SessionHeader } from "@/components/session-header";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ThaiHome } from "@/components/thai/thai-home";

// The study screen: the whole product. proxy.ts guarantees a signed-in Learner here.
// Mode-aware (A3/A4): learner_settings.active_mode selects between this Mandarin
// flow (unchanged, default) and the Thai unit-map home.
export default async function Home() {
  const session = await auth();
  const learner = session?.user;
  const learnerId = learner?.id;

  if (!learnerId) {
    // proxy.ts redirects unauthenticated visitors; this is a defensive fallback.
    return null;
  }

  const settings = await ensureLearnerSettings(learnerId);

  if (settings.activeMode === "thai") {
    return (
      <>
        <LangSync activeMode="thai" />
        <ThaiHome learnerId={learnerId} learnerName={learner?.name} />
      </>
    );
  }

  const { counts, card, hints } = await getStudyScreenData(learnerId);

  return (
    <main className="flex min-h-dvh flex-col items-center gap-10 bg-background px-6 py-8">
      <LangSync activeMode="mandarin" />
      <div className="flex w-full max-w-2xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SessionHeader learnerName={learner?.name} counts={counts} />
          <ModeToggle activeMode="mandarin" />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/stats"
            className="rounded-full border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface"
          >
            Stats
          </Link>
          <SignOutButton />
        </div>
      </div>

      <div className="flex w-full flex-1 flex-col items-center justify-center">
        {card && hints ? (
          <ReviewSession key={card.id} card={card} hints={hints} />
        ) : (
          <EmptyState />
        )}
      </div>
    </main>
  );
}

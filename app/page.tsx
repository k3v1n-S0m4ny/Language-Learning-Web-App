import { auth } from "@/auth";
import { isRestrictedLearner } from "@/lib/access";
import { ensureLearnerSettings, getStudyScreenData } from "@/lib/review/queries";
import { EmptyState } from "@/components/empty-state";
import { LangSync } from "@/components/lang-sync";
import { ReviewSession } from "@/components/review-session";
import { SessionHeader } from "@/components/session-header";
import { TopBar } from "@/components/top-bar";
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
  // Restricted testers are scoped to Read-Thai — always show the Thai home,
  // whatever their stored active_mode is, so they never reach the Mandarin flow.
  const restricted = isRestrictedLearner(learner?.email);

  if (restricted || settings.activeMode === "thai") {
    return (
      <>
        <LangSync activeMode="thai" />
        <ThaiHome learnerId={learnerId} learnerName={learner?.name} restricted={restricted} />
      </>
    );
  }

  const { counts, card, hints } = await getStudyScreenData(learnerId);
  const inSession = Boolean(card && hints);

  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 page-gutter pb-[calc(5rem+var(--safe-bottom))] sm:pb-8">
      <LangSync activeMode="mandarin" />
      <TopBar
        activeMode="mandarin"
        learnerName={learner?.name}
        statsHref="/stats"
        receded={inSession}
      />
      <SessionHeader counts={counts} />

      <div className="flex w-full flex-1 flex-col items-center justify-center">
        {card && hints ? (
          <ReviewSession key={card.id} card={card} hints={hints} />
        ) : (
          <EmptyState gate={counts.gate} />
        )}
      </div>
    </main>
  );
}

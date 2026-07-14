import { auth } from "@/auth";
import { isRestrictedLearner } from "@/lib/access";
import { isAdvancedThaiLearner } from "@/lib/advanced-thai/access";
import { ensureLearnerSettings, getStudyScreenData } from "@/lib/review/queries";
import { AdvancedThaiHome } from "@/components/advanced-thai/advanced-thai-home";
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
  const advanced = isAdvancedThaiLearner(learner?.email);

  if (restricted || settings.activeMode === "thai") {
    return (
      <>
        <LangSync activeMode="thai" />
        <ThaiHome
          learnerId={learnerId}
          learnerName={learner?.name}
          restricted={restricted}
          showAdvancedThai={advanced}
        />
      </>
    );
  }

  // Advanced Thai (M16) — the owner's personal course. The allowlist is re-checked
  // here rather than trusted from the stored mode: setActiveMode already coerces a
  // non-allowlisted account away from "advanced-thai", but a row could still hold
  // that value from before an account was removed from the list, and the failure
  // mode of trusting it is a learner stranded on a course that 404s everywhere
  // else. Falling through to Mandarin is the safe direction.
  if (settings.activeMode === "advanced-thai" && isAdvancedThaiLearner(learner?.email)) {
    return (
      <>
        <LangSync activeMode="advanced-thai" />
        <AdvancedThaiHome learnerId={learnerId} learnerName={learner?.name} />
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
        showAdvancedThai={advanced}
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

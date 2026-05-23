import Link from "next/link";
import { auth } from "@/auth";
import { getStudyScreenData } from "@/lib/review/queries";
import { EmptyState } from "@/components/empty-state";
import { ReviewSession } from "@/components/review-session";
import { SessionHeader } from "@/components/session-header";
import { SignOutButton } from "@/components/sign-out-button";

// The study screen: the whole product. proxy.ts guarantees a signed-in Learner here.
export default async function Home() {
  const session = await auth();
  const learner = session?.user;
  const learnerId = learner?.id;

  if (!learnerId) {
    // proxy.ts redirects unauthenticated visitors; this is a defensive fallback.
    return null;
  }

  const { counts, card, hints } = await getStudyScreenData(learnerId);

  return (
    <main className="flex min-h-dvh flex-col items-center gap-10 bg-zinc-50 px-6 py-8 dark:bg-black">
      <div className="flex w-full max-w-2xl items-center justify-between gap-4">
        <SessionHeader learnerName={learner?.name} counts={counts} />
        <div className="flex items-center gap-2">
          <Link
            href="/stats"
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
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

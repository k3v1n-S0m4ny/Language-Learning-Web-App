import { notFound, redirect, RedirectType } from "next/navigation";
import { auth } from "@/auth";
import { isAdvancedThaiLearner } from "@/lib/advanced-thai/access";
import { getAdvancedPracticeData } from "@/lib/advanced-thai/queries";
import { AT_CARD_KINDS, type AtCardKind } from "@/lib/advanced-thai/types";
import { startOfThailandDay } from "@/lib/review/time";
import { AdvancedPracticeScreen } from "@/components/advanced-thai/advanced-practice-screen";
import { LangSync } from "@/components/lang-sync";

// Cross-theme practice by card type — one kind's pool, every theme, random
// order. `practice` is a reserved static segment: it beats the `[theme]`
// dynamic sibling, so no theme may ever be seeded with that slug (a bare
// `/advanced-thai/practice` falls into `[theme]`, fails the theme lookup, and
// 404s — which is the correct outcome, not a bug to fix here).
//
// Same allowlist guard and notFound() (not a redirect, not an access-denied
// page) as app/advanced-thai/[theme]/page.tsx — see that file's comment.
export default async function AdvancedThaiPractice({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const learner = session?.user;
  const learnerId = learner?.id;

  if (!learnerId || !isAdvancedThaiLearner(learner?.email)) notFound();

  const { kind: kindParam } = await params;
  if (!AT_CARD_KINDS.includes(kindParam as AtCardKind)) notFound();
  const kind = kindParam as AtCardKind;

  const now = new Date();
  const sinceParam = (await searchParams).since;
  const sinceRaw = Array.isArray(sinceParam) ? sinceParam[0] : sinceParam;
  const sinceMs = sinceRaw === undefined ? NaN : Number(sinceRaw);

  // Validity guard: `since` must be a finite integer, no later than now, and no
  // earlier than the start of today's Thailand day — anything else (missing,
  // malformed, stale from a previous day) mints a fresh session. Server clock
  // only; `lastReview` is also server-stamped, so there is no clock skew to
  // reconcile against a client-supplied timestamp.
  const isValidSince =
    Number.isInteger(sinceMs) &&
    sinceMs <= now.getTime() &&
    sinceMs >= startOfThailandDay(now).getTime();

  if (!isValidSince) {
    redirect(`/advanced-thai/practice/${kind}?since=${now.getTime()}`, RedirectType.replace);
  }

  const { counts, card, hints } = await getAdvancedPracticeData(
    learnerId,
    kind,
    new Date(sinceMs),
    now,
  );

  return (
    <>
      <LangSync activeMode="advanced-thai" />
      <AdvancedPracticeScreen kind={kind} counts={counts} card={card} hints={hints} />
    </>
  );
}

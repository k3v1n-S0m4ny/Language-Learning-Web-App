import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdvancedThaiLearner } from "@/lib/advanced-thai/access";
import { getAdvancedPracticeData } from "@/lib/advanced-thai/queries";
import { AT_CARD_KINDS, type AtCardKind } from "@/lib/advanced-thai/types";
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
//
// The `?since=` timestamp this route used to mint and validate is GONE. It
// existed to give a write-through practice session a boundary, so the server
// could tell "already practiced this sitting" from "practiced on an earlier day".
// Practice writes nothing now, so it has no sitting to identify and no repeat
// queue to track — the URL is just the kind.
export default async function AdvancedThaiPractice({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const session = await auth();
  const learner = session?.user;
  const learnerId = learner?.id;

  if (!learnerId || !isAdvancedThaiLearner(learner?.email)) notFound();

  const { kind: kindParam } = await params;
  if (!AT_CARD_KINDS.includes(kindParam as AtCardKind)) notFound();
  const kind = kindParam as AtCardKind;

  const { counts, card } = await getAdvancedPracticeData(learnerId, kind);

  return (
    <>
      <LangSync activeMode="advanced-thai" />
      <AdvancedPracticeScreen kind={kind} counts={counts} card={card} />
    </>
  );
}

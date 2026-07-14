import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdvancedThaiLearner } from "@/lib/advanced-thai/access";
import { getAdvancedStudyData } from "@/lib/advanced-thai/queries";
import { db } from "@/lib/db";
import { atThemes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AdvancedStudyScreen } from "@/components/advanced-thai/advanced-study-screen";
import { LangSync } from "@/components/lang-sync";

// One theme's study session.
//
// The guard is server-side and returns notFound() — not a redirect and not a
// "you don't have access" page. Advanced Thai is the owner's personal course, and
// an account that is not on the allowlist should not be able to learn that this
// route exists at all, let alone that there is something behind it.
export default async function AdvancedThaiTheme({
  params,
}: {
  params: Promise<{ theme: string }>;
}) {
  const session = await auth();
  const learner = session?.user;
  const learnerId = learner?.id;

  if (!learnerId || !isAdvancedThaiLearner(learner?.email)) notFound();

  const { theme: slug } = await params;

  const [theme] = await db.select().from(atThemes).where(eq(atThemes.id, slug));
  if (!theme) notFound();

  const { counts, card, hints } = await getAdvancedStudyData(learnerId, slug);

  return (
    <>
      <LangSync activeMode="advanced-thai" />
      <AdvancedStudyScreen
        themeTitle={`${theme.titleThai} · ${theme.titleEnglish}`}
        counts={counts}
        card={card}
        hints={hints}
      />
    </>
  );
}

import { getUnitSummaries } from "@/lib/thai/queries";
import { TopBar } from "@/components/top-bar";
import { UnitRow } from "./unit-row";

// Thai-mode home screen (A4): the 14-unit vertical map replaces the Mandarin
// study screen entirely when learner_settings.active_mode = 'thai'. Phase 2:
// the inline header row is replaced by the shared floating glass <TopBar>
// (already renders the Thai "สวัสดี" greeting); no bg-background on <main> so
// the ambient mesh shows through, matching the Mandarin home (app/page.tsx).
export async function ThaiHome({
  learnerId,
  learnerName,
}: {
  learnerId: string;
  learnerName: string | null | undefined;
}) {
  const units = await getUnitSummaries(learnerId);

  return (
    <main className="flex min-h-dvh flex-col items-center gap-8 px-6 py-8">
      <TopBar activeMode="thai" learnerName={learnerName} statsHref="/thai/stats" />

      <div className="flex w-full max-w-2xl flex-col gap-3">
        <h1 className="text-display text-foreground">Read Thai</h1>
        {units.map((summary) => (
          <UnitRow key={summary.unit} summary={summary} />
        ))}
      </div>
    </main>
  );
}

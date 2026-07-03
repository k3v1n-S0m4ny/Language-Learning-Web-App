import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { buildDrillRound } from "@/lib/thai/drill";
import { getUnitSummaries } from "@/lib/thai/queries";
import { UNIT_TITLES } from "@/seed/thai/items";
import { DrillSession } from "@/components/thai/drill/drill-session";

const DRILLABLE_UNITS = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

export default async function ThaiDrillPage({
  params,
}: {
  params: Promise<{ unit: string }>;
}) {
  const { unit: unitParam } = await params;
  const unit = Number(unitParam);

  if (!Number.isInteger(unit) || !DRILLABLE_UNITS.has(unit)) {
    notFound();
  }

  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) return null;

  const summaries = await getUnitSummaries(learnerId);
  const current = summaries.find((s) => s.unit === unit);
  const nextUnitWasUnlocked = summaries.find((s) => s.unit === unit + 1)?.unlocked ?? false;

  if (!current?.unlocked) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-4 bg-background px-6 py-8 text-center">
        <p className="text-sm text-foreground-muted">
          Unit {unit} is still locked — reach 90% on the previous unit first.
        </p>
        <Link
          href="/"
          className="rounded-full border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface"
        >
          Back to units
        </Link>
      </main>
    );
  }

  const round = await buildDrillRound(learnerId, unit);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 bg-background px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="rounded-full border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface"
        >
          Back to units
        </Link>
        <Link
          href={`/thai/${unit}/lesson`}
          className="rounded-full border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface"
        >
          Review lesson
        </Link>
      </div>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
          Unit {unit} · Drill
        </div>
        <h1 className="text-xl font-semibold text-foreground">{UNIT_TITLES[unit]}</h1>
      </div>

      <DrillSession
        unit={unit}
        questions={round.questions}
        nextUnitWasUnlocked={nextUnitWasUnlocked}
      />
    </main>
  );
}

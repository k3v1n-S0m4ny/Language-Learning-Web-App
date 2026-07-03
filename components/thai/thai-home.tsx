import Link from "next/link";
import { getUnitSummaries } from "@/lib/thai/queries";
import { ModeToggle } from "@/components/mode-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UnitRow } from "./unit-row";

// Thai-mode home screen (A4): the 14-unit vertical map replaces the Mandarin
// study screen entirely when learner_settings.active_mode = 'thai'.
export async function ThaiHome({
  learnerId,
  learnerName,
}: {
  learnerId: string;
  learnerName: string | null | undefined;
}) {
  const units = await getUnitSummaries(learnerId);

  return (
    <main className="flex min-h-dvh flex-col items-center gap-8 bg-background px-6 py-8">
      <div className="flex w-full max-w-2xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-foreground-muted">
            สวัสดี{learnerName ? `, ${learnerName}` : ""}
          </span>
          <ModeToggle activeMode="thai" />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/thai/stats"
            className="rounded-full border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface"
          >
            Stats
          </Link>
          <SignOutButton />
        </div>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-3">
        <h1 className="text-lg font-semibold text-foreground">Read Thai</h1>
        {units.map((summary) => (
          <UnitRow key={summary.unit} summary={summary} />
        ))}
      </div>
    </main>
  );
}

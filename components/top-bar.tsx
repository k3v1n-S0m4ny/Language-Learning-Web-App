import Link from "next/link";
import type { ActiveMode } from "@/lib/thai/types";
import { ModeToggle } from "./mode-toggle";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./ui/theme-toggle";

// Floating glass top bar (Phase 1: Mandarin; Phase 2: wired into ThaiHome
// too). Sticky over the ambient mesh; recedes (dims) while a review/drill
// session is in progress, restoring on hover/focus so the controls are
// never truly unreachable. Renders either language's greeting based on
// `activeMode`.
export function TopBar({
  activeMode,
  learnerName,
  statsHref,
  receded = false,
  showModeToggle = true,
}: {
  activeMode: ActiveMode;
  learnerName: string | null | undefined;
  statsHref: string;
  /** True while a Card/drill is actively being studied — dims the bar. */
  receded?: boolean;
  /** False hides the Mandarin/Thai switch (restricted testers have no Mandarin). */
  showModeToggle?: boolean;
}) {
  return (
    <header
      className={`glass sticky top-3 z-20 flex w-full max-w-2xl items-center gap-1 rounded-[var(--r-pill)] px-2 py-2 pl-2 transition-opacity duration-500 sm:gap-3 sm:pl-4 ${
        receded ? "opacity-50 hover:opacity-100 focus-within:opacity-100" : "opacity-100"
      }`}
    >
      <span className="hidden min-w-0 items-center gap-1.5 truncate text-sm font-semibold tracking-tight text-foreground sm:flex">
        {activeMode === "mandarin" ? (
          <span className="font-hanzi text-base">你好</span>
        ) : (
          <span>สวัสดี</span>
        )}
        {learnerName ? `, ${learnerName}` : ""}
      </span>
      <span className="hidden flex-1 sm:block" />
      {showModeToggle && <ModeToggle activeMode={activeMode} />}
      <ThemeToggle />
      <Link
        href={statsHref}
        className="rounded-[var(--r-pill)] px-2 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-foreground sm:px-3"
      >
        Stats
      </Link>
      <SignOutButton variant="ghost" />
    </header>
  );
}

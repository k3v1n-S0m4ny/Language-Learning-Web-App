import Link from "next/link";
import type { ActiveMode } from "@/lib/thai/types";
import { ModeToggle } from "./mode-toggle";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./ui/theme-toggle";

// Floating glass top bar (Phase 1). Sticky over the ambient mesh; recedes
// (dims) while a review/drill session is in progress, restoring on
// hover/focus so the controls are never truly unreachable. Only the
// Mandarin greeting is wired here — Thai's own header stays untouched
// (Phase 2 per the build-order plan).
export function TopBar({
  activeMode,
  learnerName,
  statsHref,
  receded = false,
}: {
  activeMode: ActiveMode;
  learnerName: string | null | undefined;
  statsHref: string;
  /** True while a Card/drill is actively being studied — dims the bar. */
  receded?: boolean;
}) {
  return (
    <header
      className={`glass sticky top-3 z-20 flex w-full max-w-2xl items-center gap-3 rounded-[var(--r-pill)] px-2 py-2 pl-4 transition-opacity duration-500 ${
        receded ? "opacity-50 hover:opacity-100 focus-within:opacity-100" : "opacity-100"
      }`}
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
        {activeMode === "mandarin" ? (
          <span className="font-hanzi text-base">你好</span>
        ) : (
          <span>สวัสดี</span>
        )}
        {learnerName ? `, ${learnerName}` : ""}
      </span>
      <span className="flex-1" />
      <ModeToggle activeMode={activeMode} />
      <ThemeToggle />
      <Link
        href={statsHref}
        className="rounded-[var(--r-pill)] px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-foreground"
      >
        Stats
      </Link>
      <SignOutButton variant="ghost" />
    </header>
  );
}

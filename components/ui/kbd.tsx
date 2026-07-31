import type { ReactNode } from "react";

/**
 * A keyboard key cap.
 *
 * Hidden below `sm:` by default — the house pattern for desktop-only chrome
 * (components/top-bar.tsx, components/ui/theme-toggle.tsx) — because a key hint
 * on a phone is a label for something that cannot be done. The LISTENER stays
 * active at every width regardless (see lib/ux/keyboard.ts), so an iPad with a
 * keyboard attached still works; it just is not advertised.
 *
 * `currentColor` on the border, so a cap sitting inside a filled button (the
 * green/clay answer feedback, the rate ramp) picks up that button's pinned ink
 * instead of needing a variant per fill.
 */
export function Kbd({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      aria-hidden
      className={`hidden shrink-0 select-none items-center justify-center rounded-[6px] border border-current px-1 font-mono text-[11px] font-normal leading-none opacity-60 sm:inline-flex sm:h-5 sm:min-w-5 ${className}`}
    >
      {children}
    </kbd>
  );
}

"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import type { ActiveMode } from "@/lib/thai/types";
import { useSessionActive } from "@/lib/ux/session-focus";
import { ModeToggle } from "./mode-toggle";
import { ThemeToggle } from "./ui/theme-toggle";
import { HapticsToggle, SoundToggle } from "./ux-toggles";

// Persistent mobile bottom nav (Phase 4). Mobile-only (sm:hidden) — the desktop
// TopBar owns the two home screens at >=640px, so this is its mobile counterpart
// with no duplicate controls. Kills the dead-end pages (stats, lesson, drill)
// that previously offered only a single "back" link.
//
// Mode is read from <html data-lang> (set by <LangSync> on every page) via
// useSyncExternalStore on a `langchange` event, so the server root layout needs
// no per-route mode query to mount this. The SignOutButton is a server
// component (its sign-out server action), so it is passed in as a prop from the
// server layout rather than imported here.

function subscribeLang(callback: () => void) {
  window.addEventListener("langchange", callback);
  return () => window.removeEventListener("langchange", callback);
}

function getLang(): ActiveMode {
  const lang = document.documentElement.dataset.lang;
  if (lang === "thai") return "thai";
  if (lang === "advanced-thai") return "advanced-thai";
  return "mandarin";
}

type TabKey = "study" | "progress" | "menu";

export function BottomNav({
  signOut,
  showModeToggle = true,
  showAdvancedThai = false,
}: {
  signOut: ReactNode;
  /** False hides the Mandarin/Thai switch (restricted testers have no Mandarin). */
  showModeToggle?: boolean;
  /** True adds the "Advanced" segment to the mode toggle (owner-only, M16). */
  showAdvancedThai?: boolean;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const sessionActive = useSessionActive();
  const mode = useSyncExternalStore<ActiveMode>(subscribeLang, getLang, () => "mandarin");
  const [menuOpen, setMenuOpen] = useState(false);

  // Advanced Thai has no stats page yet (M16/B5 ships the theme picker and the
  // review session only), so it gets no Progress tab rather than a tab that
  // 404s. Its theme picker carries the per-theme counts in the meantime.
  const progressHref =
    mode === "advanced-thai" ? null : mode === "thai" ? "/thai/stats" : "/stats";
  const isProgress = pathname === "/stats" || pathname === "/thai/stats";
  const active: TabKey = menuOpen ? "menu" : isProgress ? "progress" : "study";

  return (
    <>
      {/* Tap-away backdrop for the menu popover. */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 sm:hidden"
        />
      )}

      <nav
        aria-label="Primary"
        className={`glass fixed inset-x-3 bottom-3 z-40 flex items-stretch gap-1 rounded-[var(--r-pill)] p-1 transition-opacity duration-500 sm:hidden ${
          sessionActive
            ? "opacity-50 hover:opacity-100 focus-within:opacity-100"
            : "opacity-100"
        }`}
        style={{ paddingBottom: "calc(0.25rem + var(--safe-bottom))" }}
      >
        <TabButton active={active === "study"} indicatorId="bottom-nav-ind" reduceMotion={reduceMotion} asLink href="/">
          <TabLabel icon="◆" label="Study" />
        </TabButton>
        {progressHref && (
          <TabButton
            active={active === "progress"}
            indicatorId="bottom-nav-ind"
            reduceMotion={reduceMotion}
            asLink
            href={progressHref}
          >
            <TabLabel icon="▲" label="Progress" />
          </TabButton>
        )}
        <TabButton
          active={active === "menu"}
          indicatorId="bottom-nav-ind"
          reduceMotion={reduceMotion}
          onClick={() => setMenuOpen((v) => !v)}
          expanded={menuOpen}
        >
          <TabLabel icon="≡" label="Menu" />
        </TabButton>
      </nav>

      {/* Menu popover — glass card floating above the nav. */}
      {menuOpen && (
        <div
          role="dialog"
          aria-label="Settings menu"
          className="glass glass-strong fixed inset-x-3 bottom-[4.75rem] z-40 flex flex-col gap-4 rounded-[var(--r-lg)] p-4 animate-slide-up-fade sm:hidden"
          style={{ marginBottom: "var(--safe-bottom)" }}
        >
          {showModeToggle && (
            <MenuRow label="Language">
              <ModeToggle activeMode={mode} showAdvancedThai={showAdvancedThai} />
            </MenuRow>
          )}
          <MenuRow label="Theme">
            <ThemeToggle />
          </MenuRow>
          <MenuRow label="Haptics">
            <HapticsToggle />
          </MenuRow>
          <MenuRow label="Sound">
            <SoundToggle />
          </MenuRow>
          <div className="flex justify-end pt-1">{signOut}</div>
        </div>
      )}
    </>
  );
}

function MenuRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function TabLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="relative z-[1] flex flex-col items-center gap-0.5">
      <span aria-hidden className="text-base leading-none">
        {icon}
      </span>
      <span className="text-[0.65rem] font-medium leading-none">{label}</span>
    </span>
  );
}

type TabButtonProps = {
  active: boolean;
  indicatorId: string;
  reduceMotion: boolean | null;
  children: ReactNode;
} & (
  | { asLink: true; href: string; onClick?: never; expanded?: never }
  | { asLink?: false; href?: never; onClick: () => void; expanded?: boolean }
);

function TabButton({ active, indicatorId, reduceMotion, children, ...rest }: TabButtonProps) {
  const inner = (
    <>
      {active && (
        <motion.span
          aria-hidden
          layoutId={indicatorId}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 32 }}
          className="absolute inset-0 z-0 rounded-[var(--r-pill)] bg-[var(--glass-bg-strong)] shadow-[inset_0_1px_0_0_var(--glass-spec)]"
        />
      )}
      {children}
    </>
  );

  const shared = `relative flex min-h-[3rem] flex-1 items-center justify-center rounded-[var(--r-pill)] px-2 py-1.5 transition-colors ${
    active ? "text-foreground" : "text-foreground-muted hover:text-foreground"
  }`;

  if (rest.asLink) {
    return (
      <Link href={rest.href} className={shared} aria-current={active ? "page" : undefined}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={rest.onClick} aria-expanded={rest.expanded} className={shared}>
      {inner}
    </button>
  );
}

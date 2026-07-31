import type { ReactNode } from "react";
import { Kbd } from "@/components/ui/kbd";

// The desktop edge rails of the theatre layout.
//
// They exist because the session's own context was the thing the mobile card had
// nowhere to put: the round counts live in a single 12px line above the card
// (AdvancedStudyScreen), and on a 1440px screen that line is a rounding error
// next to 900px of empty gutter. The rails move it into the gutter and give it
// room to be read at a glance, without taking a pixel from the card.
//
// Everything here is `hidden lg:flex`, so below 1024px this file renders nothing
// at all and the mobile card is exactly what it always was. The screens keep
// their inline count line and hide IT at lg: — the two never show at once.
//
// The rails are NOT glass. They sit beside script rather than floating over it,
// and the one rule repeated in every card comment in this codebase is that glass
// never goes behind reading surfaces. Bare text on the page background is the
// right weight for chrome that must not compete with the card.

/**
 * A rail column. `side` picks which of the theatre grid's outer tracks it
 * occupies and which way its content is justified — the right rail is
 * right-aligned so both rails hug the card rather than the window.
 */
export function StageRail({ side, children }: { side: "left" | "right"; children: ReactNode }) {
  return (
    <aside
      className={`hidden lg:flex lg:row-span-full lg:flex-col lg:gap-5 lg:pt-2 ${
        side === "left" ? "lg:col-start-1" : "lg:col-start-3 lg:items-end lg:text-right"
      }`}
    >
      {children}
    </aside>
  );
}

/** One labelled figure. `tabular-nums` so a count changing does not reflow it. */
export function RailStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground-muted">
        {label}
      </span>
      <span className="text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

/** A hairline between rail groups. */
export function RailRule() {
  return <hr className="w-full border-0 border-t border-border-base" />;
}

/**
 * The standing key legend.
 *
 * It is driven by the caller rather than hardcoded because the bindings genuinely
 * change with the step — a multiple-choice card has 1-4 and no reveal, a flip
 * card has the reverse — and a legend advertising a key that is not bound right
 * now is worse than no legend.
 */
export function KeyLegend({ rows }: { rows: { keys: string; action: string }[] }) {
  return (
    <div className="flex flex-col items-end gap-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground-muted">
        Keys
      </span>
      <div className="flex flex-col items-end gap-1.5">
        {rows.map((row) => (
          <span
            key={row.action}
            className="flex items-center gap-2 text-xs leading-none text-foreground-muted"
          >
            {row.action}
            <Kbd className="!border-border-base !opacity-100">{row.keys}</Kbd>
          </span>
        ))}
      </div>
    </div>
  );
}

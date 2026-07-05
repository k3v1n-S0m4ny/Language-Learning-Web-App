import type { ReactNode } from "react";
import type { ConsonantItem } from "@/seed/thai/types";
import { ConsonantTable } from "./consonant-table";

// Shared shell for the class-by-class consonant units (2-5): a stack of carded
// prose sections over the muted-text-on-bg-surface treatment the units 9-14
// lessons use, wrapping the shared <ConsonantTable>. Each unit supplies its own
// class-specific copy; the layout, card styling, table block, and closing line
// are held here so units 3-5 fan out from unit 2 without copy-paste.
//
// - `intro`   : rendered above the sections (unit 2 passes <ThaiScriptHistory/>;
//               units 3+ pass nothing — the full history primer is one-time).
// - `sections`: the carded teaching sections, in order.
// - `callout` : an optional short per-unit aside (unit 3: the obsolete ฃ),
//               rendered just before the table so it frames what's in it.
// - `closing` : the free line under the table (its own styling, not a card).

export interface LessonSection {
  heading: string;
  body: ReactNode;
}

export function ConsonantClassLesson({
  items,
  tableHeading,
  sections,
  closing,
  intro,
  callout,
}: {
  items: ConsonantItem[];
  tableHeading: string;
  sections: LessonSection[];
  closing: ReactNode;
  intro?: ReactNode;
  callout?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      {intro}

      {sections.map((section) => (
        <section
          key={section.heading}
          className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-border-base bg-surface p-5"
        >
          <h2 className="text-sm font-semibold text-foreground">{section.heading}</h2>
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-foreground-muted">
            {section.body}
          </div>
        </section>
      ))}

      {callout}

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground-muted">{tableHeading}</h3>
        <ConsonantTable items={items} />
      </div>

      {closing}
    </div>
  );
}

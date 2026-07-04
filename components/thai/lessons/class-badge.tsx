import type { ConsonantClass } from "@/seed/thai/types";

// Glass-native class chips (Phase 2): near-black text on a lightened tint of
// each class hue in light mode, bright north-star hue + near-black text in
// dark mode — both AA-verified (see the table in globals.css). Same filled-
// chip treatment as before; only the palette changed.
const STYLES: Record<ConsonantClass, string> = {
  mid: "bg-thai-class-mid text-on-earthy",
  high: "bg-thai-class-high text-on-earthy",
  low: "bg-thai-class-low text-on-earthy",
};

export function ClassBadge({ consonantClass }: { consonantClass: ConsonantClass }) {
  return (
    <span
      className={`rounded-[var(--r-pill)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STYLES[consonantClass]}`}
    >
      {consonantClass}
    </span>
  );
}

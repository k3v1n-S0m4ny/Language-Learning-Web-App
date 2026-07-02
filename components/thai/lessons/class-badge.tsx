import type { ConsonantClass } from "@/seed/thai/types";

const STYLES: Record<ConsonantClass, string> = {
  mid: "bg-sage text-on-earthy",
  high: "bg-peach text-on-earthy",
  low: "bg-sand text-on-earthy",
};

export function ClassBadge({ consonantClass }: { consonantClass: ConsonantClass }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STYLES[consonantClass]}`}
    >
      {consonantClass}
    </span>
  );
}

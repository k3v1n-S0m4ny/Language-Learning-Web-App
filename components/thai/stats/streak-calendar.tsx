import type { StreakDay } from "@/lib/thai/stats";

// GitHub-style activity calendar, 12 weeks x 7 days, oldest-first columns.
export function StreakCalendar({ days }: { days: StreakDay[] }) {
  const weeks: StreakDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="flex gap-1 overflow-x-auto">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day) => (
            <div
              key={day.key}
              title={day.key}
              className={`h-3 w-3 rounded-sm ${
                day.hasActivity ? "bg-brand" : "bg-border-base opacity-50"
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

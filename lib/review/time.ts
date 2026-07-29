// Shared timezone helpers for Thailand (UTC+7, no DST).
// Both learners live in Thailand, so all "day" boundaries use Asia/Bangkok local
// midnight — never raw UTC midnight. This file is the single source of truth for
// that offset so callers don't each hard-code it.

export const THAILAND_OFFSET_MS = 7 * 60 * 60 * 1000;

// Returns the UTC instant that corresponds to 00:00 Asia/Bangkok on the same
// calendar day as `now`.  Works correctly even when `now` is passed as a
// server-rendered Date — no browser API is used.
export function startOfThailandDay(now: Date): Date {
  const thai = new Date(now.getTime() + THAILAND_OFFSET_MS);
  const thaiMidnightAsUtc = Date.UTC(
    thai.getUTCFullYear(),
    thai.getUTCMonth(),
    thai.getUTCDate(),
  );
  return new Date(thaiMidnightAsUtc - THAILAND_OFFSET_MS);
}

// endOfThailandDay used to live here. It existed for one reason: FSRS could
// schedule a card minutes into the future, so the queue had to reach past `now`
// to the end of the Bangkok day to pull same-day learning steps into the session.
// The ladder never schedules in minutes — a card still climbing is written
// `due = now` and a finished one goes at least a day out — so the batch is
// exactly `due <= now` and nothing needs the wider bound.

// Returns a "YYYY-MM-DD" string for the Thai calendar date of `now`.
// Used as a stable map key when bucketing rows by Thai day.
export function thaiDateKey(now: Date): string {
  const thai = new Date(now.getTime() + THAILAND_OFFSET_MS);
  const y = thai.getUTCFullYear();
  const m = String(thai.getUTCMonth() + 1).padStart(2, "0");
  const d = String(thai.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Returns a short "MMM D" label (e.g. "May 3") for a UTC instant, formatted
// in Asia/Bangkok local time.  Used for chart X-axis tick labels.
export function thaiShortLabel(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(now);
}

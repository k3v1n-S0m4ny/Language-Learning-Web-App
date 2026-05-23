// ts-fsrs wrapper. No database access here — pure scheduling. The full ts-fsrs Card
// is what we persist as `review_states.fsrs_card` (jsonb); this module is the only
// place that knows the ts-fsrs API shape.

import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  type Card,
  type FSRS,
  type ReviewLog,
} from "ts-fsrs";
import type { IntervalHints, RatingValue } from "./types";
import { REQUEST_RETENTION } from "./config";

export { createEmptyCard };
export type { Card };

// Build a scheduler using the global REQUEST_RETENTION constant.
export function getScheduler(): FSRS {
  return fsrs(generatorParameters({ request_retention: REQUEST_RETENTION }));
}

// jsonb round-trips Dates as ISO strings. Coerce them back before handing the
// stored card to ts-fsrs, which expects real Date objects.
export function hydrateFsrsCard(stored: unknown): Card {
  const card = stored as Card;
  return {
    ...card,
    due: new Date(card.due),
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  };
}

// Format the gap between `now` and a scheduled due date as a short label.
function formatInterval(now: Date, due: Date): string {
  const ms = due.getTime() - now.getTime();
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.round(months / 12)}y`;
}

// Preview the next interval for each of the four ratings, for the button hints.
export function previewIntervals(
  scheduler: FSRS,
  fsrsCard: Card,
  now: Date,
): IntervalHints {
  const preview = scheduler.repeat(fsrsCard, now);
  return {
    again: formatInterval(now, preview[Rating.Again].card.due),
    hard: formatInterval(now, preview[Rating.Hard].card.due),
    good: formatInterval(now, preview[Rating.Good].card.due),
    easy: formatInterval(now, preview[Rating.Easy].card.due),
  };
}

// Map our 1–4 RatingValue to the ts-fsrs Rating grade.
const RATING_BY_VALUE = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
} as const;

// Apply one rating, returning the updated card and the review log to persist.
export function applyRating(
  scheduler: FSRS,
  fsrsCard: Card,
  now: Date,
  rating: RatingValue,
): { card: Card; log: ReviewLog } {
  const { card, log } = scheduler.next(fsrsCard, now, RATING_BY_VALUE[rating]);
  return { card, log };
}

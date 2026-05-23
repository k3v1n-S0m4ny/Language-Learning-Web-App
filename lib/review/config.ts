// Global FSRS tuning constants for this app.
//
// REQUEST_RETENTION overrides the per-Learner `requestRetention` column (which
// is left in place in learner_settings but treated as vestigial). Centralising
// the value here means a single edit adjusts every scheduler call.
//
// LEECH_THRESHOLD: a card is a "leech" once it has been lapsed this many times,
// signalling it needs manual attention (re-author / add context). 7 matches the
// classic Anki default and the FSRS community recommendation for Chinese decks.

export const REQUEST_RETENTION = 0.85;
export const LEECH_THRESHOLD = 7;

// Derived helper — pure function, usable in both server and client modules.
// `fsrsCard` is the ts-fsrs Card shape stored in review_states.fsrs_card (jsonb).
export function isLeech(fsrsCard: { lapses: number }): boolean {
  return fsrsCard.lapses >= LEECH_THRESHOLD;
}

// Shared shapes for the Review UI. Only serializable display data crosses to the
// client — the ts-fsrs Card (stored as `fsrs_card` jsonb) stays server-side.

export type RatingValue = 1 | 2 | 3 | 4; // Again / Hard / Good / Easy (ts-fsrs Rating)

// One Word of a Card, ready to render. `audioUrl` is null when no Audio Clip exists.
export interface StudyWord {
  id: string;
  position: number;
  hanzi: string;
  gloss: string;
  pinyin: string;
  audioUrl: string | null;
}

// A Card prepared for study: the front Headword plus the revealed back data.
export interface StudyCard {
  id: string;
  headword: string;
  isPhrase: boolean;
  wholeGloss: string;
  wholePinyin: string;
  wholeAudioUrl: string | null;
  words: StudyWord[];
  tags: string[];
  /**
   * HSK 3.0 band, or null if the Card has no confident level. 1-6 as published;
   * 7 means the merged "HSK 7-9" advanced band (HSK does not subdivide it).
   */
  hskLevel: number | null;
  /** FSRS lapse count — 0 for cards never reviewed. Used for leech badge. */
  lapses: number;
}

// Why the HSK gate is currently withholding new Cards, if it is. Without this,
// `newRemaining: 0` is ambiguous between "daily cap reached" (come back tomorrow)
// and "next band locked" (master more of the band below), and the empty state
// cannot tell the Learner which.
export interface GateStatus {
  unlockedBand: number;
  /** The band that would open next, or null at the top of the ladder. */
  nextBand: number | null;
  /** The lowest band still under threshold — what actually blocks nextBand. */
  blockingBand: { band: number; mastered: number; required: number } | null;
  /**
   * Unseen Cards the gate would serve, BEFORE the daily cap is applied. Lets the
   * empty state tell "you've done today's new Cards" (cap) apart from "there are no
   * new Cards left to give you until you master more" (gate).
   */
  eligibleUnseen: number;
}

// Header counts for the current study session.
export interface SessionCounts {
  dueCount: number;
  /** Unseen Cards the gate will actually serve, capped by newCardsPerDay. */
  newRemaining: number;
  gate: GateStatus;
}

// Human-readable next-interval labels for the four rating controls (e.g. "10m", "1d").
export interface IntervalHints {
  again: string;
  hard: string;
  good: string;
  easy: string;
}

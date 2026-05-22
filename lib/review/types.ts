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
}

// Header counts for the current study session.
export interface SessionCounts {
  dueCount: number;
  newRemaining: number;
}

// Human-readable next-interval labels for the four rating controls (e.g. "10m", "1d").
export interface IntervalHints {
  again: string;
  hard: string;
  good: string;
  easy: string;
}

// Shape of the generated/edited deck (seed/<language>/deck.generated.json, e.g.
// seed/mandarin/deck.generated.json), shared by the seed scripts. Audio URLs are
// filled in by generate-audio.ts.

export interface DeckWord {
  position: number;
  hanzi: string;
  gloss: string;
  pinyin: string;
  audioUrl?: string;
}

export interface DeckCard {
  headword: string;
  isPhrase: boolean;
  wholeGloss: string;
  wholePinyin: string;
  tags: string[];
  words: DeckWord[];
  wholeAudioUrl?: string;
  /**
   * HSK 3.0 band. 1-6 as published; 7 means the merged "HSK 7-9" advanced band.
   * Assigned by scripts/level-hsk.ts against seed/mandarin/hsk30-wordlist.json.
   */
  hsk?: number;
}

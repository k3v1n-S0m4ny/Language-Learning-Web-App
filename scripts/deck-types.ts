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
}

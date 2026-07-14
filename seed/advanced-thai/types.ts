/**
 * Advanced Thai — the content contract.
 *
 * A "theme" is one source text (e.g. นักโฆษณา / advertiser). Every theme yields
 * three kinds of card, and these types are what the Phase-B extractor
 * (scripts/generate-advanced-thai-deck.ts) must emit and what the owner reviews
 * before anything is seeded.
 *
 * Deliberate design note on SPANS. The obvious encoding for "highlight this part
 * of the sentence" is a pair of character offsets. That is a trap in Thai: the
 * script stacks vowels and tone marks above and below the consonant line, so a
 * single perceived "letter" is often several UTF-16 code units, and an offset
 * pair is neither hand-authorable nor reviewable — you cannot look at
 * `[14, 22]` and tell whether it is right. So both the grammar examples and the
 * phrase chunks are encoded as ORDERED SEGMENT ARRAYS instead: the full Thai
 * string is simply the segments joined, and each segment carries its own role.
 * A reviewer reads the segments and immediately sees whether the split is
 * correct.
 */

// --- Vocabulary -------------------------------------------------------------

export type PartOfSpeech = "noun" | "verb" | "adj" | "adv" | "classifier";
export type Register = "formal" | "colloquial" | "technical";
export type MorphemeRole = "prefix" | "root" | "suffix";

export interface Morpheme {
  form: string;
  gloss: string;
  role: MorphemeRole;
}

export interface VocabEntry {
  thai: string;
  gloss: string;
  pos: PartOfSpeech;
  register: Register;
  /**
   * The word's morpheme-by-morpheme reading, when that differs from what it
   * actually means. นักโฆษณา parses as "one-who + advertising" but means
   * "advertiser" — worth showing. Omitted for words where the literal parse and
   * the meaning are the same, so the card does not waste a line saying nothing.
   */
  literal?: string;
  /** Single-morpheme words (loanwords especially) carry exactly one entry. */
  morphemes: Morpheme[];
}

// --- Grammar ----------------------------------------------------------------

/**
 * What the pattern DOES. Drives the --pattern-fn-* colour, which is threaded
 * through the frame, the slots, and the highlighted spans of every example, so
 * the abstract frame and its concrete realizations share one hue.
 */
export type PatternFunction =
  | "causative"
  | "passive"
  | "comparative"
  | "topic"
  | "connector"
  | "reciprocal";

/**
 * One segment of an example sentence. `slot` names which part of the frame this
 * segment realizes ("A", "B", "V"), or "marker" for the pattern word itself
 * (ทำให้, แข่งกัน, เพื่อ …). Segments with no `slot` are ordinary context and
 * render as plain ink.
 */
export interface ExampleSegment {
  text: string;
  slot?: string;
}

export interface GrammarExample {
  /** The full Thai sentence is `segments.map(s => s.text).join("")`. */
  segments: ExampleSegment[];
  gloss: string;
}

export interface GrammarPattern {
  /** The abstract frame, e.g. "ทำให้ + N + V". Slot names must match the example segments. */
  frame: string;
  fn: PatternFunction;
  /** What it does, in one plain-English line. No metalanguage. */
  plainEnglish: string;
  examples: GrammarExample[];
}

// --- Phrases ----------------------------------------------------------------

/**
 * Where in the source document a phrase came from. Not decoration: it is the
 * card's eyebrow, and it is also the audit trail proving the deck really does
 * cover the WHOLE text and not just the parts that were easy to lift.
 */
export type PhraseSource = "heading" | "prose" | "table" | "quote" | "label";

/**
 * One word of a phrase, mirroring the Mandarin `words` table exactly (hanzi →
 * thai, gloss → gloss). Punctuation is never a word — same rule the Mandarin
 * seed prompt enforces.
 */
export interface PhraseWord {
  thai: string;
  gloss: string;
}

/**
 * A PHRASE is one space-delimited clause of the source document.
 *
 * This is the load-bearing definition, so it is worth being exact about. Thai
 * does not put spaces between words — it puts them between CLAUSES. So the
 * spaces already in the source are not typography we should discard; they are
 * the author telling us where one phrase ends and the next begins. Splitting on
 * them turns this document's 56 lines into 122 phrase units of median 24 and
 * maximum 71 Thai characters — every one of which fits on a card at a readable
 * size. Not splitting on them leaves paragraphs of up to 439 characters, which
 * no flashcard can hold.
 */
export interface PhraseEntry {
  /** The clause, verbatim and unspaced, exactly as it appears in the source. */
  thai: string;
  gloss: string;
  /**
   * The clause segmented into words. `words.map(w => w.thai).join("")` must
   * reproduce `thai` minus its punctuation.
   *
   * This row is doing more work in Thai than its Mandarin counterpart does. On a
   * Mandarin card the word row is a convenience — the reader can already see the
   * character boundaries. Here the front face has NO spaces at all, so the word
   * row is the answer to a question the front actually asked: where do the words
   * end? Segmentation is the skill that separates an intermediate reader from a
   * fluent one, and this is where it gets taught.
   */
  words: PhraseWord[];
  source: PhraseSource;
  /** Human-readable provenance, e.g. "Step 2 · Market research". */
  context?: string;
}

// --- Theme ------------------------------------------------------------------

export interface Theme {
  /** Stable slug, used as the deck key. */
  slug: string;
  titleThai: string;
  titleEnglish: string;
  /** The source text's own one-line definition of the occupation. */
  summary: string;
  vocab: VocabEntry[];
  grammar: GrammarPattern[];
  phrases: PhraseEntry[];
}

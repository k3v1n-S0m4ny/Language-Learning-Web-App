/**
 * Per-language seed config registry — the single source of truth for the seed
 * pipeline's per-language paths and prompts (scripts/generate-deck.ts,
 * scripts/generate-audio.ts, scripts/seed-db.ts).
 *
 * To add a language:
 *   1. Create seed/<language>/source.csv (headword, English gloss).
 *   2. Add a LanguageConfig entry for it in LANGUAGES below (systemPrompt,
 *      ttsInstructions, sectionTags, defaultTag).
 *   3. Run the pipeline with SEED_LANG=<language> (see README "Adding a language").
 *
 * SEED_LANG (not LANG — that's a POSIX locale variable) selects the language at
 * invocation time; it defaults to "mandarin" so existing behavior is unchanged.
 */
import path from "node:path";

export type LanguageKey = "mandarin" | "thai" | "french" | "japanese";

export interface LanguageConfig {
  key: LanguageKey;
  dir: string;
  sourceCsv: string;
  deckJson: string;
  systemPrompt: string;
  ttsInstructions: string;
  sectionTags: Record<string, string>;
  defaultTag: string;
}

// Only configured languages get an entry here — no placeholder/stub configs for
// languages that haven't been built yet (thai/french/japanese land later).
export const LANGUAGES: Partial<Record<LanguageKey, LanguageConfig>> = {
  mandarin: {
    key: "mandarin",
    dir: path.join("seed", "mandarin"),
    sourceCsv: path.join("seed", "mandarin", "source.csv"),
    deckJson: path.join("seed", "mandarin", "deck.generated.json"),
    systemPrompt: `You are a Mandarin Chinese teaching assistant. Given a Chinese headword and its English meaning, return JSON describing it for a flashcard:
- wholePinyin: Hanyu Pinyin with tone marks for the entire headword (omit punctuation).
- isPhrase: true if the headword is more than one word (a sentence or multi-word expression), false if it is a single word.
- words: the headword segmented into individual Chinese words, in order. For each word give: hanzi (its characters, no punctuation), gloss (a concise English meaning of that word as used here), pinyin (Hanyu Pinyin with tone marks). For a single-word headword return exactly one entry equal to the whole word. Never output punctuation marks as words.`,
    ttsInstructions:
      "Speak slowly and clearly, in standard Mandarin Chinese, with a neutral, friendly teaching tone.",
    sectionTags: {
      "数字与数量": "numbers & amounts",
      "时间与日期": "time & dates",
      "金钱": "money",
      "交通出行": "getting around",
      "买票": "tickets",
      "询问帮助": "asking for help",
      "座位与卧铺": "seats & berths",
      "售票窗口": "at the ticket window",
      "车上设施与改票": "amenities & ticket changes",
      "行李": "luggage",
      "飞机": "plane",
      "公共汽车": "bus & coach",
      "地铁与火车": "subway & train",
      "船": "boat",
      "出租车与租车": "taxi & hire car",
      "自行车": "bicycle",
      "自行车零件": "bicycle parts",
      "朝代": "dynasties",
    },
    defaultTag: "languages difficulties",
  },
};

export function resolveLanguage(
  key: string = process.env.SEED_LANG ?? "mandarin",
): LanguageConfig {
  const config = LANGUAGES[key as LanguageKey];
  if (!config) {
    throw new Error(
      `Unknown/unconfigured SEED_LANG="${key}"; configured: ${Object.keys(LANGUAGES).join(", ")}`,
    );
  }
  return config;
}

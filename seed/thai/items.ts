// Read-Thai course content (M11), units 1-8. Single source of truth for both
// the lesson pages (app/thai/**) and the DB seed script
// (scripts/seed-thai-db.ts) — drills and progress reference these items by
// `id`. Everything here — Thai script, IPA, consonant class, acrophonic
// names/meanings, final-sound collapse, vowel forms, and example words — is
// taken verbatim from seed/thai/research/reading-thai-script.html. No values
// are invented; where the doc leaves a gap (e.g. only ~40 running examples
// for a curated word bank the product spec envisions at 80-120 words) this
// file stays smaller rather than fabricate additional Thai vocabulary — see
// the M11 implementation summary "Spec Deviations" section.
import type {
  ConsonantItem,
  FinalItem,
  LeaderWordItem,
  NumeralItem,
  PhraseItem,
  SpecialSignItem,
  SyllableItem,
  ThaiItem,
  ToneWordItem,
  VowelItem,
} from "./types";

// --- Unit 2: Mid-class consonants (9) ---------------------------------------
export const MID_CONSONANTS: ConsonantItem[] = [
  { kind: "consonant", id: "consonant:ก", unit: 2, display: "ก", initialIpa: "k", finalIpa: "k", consonantClass: "mid", drillable: true, metadata: { name: "ก ไก่", meaning: "chicken", nameIpa: "kɔ̄ː kàj" } },
  { kind: "consonant", id: "consonant:จ", unit: 2, display: "จ", initialIpa: "tɕ", finalIpa: "t", consonantClass: "mid", drillable: true, metadata: { name: "จ จาน", meaning: "plate", nameIpa: "tɕɔ̄ː tɕāːn" } },
  { kind: "consonant", id: "consonant:ฎ", unit: 2, display: "ฎ", initialIpa: "d", finalIpa: "t", consonantClass: "mid", drillable: true, metadata: { name: "ฎ ชฎา", meaning: "headdress", nameIpa: "dɔ̄ː tɕʰádāː" } },
  { kind: "consonant", id: "consonant:ฏ", unit: 2, display: "ฏ", initialIpa: "t", finalIpa: "t", consonantClass: "mid", drillable: true, metadata: { name: "ฏ ปฏัก", meaning: "goad", nameIpa: "tɔ̄ː pàtàk" } },
  { kind: "consonant", id: "consonant:ด", unit: 2, display: "ด", initialIpa: "d", finalIpa: "t", consonantClass: "mid", drillable: true, metadata: { name: "ด เด็ก", meaning: "child", nameIpa: "dɔ̄ː dèk" } },
  { kind: "consonant", id: "consonant:ต", unit: 2, display: "ต", initialIpa: "t", finalIpa: "t", consonantClass: "mid", drillable: true, metadata: { name: "ต เต่า", meaning: "turtle", nameIpa: "tɔ̄ː tàw" } },
  { kind: "consonant", id: "consonant:บ", unit: 2, display: "บ", initialIpa: "b", finalIpa: "p", consonantClass: "mid", drillable: true, metadata: { name: "บ ใบไม้", meaning: "leaf", nameIpa: "bɔ̄ː bāj máːj" } },
  { kind: "consonant", id: "consonant:ป", unit: 2, display: "ป", initialIpa: "p", finalIpa: "p", consonantClass: "mid", drillable: true, metadata: { name: "ป ปลา", meaning: "fish", spokenName: "ปอ ปลา", nameIpa: "pɔ̄ː plāː" } },
  { kind: "consonant", id: "consonant:อ", unit: 2, display: "อ", initialIpa: "ʔ", finalIpa: null, consonantClass: "mid", drillable: true, metadata: { name: "อ อ่าง", meaning: "basin", nameIpa: "ʔɔ̄ː ʔàːŋ" } },
];

// --- Unit 3: High-class consonants (11; ฃ shown, not drilled) --------------
export const HIGH_CONSONANTS: ConsonantItem[] = [
  { kind: "consonant", id: "consonant:ข", unit: 3, display: "ข", initialIpa: "kʰ", finalIpa: "k", consonantClass: "high", drillable: true, metadata: { name: "ข ไข่", meaning: "egg" } },
  { kind: "consonant", id: "consonant:ฃ", unit: 3, display: "ฃ", initialIpa: "kʰ", finalIpa: null, consonantClass: "high", drillable: false, metadata: { name: "ฃ ขวด", meaning: "bottle", obsolete: true } },
  { kind: "consonant", id: "consonant:ฉ", unit: 3, display: "ฉ", initialIpa: "tɕʰ", finalIpa: null, consonantClass: "high", drillable: true, metadata: { name: "ฉ ฉิ่ง", meaning: "cymbals" } },
  { kind: "consonant", id: "consonant:ฐ", unit: 3, display: "ฐ", initialIpa: "tʰ", finalIpa: "t", consonantClass: "high", drillable: true, metadata: { name: "ฐ ฐาน", meaning: "pedestal" } },
  { kind: "consonant", id: "consonant:ถ", unit: 3, display: "ถ", initialIpa: "tʰ", finalIpa: "t", consonantClass: "high", drillable: true, metadata: { name: "ถ ถุง", meaning: "sack" } },
  { kind: "consonant", id: "consonant:ผ", unit: 3, display: "ผ", initialIpa: "pʰ", finalIpa: null, consonantClass: "high", drillable: true, metadata: { name: "ผ ผึ้ง", meaning: "bee" } },
  { kind: "consonant", id: "consonant:ฝ", unit: 3, display: "ฝ", initialIpa: "f", finalIpa: null, consonantClass: "high", drillable: true, metadata: { name: "ฝ ฝา", meaning: "lid" } },
  { kind: "consonant", id: "consonant:ศ", unit: 3, display: "ศ", initialIpa: "s", finalIpa: "t", consonantClass: "high", drillable: true, metadata: { name: "ศ ศาลา", meaning: "pavilion" } },
  { kind: "consonant", id: "consonant:ษ", unit: 3, display: "ษ", initialIpa: "s", finalIpa: "t", consonantClass: "high", drillable: true, metadata: { name: "ษ ฤๅษี", meaning: "hermit" } },
  { kind: "consonant", id: "consonant:ส", unit: 3, display: "ส", initialIpa: "s", finalIpa: "t", consonantClass: "high", drillable: true, metadata: { name: "ส เสือ", meaning: "tiger" } },
  { kind: "consonant", id: "consonant:ห", unit: 3, display: "ห", initialIpa: "h", finalIpa: null, consonantClass: "high", drillable: true, metadata: { name: "ห หีบ", meaning: "chest" } },
];

// --- Unit 4: Low-class consonants A (12) ------------------------------------
// Split of the doc's 24 low-class letters into two units of 12 (M11 authoring
// decision — the doc does not itself divide "low class" into A/B). ฅ is
// placed in group B per the plan's Appendix ("Low-class consonants B (12; ฅ
// shown, not drilled)"). Group A = the stops/affricates/nasals ค..ธ; Group B =
// the remaining continuants/sonorants น..ฮ, with ฅ prepended.
export const LOW_CONSONANTS_A: ConsonantItem[] = [
  { kind: "consonant", id: "consonant:ค", unit: 4, display: "ค", initialIpa: "kʰ", finalIpa: "k", consonantClass: "low", drillable: true, metadata: { name: "ค ควาย", meaning: "buffalo" } },
  { kind: "consonant", id: "consonant:ฆ", unit: 4, display: "ฆ", initialIpa: "kʰ", finalIpa: "k", consonantClass: "low", drillable: true, metadata: { name: "ฆ ระฆัง", meaning: "bell" } },
  { kind: "consonant", id: "consonant:ง", unit: 4, display: "ง", initialIpa: "ŋ", finalIpa: "ŋ", consonantClass: "low", drillable: true, metadata: { name: "ง งู", meaning: "snake" } },
  { kind: "consonant", id: "consonant:ช", unit: 4, display: "ช", initialIpa: "tɕʰ", finalIpa: "t", consonantClass: "low", drillable: true, metadata: { name: "ช ช้าง", meaning: "elephant" } },
  { kind: "consonant", id: "consonant:ซ", unit: 4, display: "ซ", initialIpa: "s", finalIpa: "t", consonantClass: "low", drillable: true, metadata: { name: "ซ โซ่", meaning: "chain" } },
  { kind: "consonant", id: "consonant:ฌ", unit: 4, display: "ฌ", initialIpa: "tɕʰ", finalIpa: "t", consonantClass: "low", drillable: true, metadata: { name: "ฌ เฌอ", meaning: "tree" } },
  { kind: "consonant", id: "consonant:ญ", unit: 4, display: "ญ", initialIpa: "j", finalIpa: "n", consonantClass: "low", drillable: true, metadata: { name: "ญ หญิง", meaning: "woman" } },
  { kind: "consonant", id: "consonant:ฑ", unit: 4, display: "ฑ", initialIpa: "tʰ, d", finalIpa: "t", consonantClass: "low", drillable: true, metadata: { name: "ฑ มณโฑ", meaning: "Montho (name)" } },
  { kind: "consonant", id: "consonant:ฒ", unit: 4, display: "ฒ", initialIpa: "tʰ", finalIpa: "t", consonantClass: "low", drillable: true, metadata: { name: "ฒ ผู้เฒ่า", meaning: "elder" } },
  { kind: "consonant", id: "consonant:ณ", unit: 4, display: "ณ", initialIpa: "n", finalIpa: "n", consonantClass: "low", drillable: true, metadata: { name: "ณ เณร", meaning: "novice monk" } },
  { kind: "consonant", id: "consonant:ท", unit: 4, display: "ท", initialIpa: "tʰ", finalIpa: "t", consonantClass: "low", drillable: true, metadata: { name: "ท ทหาร", meaning: "soldier" } },
  { kind: "consonant", id: "consonant:ธ", unit: 4, display: "ธ", initialIpa: "tʰ", finalIpa: "t", consonantClass: "low", drillable: true, metadata: { name: "ธ ธง", meaning: "flag" } },
];

// --- Unit 5: Low-class consonants B (12; ฅ shown, not drilled) -------------
export const LOW_CONSONANTS_B: ConsonantItem[] = [
  { kind: "consonant", id: "consonant:ฅ", unit: 5, display: "ฅ", initialIpa: "kʰ", finalIpa: null, consonantClass: "low", drillable: false, metadata: { name: "ฅ คน", meaning: "person", obsolete: true } },
  { kind: "consonant", id: "consonant:น", unit: 5, display: "น", initialIpa: "n", finalIpa: "n", consonantClass: "low", drillable: true, metadata: { name: "น หนู", meaning: "mouse" } },
  { kind: "consonant", id: "consonant:พ", unit: 5, display: "พ", initialIpa: "pʰ", finalIpa: "p", consonantClass: "low", drillable: true, metadata: { name: "พ พาน", meaning: "tray" } },
  { kind: "consonant", id: "consonant:ฟ", unit: 5, display: "ฟ", initialIpa: "f", finalIpa: "p", consonantClass: "low", drillable: true, metadata: { name: "ฟ ฟัน", meaning: "tooth" } },
  { kind: "consonant", id: "consonant:ภ", unit: 5, display: "ภ", initialIpa: "pʰ", finalIpa: "p", consonantClass: "low", drillable: true, metadata: { name: "ภ สำเภา", meaning: "junk (ship)" } },
  { kind: "consonant", id: "consonant:ม", unit: 5, display: "ม", initialIpa: "m", finalIpa: "m", consonantClass: "low", drillable: true, metadata: { name: "ม ม้า", meaning: "horse" } },
  { kind: "consonant", id: "consonant:ย", unit: 5, display: "ย", initialIpa: "j", finalIpa: "j", consonantClass: "low", drillable: true, metadata: { name: "ย ยักษ์", meaning: "giant" } },
  { kind: "consonant", id: "consonant:ร", unit: 5, display: "ร", initialIpa: "r", finalIpa: "n", consonantClass: "low", drillable: true, metadata: { name: "ร เรือ", meaning: "boat" } },
  { kind: "consonant", id: "consonant:ล", unit: 5, display: "ล", initialIpa: "l", finalIpa: "n", consonantClass: "low", drillable: true, metadata: { name: "ล ลิง", meaning: "monkey" } },
  { kind: "consonant", id: "consonant:ว", unit: 5, display: "ว", initialIpa: "w", finalIpa: "w", consonantClass: "low", drillable: true, metadata: { name: "ว แหวน", meaning: "ring" } },
  { kind: "consonant", id: "consonant:ฬ", unit: 5, display: "ฬ", initialIpa: "l", finalIpa: "n", consonantClass: "low", drillable: true, metadata: { name: "ฬ จุฬา", meaning: "kite" } },
  { kind: "consonant", id: "consonant:ฮ", unit: 5, display: "ฮ", initialIpa: "h", finalIpa: null, consonantClass: "low", drillable: true, metadata: { name: "ฮ นกฮูก", meaning: "owl" } },
];

export const ALL_CONSONANTS: ConsonantItem[] = [
  ...MID_CONSONANTS,
  ...HIGH_CONSONANTS,
  ...LOW_CONSONANTS_A,
  ...LOW_CONSONANTS_B,
];

// --- Unit 6: Finals — the 8 endings -----------------------------------------
// drillable:false on every row here — see the FinalItem doc comment in
// seed/thai/types.ts (M11 review round 2, CRITICAL fix). The actual
// letter→final / word→final drills quiz consonant/syllable items directly.
export const FINALS: FinalItem[] = [
  { kind: "final", id: "final:k", unit: 6, display: "k̚", initialIpa: "k", finalIpa: null, consonantClass: null, drillable: false, metadata: { letters: ["ก", "ข", "ค", "ฆ"], example: { thai: "ปาก", ipa: "pàːk̚", gloss: "mouth" } } },
  { kind: "final", id: "final:t", unit: 6, display: "t̚", initialIpa: "t", finalIpa: null, consonantClass: null, drillable: false, metadata: { letters: ["จ", "ช", "ซ", "ด", "ต", "ถ", "ท", "ธ", "ศ", "ษ", "ส", "(and more)"], example: { thai: "รถ", ipa: "rót̚", gloss: "car" } } },
  { kind: "final", id: "final:p", unit: 6, display: "p̚", initialIpa: "p", finalIpa: null, consonantClass: null, drillable: false, metadata: { letters: ["บ", "ป", "พ", "ฟ", "ภ"], example: { thai: "บาป", ipa: "bàːp̚", gloss: "sin" } } },
  { kind: "final", id: "final:m", unit: 6, display: "m", initialIpa: "m", finalIpa: null, consonantClass: null, drillable: false, metadata: { letters: ["ม"], example: { thai: "ยาม", ipa: "jāːm", gloss: "guard" } } },
  { kind: "final", id: "final:n", unit: 6, display: "n", initialIpa: "n", finalIpa: null, consonantClass: null, drillable: false, metadata: { letters: ["น", "ณ", "ญ", "ร", "ล", "ฬ"], example: { thai: "กิน", ipa: "kīn", gloss: "to eat" } } },
  { kind: "final", id: "final:ŋ", unit: 6, display: "ŋ", initialIpa: "ŋ", finalIpa: null, consonantClass: null, drillable: false, metadata: { letters: ["ง"], example: { thai: "ยาง", ipa: "jāːŋ", gloss: "rubber" } } },
  { kind: "final", id: "final:j", unit: 6, display: "j", initialIpa: "j", finalIpa: null, consonantClass: null, drillable: false, metadata: { letters: ["ย"], example: { thai: "สาย", ipa: "sǎːj", gloss: "line, late" } } },
  { kind: "final", id: "final:w", unit: 6, display: "w", initialIpa: "w", finalIpa: null, consonantClass: null, drillable: false, metadata: { letters: ["ว"], example: { thai: "ดาว", ipa: "dāːw", gloss: "star" } } },
];

// --- Unit 7: Vowels A — core short/long pairs -------------------------------
export const VOWELS_A: VowelItem[] = [
  { kind: "vowel", id: "vowel:a-short", unit: 7, display: "◌ะ", initialIpa: "aʔ", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "short", pairId: "a" } },
  { kind: "vowel", id: "vowel:a-long", unit: 7, display: "◌า", initialIpa: "aː", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "long", pairId: "a" } },
  { kind: "vowel", id: "vowel:i-short", unit: 7, display: "◌ิ", initialIpa: "i", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "short", pairId: "i" } },
  { kind: "vowel", id: "vowel:i-long", unit: 7, display: "◌ี", initialIpa: "iː", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "long", pairId: "i" } },
  { kind: "vowel", id: "vowel:ue-short", unit: 7, display: "◌ึ", initialIpa: "ɯ", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "short", pairId: "ue" } },
  { kind: "vowel", id: "vowel:ue-long", unit: 7, display: "◌ือ", initialIpa: "ɯː", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "long", pairId: "ue" } },
  { kind: "vowel", id: "vowel:u-short", unit: 7, display: "◌ุ", initialIpa: "u", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "short", pairId: "u" } },
  { kind: "vowel", id: "vowel:u-long", unit: 7, display: "◌ู", initialIpa: "uː", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "long", pairId: "u" } },
  { kind: "vowel", id: "vowel:e-short", unit: 7, display: "เ◌ะ", initialIpa: "eʔ", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "short", pairId: "e" } },
  { kind: "vowel", id: "vowel:e-long", unit: 7, display: "เ◌", initialIpa: "eː", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "long", pairId: "e" } },
  { kind: "vowel", id: "vowel:ae-short", unit: 7, display: "แ◌ะ", initialIpa: "ɛʔ", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "short", pairId: "ae" } },
  { kind: "vowel", id: "vowel:ae-long", unit: 7, display: "แ◌", initialIpa: "ɛː", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "long", pairId: "ae" } },
  { kind: "vowel", id: "vowel:o-short", unit: 7, display: "โ◌ะ", initialIpa: "oʔ", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "short", pairId: "o" } },
  { kind: "vowel", id: "vowel:o-long", unit: 7, display: "โ◌", initialIpa: "oː", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "long", pairId: "o" } },
  { kind: "vowel", id: "vowel:aw-short", unit: 7, display: "เ◌าะ", initialIpa: "ɔʔ", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "short", pairId: "aw" } },
  { kind: "vowel", id: "vowel:aw-long", unit: 7, display: "◌อ", initialIpa: "ɔː", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "long", pairId: "aw" } },
  { kind: "vowel", id: "vowel:oe-short", unit: 7, display: "เ◌อะ", initialIpa: "ɤʔ", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "short", pairId: "oe" } },
  { kind: "vowel", id: "vowel:oe-long", unit: 7, display: "เ◌อ", initialIpa: "ɤː", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "core", length: "long", pairId: "oe" } },
];

// --- Unit 8: Vowels B — diphthongs, hidden vowel, shape-changers -----------
export const VOWELS_B: VowelItem[] = [
  { kind: "vowel", id: "vowel:ia", unit: 8, display: "เ◌ีย", initialIpa: "ia", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "diphthong", length: null } },
  { kind: "vowel", id: "vowel:ua", unit: 8, display: "◌ัว", initialIpa: "ua", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "diphthong", length: null } },
  { kind: "vowel", id: "vowel:uea", unit: 8, display: "เ◌ือ", initialIpa: "ɯa", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "diphthong", length: null } },
  { kind: "vowel", id: "vowel:ai", unit: 8, display: "ไ◌ / ใ◌", initialIpa: "aj", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "diphthong", length: null } },
  { kind: "vowel", id: "vowel:ao", unit: 8, display: "เ◌า", initialIpa: "aw", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "diphthong", length: null } },
  { kind: "vowel", id: "vowel:am", unit: 8, display: "◌ำ", initialIpa: "am", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "diphthong", length: null } },
  { kind: "vowel", id: "vowel:aay", unit: 8, display: "◌าย", initialIpa: "aːj", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "diphthong", length: "long" } },
  { kind: "vowel", id: "vowel:aaw", unit: 8, display: "◌าว", initialIpa: "aːw", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "diphthong", length: "long" } },
  { kind: "vowel", id: "vowel:hidden-o", unit: 8, display: "(unwritten, closed syllable)", initialIpa: "o", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "hidden", length: null, note: "When a consonant is followed directly by another with no vowel written between them, a closed syllable's hidden vowel is usually o — e.g. คน kʰōn 'person'." } },
  { kind: "vowel", id: "vowel:hidden-a", unit: 8, display: "(unwritten, short word)", initialIpa: "a", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "hidden", length: "short", note: "In some short words the hidden vowel is instead a short a." } },
  { kind: "vowel", id: "vowel:mai-han-akat", unit: 8, display: "◌ั", initialIpa: "a", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "shape-changer", length: "short", note: "Short a rewritten as ◌ั when a final consonant follows (◌ะ alone becomes ◌ั + final) — e.g. รัก rák̚ 'to love'." } },
  { kind: "vowel", id: "vowel:mai-tai-khu", unit: 8, display: "◌็", initialIpa: "(shortens the vowel)", finalIpa: null, consonantClass: null, drillable: true, metadata: { category: "shape-changer", length: "short", note: "ไม้ไต่คู้ — shortens the vowel, common with เ and แ in closed syllables, e.g. เด็ก dèk̚ 'child'." } },
];

export const ALL_VOWELS: VowelItem[] = [...VOWELS_A, ...VOWELS_B];

// --- Curated real-word bank (unit 6 word→final / audio-word drills; unit 10 -
// --- tone-assembly / mark-tone; unit 11 word-ipa; also referenced as lesson -
// --- examples in units 7-8). All 100 words + every metadata field below are -
// --- taken verbatim from `.claude/plans/m13-word-bank.md` (M13/A1) — the ----
// --- vetted, Wiktionary-cross-checked word-bank artifact. The first 30 -----
// --- (through ดอก) are the M11 doc-sourced words, whose tone-derivation ----
// --- columns are new M13 metadata computed from the doc's own tone grid; --
// --- the following 70 are new for M13, independently Wiktionary-verified. -
// drillable:true on every row (M13) — see the SyllableItem.drillable doc
// comment: word-ipa (unit 11) and audio-word (unit 6) are reachable for every
// syllable item regardless of finalSound, so the M11-era finalSound-gated
// false no longer applies.
export const WORD_BANK: SyllableItem[] = [
  { kind: "syllable", id: "syllable:ปลา", unit: 6, display: "ปลา", initialIpa: "plāː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "fish", finalSound: null, vowelForm: "◌า", initialClass: "mid", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:ปาก", unit: 6, display: "ปาก", initialIpa: "pàːk̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "mouth", finalSound: "k", vowelForm: "◌า", initialClass: "mid", toneMark: null, live: "dead", vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:รถ", unit: 6, display: "รถ", initialIpa: "rót̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "car", finalSound: "t", vowelForm: "(hidden o)", initialClass: "low", toneMark: null, live: "dead", vowelLength: "short", tone: "high", asmEligible: true } },
  { kind: "syllable", id: "syllable:บาป", unit: 6, display: "บาป", initialIpa: "bàːp̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "sin", finalSound: "p", vowelForm: "◌า", initialClass: "mid", toneMark: null, live: "dead", vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ยาม", unit: 6, display: "ยาม", initialIpa: "jāːm", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "guard", finalSound: "m", vowelForm: "◌า", initialClass: "low", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:กิน", unit: 6, display: "กิน", initialIpa: "kīn", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to eat", finalSound: "n", vowelForm: "◌ิ", initialClass: "mid", toneMark: null, live: "live", vowelLength: "short", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:ยาง", unit: 6, display: "ยาง", initialIpa: "jāːŋ", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "rubber", finalSound: "ŋ", vowelForm: "◌า", initialClass: "low", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:สาย", unit: 6, display: "สาย", initialIpa: "sǎːj", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "line, late", finalSound: "j", vowelForm: "◌าย", initialClass: "high", toneMark: null, live: "live", vowelLength: "long", tone: "rising", asmEligible: true } },
  { kind: "syllable", id: "syllable:ดาว", unit: 6, display: "ดาว", initialIpa: "dāːw", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "star", finalSound: "w", vowelForm: "◌าว", initialClass: "mid", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:พร", unit: 6, display: "พร", initialIpa: "pʰɔ̄ːn", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "blessing", finalSound: "n", vowelForm: "◌อ", sourceNote: "irregular spelling: ร supplies ɔːn", initialClass: "low", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: false } },
  { kind: "syllable", id: "syllable:รัก", unit: 6, display: "รัก", initialIpa: "rák̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to love", finalSound: "k", vowelForm: "◌ั", initialClass: "low", toneMark: null, live: "dead", vowelLength: "short", tone: "high", asmEligible: true } },
  { kind: "syllable", id: "syllable:ภาพ", unit: 6, display: "ภาพ", initialIpa: "pʰâːp̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "picture", finalSound: "p", vowelForm: "◌า", initialClass: "low", toneMark: null, live: "dead", vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:ดี", unit: 6, display: "ดี", initialIpa: "dīː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "good", finalSound: null, vowelForm: "◌ี", initialClass: "mid", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:มือ", unit: 6, display: "มือ", initialIpa: "mɯ̄ː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "hand", finalSound: null, vowelForm: "◌ือ", initialClass: "low", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:คา", unit: 6, display: "คา", initialIpa: "kʰāː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to be stuck", finalSound: null, vowelForm: "◌า", initialClass: "low", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:ขา", unit: 6, display: "ขา", initialIpa: "kʰǎː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "leg", finalSound: null, vowelForm: "◌า", initialClass: "high", toneMark: null, live: "live", vowelLength: "long", tone: "rising", asmEligible: true } },
  { kind: "syllable", id: "syllable:ข่า", unit: 6, display: "ข่า", initialIpa: "kʰàː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "galangal", finalSound: null, vowelForm: "◌า", initialClass: "high", toneMark: "mai-ek", live: null, vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:คน", unit: 6, display: "คน", initialIpa: "kʰōn", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "person", finalSound: "n", vowelForm: "(hidden o)", initialClass: "low", toneMark: null, live: "live", vowelLength: "short", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:เด็ก", unit: 6, display: "เด็ก", initialIpa: "dèk̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "child", finalSound: "k", vowelForm: "เ◌็", initialClass: "mid", toneMark: null, live: "dead", vowelLength: "short", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:นา", unit: 6, display: "นา", initialIpa: "nāː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "rice field", finalSound: null, vowelForm: "◌า", initialClass: "low", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:กรง", unit: 6, display: "กรง", initialIpa: "krōŋ", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "cage", finalSound: "ŋ", vowelForm: "โ◌", sourceNote: "cluster กร, hidden o", initialClass: "mid", toneMark: null, live: "live", vowelLength: "short", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:ทราย", unit: 6, display: "ทราย", initialIpa: "sāːj", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "sand", finalSound: "j", vowelForm: "◌าย", sourceNote: "irregular: ทร reads s; class still from ท", initialClass: "low", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: false } },
  { kind: "syllable", id: "syllable:สบาย", unit: 6, display: "สบาย", initialIpa: "sà.bāːj", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "comfortable, well", finalSound: "j", vowelForm: "◌าย", sourceNote: "multi-syllable; unit-6/11 only", initialClass: null, toneMark: null, live: null, vowelLength: null, tone: null, asmEligible: false } },
  { kind: "syllable", id: "syllable:มา", unit: 6, display: "มา", initialIpa: "māː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to come", finalSound: null, vowelForm: "◌า", initialClass: "low", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:ไป", unit: 6, display: "ไป", initialIpa: "pāj", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to go", finalSound: null, vowelForm: "ไ◌", initialClass: "mid", toneMark: null, live: "live", vowelLength: "short", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:แมว", unit: 6, display: "แมว", initialIpa: "mɛ̄ːw", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "cat", finalSound: "w", vowelForm: "แ◌", initialClass: "low", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:น้ำ", unit: 6, display: "น้ำ", initialIpa: "náːm", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "water", finalSound: "m", vowelForm: "◌ำ", sourceNote: "written short ◌ำ, spoken long", initialClass: "low", toneMark: "mai-tho", live: null, vowelLength: "long", tone: "high", asmEligible: true } },
  { kind: "syllable", id: "syllable:โรง", unit: 6, display: "โรง", initialIpa: "rōːŋ", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "building, hall (as in 'school')", finalSound: "ŋ", vowelForm: "โ◌", initialClass: "low", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:เรียน", unit: 6, display: "เรียน", initialIpa: "rīan", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to study", finalSound: "n", vowelForm: "เ◌ีย", initialClass: "low", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:ดอก", unit: 6, display: "ดอก", initialIpa: "dɔ̀ːk̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "flower", finalSound: "k", vowelForm: "◌อ", initialClass: "mid", toneMark: null, live: "dead", vowelLength: "long", tone: "low", asmEligible: true } },

  // --- M13/A1: 70 new words, Wiktionary-verified 2026-07-03 -----------------
  { kind: "syllable", id: "syllable:งู", unit: 6, display: "งู", initialIpa: "ŋūː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "snake", finalSound: null, initialClass: "low", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:ควาย", unit: 6, display: "ควาย", initialIpa: "kʰwāːj", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "water buffalo", finalSound: "j", sourceNote: "cluster คว", initialClass: "low", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:ตา", unit: 6, display: "ตา", initialIpa: "tāː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "eye", finalSound: null, initialClass: "mid", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:ปี", unit: 6, display: "ปี", initialIpa: "pīː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "year", finalSound: null, initialClass: "mid", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:จาน", unit: 6, display: "จาน", initialIpa: "tɕāːn", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "plate", finalSound: "n", initialClass: "mid", toneMark: null, live: "live", vowelLength: "long", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:เอา", unit: 6, display: "เอา", initialIpa: "ʔāw", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to take", finalSound: "w", vowelForm: "เ◌า", initialClass: "mid", toneMark: null, live: "live", vowelLength: "short", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:ใจ", unit: 6, display: "ใจ", initialIpa: "tɕāj", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "heart", finalSound: "j", vowelForm: "ใ◌", initialClass: "mid", toneMark: null, live: "live", vowelLength: "short", tone: "mid", asmEligible: true } },
  { kind: "syllable", id: "syllable:สอง", unit: 6, display: "สอง", initialIpa: "sɔ̌ːŋ", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "two", finalSound: "ŋ", initialClass: "high", toneMark: null, live: "live", vowelLength: "long", tone: "rising", asmEligible: true } },
  { kind: "syllable", id: "syllable:หู", unit: 6, display: "หู", initialIpa: "hǔː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "ear", finalSound: null, sourceNote: "ห as real initial, not leader", initialClass: "high", toneMark: null, live: "live", vowelLength: "long", tone: "rising", asmEligible: true } },
  { kind: "syllable", id: "syllable:ผม", unit: 6, display: "ผม", initialIpa: "pʰǒm", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "hair; I (male)", finalSound: "m", vowelForm: "(hidden o)", initialClass: "high", toneMark: null, live: "live", vowelLength: "short", tone: "rising", asmEligible: true } },
  { kind: "syllable", id: "syllable:สาม", unit: 6, display: "สาม", initialIpa: "sǎːm", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "three", finalSound: "m", initialClass: "high", toneMark: null, live: "live", vowelLength: "long", tone: "rising", asmEligible: true } },
  { kind: "syllable", id: "syllable:เขา", unit: 6, display: "เขา", initialIpa: "kʰǎw", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "he/she", finalSound: "w", vowelForm: "เ◌า", initialClass: "high", toneMark: null, live: "live", vowelLength: "short", tone: "rising", asmEligible: true } },
  { kind: "syllable", id: "syllable:ฝา", unit: 6, display: "ฝา", initialIpa: "fǎː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "lid", finalSound: null, initialClass: "high", toneMark: null, live: "live", vowelLength: "long", tone: "rising", asmEligible: true } },
  { kind: "syllable", id: "syllable:นก", unit: 6, display: "นก", initialIpa: "nók̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "bird", finalSound: "k", vowelForm: "(hidden o)", initialClass: "low", toneMark: null, live: "dead", vowelLength: "short", tone: "high", asmEligible: true } },
  { kind: "syllable", id: "syllable:มด", unit: 6, display: "มด", initialIpa: "mót̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "ant", finalSound: "t", vowelForm: "(hidden o)", initialClass: "low", toneMark: null, live: "dead", vowelLength: "short", tone: "high", asmEligible: true } },
  { kind: "syllable", id: "syllable:ทุก", unit: 6, display: "ทุก", initialIpa: "tʰúk̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "every", finalSound: "k", initialClass: "low", toneMark: null, live: "dead", vowelLength: "short", tone: "high", asmEligible: true } },
  { kind: "syllable", id: "syllable:รับ", unit: 6, display: "รับ", initialIpa: "ráp̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to receive", finalSound: "p", initialClass: "low", toneMark: null, live: "dead", vowelLength: "short", tone: "high", asmEligible: true } },
  { kind: "syllable", id: "syllable:เจ็ด", unit: 6, display: "เจ็ด", initialIpa: "tɕèt̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "seven", finalSound: "t", vowelForm: "เ◌็", initialClass: "mid", toneMark: null, live: "dead", vowelLength: "short", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:จับ", unit: 6, display: "จับ", initialIpa: "tɕàp̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to catch", finalSound: "p", initialClass: "mid", toneMark: null, live: "dead", vowelLength: "short", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ตัด", unit: 6, display: "ตัด", initialIpa: "tàt̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to cut", finalSound: "t", initialClass: "mid", toneMark: null, live: "dead", vowelLength: "short", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ติด", unit: 6, display: "ติด", initialIpa: "tìt̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to stick", finalSound: "t", initialClass: "mid", toneMark: null, live: "dead", vowelLength: "short", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ผัก", unit: 6, display: "ผัก", initialIpa: "pʰàk̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "vegetable", finalSound: "k", initialClass: "high", toneMark: null, live: "dead", vowelLength: "short", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:หก", unit: 6, display: "หก", initialIpa: "hòk̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "six", finalSound: "k", vowelForm: "(hidden o)", initialClass: "high", toneMark: null, live: "dead", vowelLength: "short", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:สุข", unit: 6, display: "สุข", initialIpa: "sùk̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "happiness", finalSound: "k", sourceNote: "final ข", initialClass: "high", toneMark: null, live: "dead", vowelLength: "short", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ขับ", unit: 6, display: "ขับ", initialIpa: "kʰàp̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to drive", finalSound: "p", initialClass: "high", toneMark: null, live: "dead", vowelLength: "short", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:มาก", unit: 6, display: "มาก", initialIpa: "mâːk̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "very, much", finalSound: "k", initialClass: "low", toneMark: null, live: "dead", vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:ลูก", unit: 6, display: "ลูก", initialIpa: "lûːk̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "child, offspring", finalSound: "k", initialClass: "low", toneMark: null, live: "dead", vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:มีด", unit: 6, display: "มีด", initialIpa: "mîːt̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "knife", finalSound: "t", initialClass: "low", toneMark: null, live: "dead", vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:เลือด", unit: 6, display: "เลือด", initialIpa: "lɯ̂at̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "blood", finalSound: "t", vowelForm: "เ◌ือ", initialClass: "low", toneMark: null, live: "dead", vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:พูด", unit: 6, display: "พูด", initialIpa: "pʰûːt̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to speak", finalSound: "t", initialClass: "low", toneMark: null, live: "dead", vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:ตอบ", unit: 6, display: "ตอบ", initialIpa: "tɔ̀ːp̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to answer", finalSound: "p", initialClass: "mid", toneMark: null, live: "dead", vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ปีก", unit: 6, display: "ปีก", initialIpa: "pìːk̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "wing", finalSound: "k", initialClass: "mid", toneMark: null, live: "dead", vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:บาท", unit: 6, display: "บาท", initialIpa: "bàːt̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "baht", finalSound: "t", initialClass: "mid", toneMark: null, live: "dead", vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ออก", unit: 6, display: "ออก", initialIpa: "ʔɔ̀ːk̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to go out", finalSound: "k", sourceNote: "อ initial", initialClass: "mid", toneMark: null, live: "dead", vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ขาด", unit: 6, display: "ขาด", initialIpa: "kʰàːt̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "torn, missing", finalSound: "t", initialClass: "high", toneMark: null, live: "dead", vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:สอบ", unit: 6, display: "สอบ", initialIpa: "sɔ̀ːp̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to take an exam", finalSound: "p", initialClass: "high", toneMark: null, live: "dead", vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ฝาก", unit: 6, display: "ฝาก", initialIpa: "fàːk̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to deposit, entrust", finalSound: "k", initialClass: "high", toneMark: null, live: "dead", vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ถูก", unit: 6, display: "ถูก", initialIpa: "tʰùːk̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "cheap; correct", finalSound: "k", initialClass: "high", toneMark: null, live: "dead", vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:แม่", unit: 6, display: "แม่", initialIpa: "mɛ̂ː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "mother", finalSound: null, initialClass: "low", toneMark: "mai-ek", live: null, vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:พ่อ", unit: 6, display: "พ่อ", initialIpa: "pʰɔ̂ː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "father", finalSound: null, initialClass: "low", toneMark: "mai-ek", live: null, vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:ที่", unit: 6, display: "ที่", initialIpa: "tʰîː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "at; place", finalSound: null, initialClass: "low", toneMark: "mai-ek", live: null, vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:ช่าง", unit: 6, display: "ช่าง", initialIpa: "tɕʰâːŋ", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "craftsman", finalSound: "ŋ", initialClass: "low", toneMark: "mai-ek", live: null, vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:ว่า", unit: 6, display: "ว่า", initialIpa: "wâː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to say; that", finalSound: null, initialClass: "low", toneMark: "mai-ek", live: null, vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:ไก่", unit: 6, display: "ไก่", initialIpa: "kàj", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "chicken", finalSound: "j", vowelForm: "ไ◌", initialClass: "mid", toneMark: "mai-ek", live: null, vowelLength: "short", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:อ่าน", unit: 6, display: "อ่าน", initialIpa: "ʔàːn", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to read", finalSound: "n", initialClass: "mid", toneMark: "mai-ek", live: null, vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ต่อ", unit: 6, display: "ต่อ", initialIpa: "tɔ̀ː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to connect", finalSound: null, initialClass: "mid", toneMark: "mai-ek", live: null, vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:เก่า", unit: 6, display: "เก่า", initialIpa: "kàw", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "old (things)", finalSound: "w", vowelForm: "เ◌า", initialClass: "mid", toneMark: "mai-ek", live: null, vowelLength: "short", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ปู่", unit: 6, display: "ปู่", initialIpa: "pùː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "paternal grandfather", finalSound: null, initialClass: "mid", toneMark: "mai-ek", live: null, vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ใส่", unit: 6, display: "ใส่", initialIpa: "sàj", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to put on, wear", finalSound: "j", vowelForm: "ใ◌", initialClass: "high", toneMark: "mai-ek", live: null, vowelLength: "short", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:สี่", unit: 6, display: "สี่", initialIpa: "sìː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "four", finalSound: null, initialClass: "high", toneMark: "mai-ek", live: null, vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ผ่าน", unit: 6, display: "ผ่าน", initialIpa: "pʰàːn", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to pass", finalSound: "n", initialClass: "high", toneMark: "mai-ek", live: null, vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ข่าว", unit: 6, display: "ข่าว", initialIpa: "kʰàːw", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "news", finalSound: "w", initialClass: "high", toneMark: "mai-ek", live: null, vowelLength: "long", tone: "low", asmEligible: true } },
  { kind: "syllable", id: "syllable:ม้า", unit: 6, display: "ม้า", initialIpa: "máː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "horse", finalSound: null, initialClass: "low", toneMark: "mai-tho", live: null, vowelLength: "long", tone: "high", asmEligible: true } },
  { kind: "syllable", id: "syllable:น้อง", unit: 6, display: "น้อง", initialIpa: "nɔ́ːŋ", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "younger sibling", finalSound: "ŋ", initialClass: "low", toneMark: "mai-tho", live: null, vowelLength: "long", tone: "high", asmEligible: true } },
  { kind: "syllable", id: "syllable:ร้าน", unit: 6, display: "ร้าน", initialIpa: "ráːn", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "shop", finalSound: "n", initialClass: "low", toneMark: "mai-tho", live: null, vowelLength: "long", tone: "high", asmEligible: true } },
  { kind: "syllable", id: "syllable:ช้าง", unit: 6, display: "ช้าง", initialIpa: "tɕʰáːŋ", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "elephant", finalSound: "ŋ", initialClass: "low", toneMark: "mai-tho", live: null, vowelLength: "long", tone: "high", asmEligible: true } },
  { kind: "syllable", id: "syllable:บ้าน", unit: 6, display: "บ้าน", initialIpa: "bâːn", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "house", finalSound: "n", initialClass: "mid", toneMark: "mai-tho", live: null, vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:ได้", unit: 6, display: "ได้", initialIpa: "dâːj", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "can; to get", finalSound: "j", vowelForm: "ไ◌", sourceNote: "CORRECTED: long aː despite ไ◌ (irregular)", initialClass: "mid", toneMark: "mai-tho", live: null, vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:ต้ม", unit: 6, display: "ต้ม", initialIpa: "tôm", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "to boil", finalSound: "m", vowelForm: "(hidden o)", initialClass: "mid", toneMark: "mai-tho", live: null, vowelLength: "short", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:ใต้", unit: 6, display: "ใต้", initialIpa: "tâːj", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "under; south", finalSound: "j", vowelForm: "ใ◌", sourceNote: "CORRECTED: long aː despite ใ◌ (irregular)", initialClass: "mid", toneMark: "mai-tho", live: null, vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:ห้า", unit: 6, display: "ห้า", initialIpa: "hâː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "five", finalSound: null, initialClass: "high", toneMark: "mai-tho", live: null, vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:ข้าว", unit: 6, display: "ข้าว", initialIpa: "kʰâːw", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "rice", finalSound: "w", initialClass: "high", toneMark: "mai-tho", live: null, vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:เสื้อ", unit: 6, display: "เสื้อ", initialIpa: "sɯ̂a", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "shirt", finalSound: null, vowelForm: "เ◌ือ", initialClass: "high", toneMark: "mai-tho", live: null, vowelLength: "long", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:ห้อง", unit: 6, display: "ห้อง", initialIpa: "hɔ̂ŋ", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "room", finalSound: "ŋ", sourceNote: "spoken short ɔ", initialClass: "high", toneMark: "mai-tho", live: null, vowelLength: "short", tone: "falling", asmEligible: true } },
  { kind: "syllable", id: "syllable:โต๊ะ", unit: 6, display: "โต๊ะ", initialIpa: "tóʔ", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "table", finalSound: null, vowelForm: "โ◌ะ", sourceNote: "phonetic glottal stop ʔ (short open vowel) — not a written final consonant, so finalSound is null per the SyllableItem convention", initialClass: "mid", toneMark: "mai-tri", live: null, vowelLength: "short", tone: "high", asmEligible: true } },
  { kind: "syllable", id: "syllable:โจ๊ก", unit: 6, display: "โจ๊ก", initialIpa: "tɕóːk̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "rice porridge", finalSound: "k", initialClass: "mid", toneMark: "mai-tri", live: null, vowelLength: "long", tone: "high", asmEligible: true } },
  { kind: "syllable", id: "syllable:เก๊", unit: 6, display: "เก๊", initialIpa: "kéː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "fake, counterfeit", finalSound: null, initialClass: "mid", toneMark: "mai-tri", live: null, vowelLength: "long", tone: "high", asmEligible: true } },
  { kind: "syllable", id: "syllable:ตั๋ว", unit: 6, display: "ตั๋ว", initialIpa: "tǔa", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "ticket", finalSound: null, vowelForm: "◌ัว", initialClass: "mid", toneMark: "mai-chattawa", live: null, vowelLength: null, tone: "rising", asmEligible: true } },
  { kind: "syllable", id: "syllable:เก๋", unit: 6, display: "เก๋", initialIpa: "kěː", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "chic, stylish", finalSound: null, sourceNote: "source: th.wiktionary.org/wiki/เก๋", initialClass: "mid", toneMark: "mai-chattawa", live: null, vowelLength: "long", tone: "rising", asmEligible: true } },
  { kind: "syllable", id: "syllable:เดี๋ยว", unit: 6, display: "เดี๋ยว", initialIpa: "dǐaw", finalIpa: null, consonantClass: null, drillable: true, metadata: { gloss: "a moment, soon", finalSound: "w", vowelForm: "เ◌ียว", initialClass: "mid", toneMark: "mai-chattawa", live: null, vowelLength: null, tone: "rising", asmEligible: true } },
];

// --- Unit 9: Tone ear — minimal-pair families ------------------------------
// Every word/syllable below is real Thai, sourced from the research doc
// (verbatim tone-diacritic table + its own worked "minimal set" examples) or
// from the owner-approved M12 TTS test-clip family (real dictionary words,
// signed off 2026-07-03 — .artifacts/tts-test-clips/ledger.json). No tone is
// invented: each is checked against the doc's tone-grid table (§6, "6 ·
// Tones") or its worked answers.
//
// Family "carrier-อ" — doc §"tone-diacritics" ("See it in one minimal set"):
//   the mid-class carrier อ takes all five tone marks, same letters, five
//   tones. The doc gives no individual gloss for these — they are a bare
//   phonetic demonstration, not vocabulary — so `gloss` is omitted and the
//   lesson tiles render them as playback-only, ungloss forms.
// Family "khaa" — doc §"tones" worked example (คา/ขา/ข่า, with the answers
//   giving mid/rising/low) extended to all five tones with ค่า/ค้า, the same
//   real dictionary words the owner approved during the M12 TTS bake-off/test
//   clip sign-off for this exact /kʰaː/ family.
// Family "naa-silent-leader" — doc §"special", the silent-ห leader example:
//   นา (Low class, live → mid) vs หนา (silent ห reclassifies it as High class
//   → rising). Only two tones are attested for this pair in the doc; it is
//   included anyway (a partial-tone family) since it teaches the silent-
//   leader mechanic the other two families don't, not because a fabricated
//   third/fourth/fifth tone was manufactured for symmetry.
export const TONE_WORDS: ToneWordItem[] = [
  { kind: "tone-word", id: "tone-word:อา", unit: 9, display: "อา", initialIpa: "ʔāː", finalIpa: null, consonantClass: "mid", drillable: true, metadata: { tone: "mid", family: "carrier-อ" } },
  { kind: "tone-word", id: "tone-word:อ่า", unit: 9, display: "อ่า", initialIpa: "ʔàː", finalIpa: null, consonantClass: "mid", drillable: true, metadata: { tone: "low", family: "carrier-อ" } },
  { kind: "tone-word", id: "tone-word:อ้า", unit: 9, display: "อ้า", initialIpa: "ʔâː", finalIpa: null, consonantClass: "mid", drillable: true, metadata: { tone: "falling", family: "carrier-อ" } },
  { kind: "tone-word", id: "tone-word:อ๊า", unit: 9, display: "อ๊า", initialIpa: "ʔáː", finalIpa: null, consonantClass: "mid", drillable: true, metadata: { tone: "high", family: "carrier-อ" } },
  { kind: "tone-word", id: "tone-word:อ๋า", unit: 9, display: "อ๋า", initialIpa: "ʔǎː", finalIpa: null, consonantClass: "mid", drillable: true, metadata: { tone: "rising", family: "carrier-อ" } },
  { kind: "tone-word", id: "tone-word:คา", unit: 9, display: "คา", initialIpa: "kʰāː", finalIpa: null, consonantClass: "low", drillable: true, metadata: { tone: "mid", family: "khaa", gloss: "to be stuck" } },
  { kind: "tone-word", id: "tone-word:ขา", unit: 9, display: "ขา", initialIpa: "kʰǎː", finalIpa: null, consonantClass: "high", drillable: true, metadata: { tone: "rising", family: "khaa", gloss: "leg" } },
  { kind: "tone-word", id: "tone-word:ข่า", unit: 9, display: "ข่า", initialIpa: "kʰàː", finalIpa: null, consonantClass: "high", drillable: true, metadata: { tone: "low", family: "khaa", gloss: "galangal" } },
  { kind: "tone-word", id: "tone-word:ค่า", unit: 9, display: "ค่า", initialIpa: "kʰâː", finalIpa: null, consonantClass: "low", drillable: true, metadata: { tone: "falling", family: "khaa", gloss: "value, cost" } },
  { kind: "tone-word", id: "tone-word:ค้า", unit: 9, display: "ค้า", initialIpa: "kʰáː", finalIpa: null, consonantClass: "low", drillable: true, metadata: { tone: "high", family: "khaa", gloss: "to trade" } },
  { kind: "tone-word", id: "tone-word:นา", unit: 9, display: "นา", initialIpa: "nāː", finalIpa: null, consonantClass: "low", drillable: true, metadata: { tone: "mid", family: "naa-silent-leader", gloss: "rice field" } },
  { kind: "tone-word", id: "tone-word:หนา", unit: 9, display: "หนา", initialIpa: "nǎː", finalIpa: null, consonantClass: "high", drillable: true, metadata: { tone: "rising", family: "naa-silent-leader", gloss: "thick (silent ห leader)" } },
];

// --- Unit 12: Special signs (4) --------------------------------------------
// Verbatim from research doc §8 "Small marks above and around letters"
// (quoted in the M14 Validation Contract) — no external verification needed.
export const SPECIAL_SIGNS: SpecialSignItem[] = [
  { kind: "special-sign", id: "special-sign:garan", unit: 12, display: "◌์", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { signName: "การันต์ /kāː.rān/", functionKey: "silencer", functionLabel: "Silences the letter beneath it (and often the one before)", example: { thai: "จันทร์", ipa: "tɕān", gloss: "moon (the ทร is silent)" } } },
  { kind: "special-sign", id: "special-sign:maitaikhu", unit: 12, display: "◌็", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { signName: "ไม้ไต่คู้ /máj tàj kʰúː/", functionKey: "shortener", functionLabel: "Shortens the vowel (esp. เ, แ in closed syllables)", example: { thai: "เด็ก", ipa: "dèk̚", gloss: "child" } } },
  { kind: "special-sign", id: "special-sign:maiyamok", unit: 12, display: "ๆ", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { signName: "ไม้ยมก /máj já.mók̚/", functionKey: "repeat", functionLabel: "Repeat — say the preceding word twice", example: { thai: "เด็ก ๆ", ipa: "dèk̚ dèk̚", gloss: "children" } } },
  { kind: "special-sign", id: "special-sign:paiyannoi", unit: 12, display: "ฯ", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { signName: "ไปยาลน้อย /pāj.jāːn.nɔ́ːj/", functionKey: "abbreviation", functionLabel: "Marks a conventional abbreviation of a longer formal phrase", example: { thai: "กรุงเทพฯ", ipa: "", gloss: "e.g. an abbreviation of a longer formal name (Bangkok)" } } },
];

// --- Unit 12: Silent tone-leader words (12) --------------------------------
// Verbatim from `.claude/plans/m14-content-leaders.md` (Wiktionary-verified
// 2026-07-03) — 4 อ-leader words (mandatory, all four everyday cases per the
// research doc) + 8 ห-leader words spanning ม ญ น ล ย ร ว.
export const LEADER_WORDS: LeaderWordItem[] = [
  { kind: "leader-word", id: "leader-word:อย่า", unit: 12, display: "อย่า", initialIpa: "jàː", finalIpa: null, consonantClass: null, drillable: true, metadata: { leaderChar: "อ", baseConsonant: "ย", tone: "low", gloss: "don't", derivation: "Mid(via อ)+mai-ek → low" } },
  { kind: "leader-word", id: "leader-word:อยาก", unit: 12, display: "อยาก", initialIpa: "jàːk̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { leaderChar: "อ", baseConsonant: "ย", tone: "low", gloss: "to want", derivation: "Mid(via อ)+dead → low" } },
  { kind: "leader-word", id: "leader-word:อย่าง", unit: 12, display: "อย่าง", initialIpa: "jàːŋ", finalIpa: null, consonantClass: null, drillable: true, metadata: { leaderChar: "อ", baseConsonant: "ย", tone: "low", gloss: "kind, type", derivation: "Mid(via อ)+mai-ek → low" } },
  { kind: "leader-word", id: "leader-word:อยู่", unit: 12, display: "อยู่", initialIpa: "jùː", finalIpa: null, consonantClass: null, drillable: true, metadata: { leaderChar: "อ", baseConsonant: "ย", tone: "low", gloss: "to be at", derivation: "Mid(via อ)+mai-ek → low" } },
  { kind: "leader-word", id: "leader-word:หมา", unit: 12, display: "หมา", initialIpa: "mǎː", finalIpa: null, consonantClass: null, drillable: true, metadata: { leaderChar: "ห", baseConsonant: "ม", tone: "rising", gloss: "dog", derivation: "High(via ห)+live → rising" } },
  { kind: "leader-word", id: "leader-word:หนา", unit: 12, display: "หนา", initialIpa: "nǎː", finalIpa: null, consonantClass: null, drillable: true, metadata: { leaderChar: "ห", baseConsonant: "น", tone: "rising", gloss: "thick", derivation: "High(via ห)+live → rising" } },
  { kind: "leader-word", id: "leader-word:หนู", unit: 12, display: "หนู", initialIpa: "nǔː", finalIpa: null, consonantClass: null, drillable: true, metadata: { leaderChar: "ห", baseConsonant: "น", tone: "rising", gloss: "rat/mouse", derivation: "High(via ห)+live → rising" } },
  { kind: "leader-word", id: "leader-word:หญิง", unit: 12, display: "หญิง", initialIpa: "jǐŋ", finalIpa: null, consonantClass: null, drillable: true, metadata: { leaderChar: "ห", baseConsonant: "ญ", tone: "rising", gloss: "woman/female", derivation: "High(via ห)+live → rising" } },
  { kind: "leader-word", id: "leader-word:หลาย", unit: 12, display: "หลาย", initialIpa: "lǎːj", finalIpa: null, consonantClass: null, drillable: true, metadata: { leaderChar: "ห", baseConsonant: "ล", tone: "rising", gloss: "many", derivation: "High(via ห)+live → rising" } },
  { kind: "leader-word", id: "leader-word:หยุด", unit: 12, display: "หยุด", initialIpa: "jùt̚", finalIpa: null, consonantClass: null, drillable: true, metadata: { leaderChar: "ห", baseConsonant: "ย", tone: "low", gloss: "to stop", derivation: "High(via ห)+dead → low" } },
  { kind: "leader-word", id: "leader-word:หรือ", unit: 12, display: "หรือ", initialIpa: "rɯ̌ː", finalIpa: null, consonantClass: null, drillable: true, metadata: { leaderChar: "ห", baseConsonant: "ร", tone: "rising", gloss: "or", derivation: "High(via ห)+live → rising" } },
  { kind: "leader-word", id: "leader-word:หวาน", unit: 12, display: "หวาน", initialIpa: "wǎːn", finalIpa: null, consonantClass: null, drillable: true, metadata: { leaderChar: "ห", baseConsonant: "ว", tone: "rising", gloss: "sweet", derivation: "High(via ห)+live → rising" } },
];

// --- Unit 13: Numerals ๐-๙ (10) ---------------------------------------------
// Verbatim from `.claude/plans/m14-content-numerals.md` (Wiktionary-verified
// 2026-07-03). ๑ teaches the citation LOW tone /nɯ̀ŋ/ — the colloquial mid
// variant is a known, noted register variant, not an error.
export const NUMERALS: NumeralItem[] = [
  { kind: "numeral", id: "numeral:๐", unit: 13, display: "๐", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { value: 0, name: "ศูนย์", nameIpa: "sǔːn", tone: "rising" } },
  { kind: "numeral", id: "numeral:๑", unit: 13, display: "๑", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { value: 1, name: "หนึ่ง", nameIpa: "nɯ̀ŋ", tone: "low" } },
  { kind: "numeral", id: "numeral:๒", unit: 13, display: "๒", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { value: 2, name: "สอง", nameIpa: "sɔ̌ːŋ", tone: "rising" } },
  { kind: "numeral", id: "numeral:๓", unit: 13, display: "๓", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { value: 3, name: "สาม", nameIpa: "sǎːm", tone: "rising" } },
  { kind: "numeral", id: "numeral:๔", unit: 13, display: "๔", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { value: 4, name: "สี่", nameIpa: "sìː", tone: "low" } },
  { kind: "numeral", id: "numeral:๕", unit: 13, display: "๕", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { value: 5, name: "ห้า", nameIpa: "hâː", tone: "falling" } },
  { kind: "numeral", id: "numeral:๖", unit: 13, display: "๖", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { value: 6, name: "หก", nameIpa: "hòk̚", tone: "low" } },
  { kind: "numeral", id: "numeral:๗", unit: 13, display: "๗", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { value: 7, name: "เจ็ด", nameIpa: "tɕèt̚", tone: "low" } },
  { kind: "numeral", id: "numeral:๘", unit: 13, display: "๘", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { value: 8, name: "แปด", nameIpa: "pɛ̀ːt̚", tone: "low" } },
  { kind: "numeral", id: "numeral:๙", unit: 13, display: "๙", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { value: 9, name: "เก้า", nameIpa: "kâːw", tone: "falling" } },
];

// --- Unit 14: Spaceless-reading phrases (20) --------------------------------
// Verbatim from `.claude/plans/m14-content-phrases.md` (every constituent word
// Wiktionary-verified 2026-07-03). `boundaries` are code-point indices
// ([...display]) — verified at seed time (assertPhraseBoundariesValid in
// scripts/seed-thai-db.ts) to reproduce `syllables[i].thai` when `display` is
// split at them. Graded easy (2 syllables) -> harder (4 syllables).
export const PHRASES: PhraseItem[] = [
  { kind: "phrase", id: "phrase:ไปไหน", unit: 14, display: "ไปไหน", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "ไป", ipa: "pāj", gloss: "go" }, { thai: "ไหน", ipa: "nǎj", gloss: "where" }], boundaries: [2], gloss: "where are you going?" } },
  { kind: "phrase", id: "phrase:โรงเรียน", unit: 14, display: "โรงเรียน", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "โรง", ipa: "rōːŋ", gloss: "building" }, { thai: "เรียน", ipa: "rīan", gloss: "study" }], boundaries: [3], gloss: "school" } },
  { kind: "phrase", id: "phrase:กินข้าว", unit: 14, display: "กินข้าว", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "กิน", ipa: "kīn", gloss: "eat" }, { thai: "ข้าว", ipa: "kʰâːw", gloss: "rice" }], boundaries: [3], gloss: "eat (a meal)" } },
  { kind: "phrase", id: "phrase:ไก่ทอด", unit: 14, display: "ไก่ทอด", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "ไก่", ipa: "kàj", gloss: "chicken" }, { thai: "ทอด", ipa: "tʰɔ̂ːt̚", gloss: "deep-fried" }], boundaries: [3], gloss: "fried chicken" } },
  { kind: "phrase", id: "phrase:ปลาทอง", unit: 14, display: "ปลาทอง", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "ปลา", ipa: "plāː", gloss: "fish" }, { thai: "ทอง", ipa: "tʰɔ̄ːŋ", gloss: "gold" }], boundaries: [3], gloss: "goldfish" } },
  { kind: "phrase", id: "phrase:น้ำแข็ง", unit: 14, display: "น้ำแข็ง", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "น้ำ", ipa: "náːm", gloss: "water" }, { thai: "แข็ง", ipa: "kʰɛ̌ŋ", gloss: "hard" }], boundaries: [3], gloss: "ice" } },
  { kind: "phrase", id: "phrase:เด็กดี", unit: 14, display: "เด็กดี", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "เด็ก", ipa: "dèk̚", gloss: "child" }, { thai: "ดี", ipa: "dīː", gloss: "good" }], boundaries: [4], gloss: "good/well-behaved child" } },
  { kind: "phrase", id: "phrase:แมวกินปลา", unit: 14, display: "แมวกินปลา", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "แมว", ipa: "mɛ̄ːw", gloss: "cat" }, { thai: "กิน", ipa: "kīn", gloss: "eats" }, { thai: "ปลา", ipa: "plāː", gloss: "fish" }], boundaries: [3, 6], gloss: "the cat eats fish" } },
  { kind: "phrase", id: "phrase:ไปโรงเรียน", unit: 14, display: "ไปโรงเรียน", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "ไป", ipa: "pāj", gloss: "go" }, { thai: "โรง", ipa: "rōːŋ", gloss: "building" }, { thai: "เรียน", ipa: "rīan", gloss: "study" }], boundaries: [2, 5], gloss: "go to school" } },
  { kind: "phrase", id: "phrase:กินข้าวเช้า", unit: 14, display: "กินข้าวเช้า", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "กิน", ipa: "kīn", gloss: "eat" }, { thai: "ข้าว", ipa: "kʰâːw", gloss: "rice/meal" }, { thai: "เช้า", ipa: "tɕʰáːw", gloss: "morning" }], boundaries: [3, 7], gloss: "eat breakfast" } },
  { kind: "phrase", id: "phrase:นักเรียนดี", unit: 14, display: "นักเรียนดี", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "นัก", ipa: "nák̚", gloss: "-er (agent)" }, { thai: "เรียน", ipa: "rīan", gloss: "study" }, { thai: "ดี", ipa: "dīː", gloss: "good" }], boundaries: [3, 8], gloss: "good student" } },
  { kind: "phrase", id: "phrase:แมวสีดำ", unit: 14, display: "แมวสีดำ", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "แมว", ipa: "mɛ̄ːw", gloss: "cat" }, { thai: "สี", ipa: "sǐː", gloss: "colour" }, { thai: "ดำ", ipa: "dām", gloss: "black" }], boundaries: [3, 5], gloss: "black cat" } },
  { kind: "phrase", id: "phrase:ไปทำงาน", unit: 14, display: "ไปทำงาน", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "ไป", ipa: "pāj", gloss: "go" }, { thai: "ทำ", ipa: "tʰām", gloss: "do" }, { thai: "งาน", ipa: "ŋāːn", gloss: "work" }], boundaries: [2, 4], gloss: "go to work" } },
  { kind: "phrase", id: "phrase:เด็กกินนม", unit: 14, display: "เด็กกินนม", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "เด็ก", ipa: "dèk̚", gloss: "child" }, { thai: "กิน", ipa: "kīn", gloss: "consumes" }, { thai: "นม", ipa: "nōm", gloss: "milk" }], boundaries: [4, 7], gloss: "the child drinks milk" } },
  { kind: "phrase", id: "phrase:ปลาสองตัว", unit: 14, display: "ปลาสองตัว", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "ปลา", ipa: "plāː", gloss: "fish" }, { thai: "สอง", ipa: "sɔ̌ːŋ", gloss: "two" }, { thai: "ตัว", ipa: "tūa", gloss: "(animal classifier)" }], boundaries: [3, 6], gloss: "two fish" } },
  { kind: "phrase", id: "phrase:หมากินข้าว", unit: 14, display: "หมากินข้าว", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "หมา", ipa: "mǎː", gloss: "dog" }, { thai: "กิน", ipa: "kīn", gloss: "eats" }, { thai: "ข้าว", ipa: "kʰâːw", gloss: "rice" }], boundaries: [3, 6], gloss: "the dog eats rice" } },
  { kind: "phrase", id: "phrase:ไปโรงเรียนไทย", unit: 14, display: "ไปโรงเรียนไทย", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "ไป", ipa: "pāj", gloss: "go" }, { thai: "โรง", ipa: "rōːŋ", gloss: "building" }, { thai: "เรียน", ipa: "rīan", gloss: "study" }, { thai: "ไทย", ipa: "tʰāj", gloss: "Thai" }], boundaries: [2, 5, 10], gloss: "go to a Thai school" } },
  { kind: "phrase", id: "phrase:เด็กไปโรงเรียน", unit: 14, display: "เด็กไปโรงเรียน", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "เด็ก", ipa: "dèk̚", gloss: "child" }, { thai: "ไป", ipa: "pāj", gloss: "go" }, { thai: "โรง", ipa: "rōːŋ", gloss: "building" }, { thai: "เรียน", ipa: "rīan", gloss: "study" }], boundaries: [4, 6, 9], gloss: "the child goes to school" } },
  { kind: "phrase", id: "phrase:แมวกินปลาทู", unit: 14, display: "แมวกินปลาทู", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "แมว", ipa: "mɛ̄ːw", gloss: "cat" }, { thai: "กิน", ipa: "kīn", gloss: "eats" }, { thai: "ปลา", ipa: "plāː", gloss: "fish" }, { thai: "ทู", ipa: "tʰūː", gloss: "mackerel" }], boundaries: [3, 6, 9], gloss: "the cat eats mackerel" } },
  { kind: "phrase", id: "phrase:ไปกินข้าวเช้า", unit: 14, display: "ไปกินข้าวเช้า", initialIpa: null, finalIpa: null, consonantClass: null, drillable: true, metadata: { syllables: [{ thai: "ไป", ipa: "pāj", gloss: "go" }, { thai: "กิน", ipa: "kīn", gloss: "eat" }, { thai: "ข้าว", ipa: "kʰâːw", gloss: "rice" }, { thai: "เช้า", ipa: "tɕʰáːw", gloss: "morning" }], boundaries: [2, 5, 9], gloss: "go eat breakfast" } },
];

// Unit 1 is lesson-only ("complete when read") — see LessonMarkerItem doc comment.
export const UNIT_1_LESSON_MARKER_ID = "lesson-marker:unit-1";

export const LESSON_MARKERS: import("./types").LessonMarkerItem[] = [
  {
    kind: "lesson-marker",
    id: UNIT_1_LESSON_MARKER_ID,
    unit: 1,
    display: "Unit 1 — IPA primer & syllable anatomy (read)",
    initialIpa: null,
    finalIpa: null,
    consonantClass: null,
    drillable: false,
    metadata: {},
  },
];

export const ALL_THAI_ITEMS: ThaiItem[] = [
  ...LESSON_MARKERS,
  ...ALL_CONSONANTS,
  ...FINALS,
  ...ALL_VOWELS,
  ...WORD_BANK,
  ...TONE_WORDS,
  ...SPECIAL_SIGNS,
  ...LEADER_WORDS,
  ...NUMERALS,
  ...PHRASES,
];

// Units 1-14 built (12-14 added in M14 — the FINAL Read-Thai milestone; the
// 14-unit course is now complete). Units 10 and 11 have no items of their own
// unit:10/11 — like unit 6's letter-final drill (sourced from units 2-5),
// their drill subjects are the unit-6 word bank, drilled inside the unit
// 10/11 session per lib/thai/reachability.ts.
export const BUILT_UNITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export const TOTAL_UNITS = 14;

export const UNIT_TITLES: Record<number, string> = {
  1: "IPA primer & syllable anatomy",
  2: "Mid-class consonants",
  3: "High-class consonants",
  4: "Low-class consonants A",
  5: "Low-class consonants B",
  6: "Finals — the 8 endings",
  7: "Vowels A — core short/long pairs",
  8: "Vowels B — diphthongs & shape-changers",
  9: "Tone ear",
  10: "Tone rules",
  11: "Syllable assembly",
  12: "Special signs & silent leaders",
  13: "Numerals",
  14: "Spaceless reading",
};

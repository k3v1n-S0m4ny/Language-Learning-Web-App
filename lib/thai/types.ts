// Shared shapes for the Read-Thai course runtime (drills, unit map, stats).
// Content shapes (ConsonantItem, VowelItem, …) live in seed/thai/types.ts —
// these are the per-Learner *state* shapes layered on top.

export type ActiveMode = "mandarin" | "thai";

export interface UnitSummary {
  unit: number;
  title: string;
  built: boolean; // false for units 9-14 (no content yet)
  totalItems: number; // drillable items in this unit (0 for unit 1)
  masteredItems: number;
  percentMastered: number; // 0-100, rounded
  unlocked: boolean; // drills reachable
  lessonOnly: boolean; // unit 1
  lessonComplete: boolean; // unit 1's "read" flag; true for units 2-8 once ≥1 item touched is not required — always true (lessons always readable)
}

export type DrillType =
  | "letter-sound"
  | "letter-class"
  | "letter-final"
  | "word-final"
  | "form-sound"
  | "audio-letter"
  | "audio-form"
  | "audio-tone";

export interface DrillOption {
  value: string;
  label: string;
}

export interface DrillQuestion {
  itemId: string;
  drillType: DrillType;
  // For audio-* drill types the prompt is empty and the learner hears
  // `audioUrl` instead; for every other drill type it's the Thai script/form.
  prompt: string;
  promptKind: "consonant" | "final" | "vowel" | "syllable" | "audio";
  gloss?: string; // word-bank items only, revealed after answering
  // Set for audio-* drillTypes (the clip IS the question) and, when present,
  // for any other drillType too (an optional "hear it" button on reveal) —
  // undefined until the M12 paid audio batch runs (A2/A4: audio drills must
  // degrade gracefully while audioUrl is still null).
  audioUrl?: string;
  correct: string; // value matching one DrillOption.value
  options: DrillOption[];
}

export interface DrillRound {
  unit: number;
  questions: DrillQuestion[];
}

export interface DrillAnswerResult {
  correct: boolean;
  newlyMastered: boolean;
  streak: number;
}

export interface DrillSummary {
  unit: number;
  total: number;
  correctCount: number;
  newlyMasteredItemIds: string[];
  percentMastered: number;
  unitUnlockedNext: number | null; // set when this session pushed the unit over 90%
}

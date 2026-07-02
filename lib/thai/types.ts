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
  | "form-sound";

export interface DrillOption {
  value: string;
  label: string;
}

export interface DrillQuestion {
  itemId: string;
  drillType: DrillType;
  prompt: string; // the Thai script / form shown to the learner
  promptKind: "consonant" | "final" | "vowel" | "syllable";
  gloss?: string; // word-bank items only, revealed after answering
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

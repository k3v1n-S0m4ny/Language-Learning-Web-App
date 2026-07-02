// Builds a round of ~15 MC drill questions for a unit, and scores answers.
// Sampling is weighted toward unmastered + least-recently-seen items (A6);
// distractors are drawn from "confusable" sets (same class / similar IPA /
// same vowel category) rather than uniform-random (A6). ฃ and ฅ are excluded
// by construction — every pool query filters drillable = true, and those two
// letters are the only drillable:false rows (seed/thai/items.ts).
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { thaiItems } from "@/lib/db/schema";
import { DRILL_ROUND_SIZE } from "./mastery";
import { getProgressByItemIds } from "./queries";
import { computeReachableIds } from "./reachability";
import type { DrillOption, DrillQuestion, DrillRound, DrillType } from "./types";

type ItemRow = typeof thaiItems.$inferSelect;

const FINAL_SOUNDS = ["k", "t", "p", "m", "n", "ŋ", "j", "w"] as const;
const FINAL_GROUPS: Record<string, string[]> = {
  k: ["k", "t", "p"],
  t: ["t", "k", "p"],
  p: ["p", "k", "t"],
  m: ["m", "n", "ŋ"],
  n: ["n", "m", "ŋ"],
  ŋ: ["ŋ", "m", "n"],
  j: ["j", "w"],
  w: ["w", "j"],
};

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pick<T>(arr: T[], n: number): T[] {
  return shuffled(arr).slice(0, n);
}

export function metadataOf(item: ItemRow): Record<string, unknown> {
  return (item.metadata ?? {}) as Record<string, unknown>;
}

// The correct answer for a given item + drill type — the single source of
// truth used both to build a question's options (buildQuestion below) and to
// re-derive/verify an answer server-side in lib/thai/actions.ts::
// submitThaiAttempt, which never trusts a client-supplied "expected" value
// (M11 review round 2, HIGH fix).
export function expectedAnswerFor(item: ItemRow, drillType: DrillType): string | null {
  const meta = metadataOf(item);
  switch (drillType) {
    case "letter-sound":
      return item.initialIpa;
    case "letter-class":
      return item.consonantClass;
    case "letter-final":
      return item.finalIpa;
    case "word-final":
      return (meta.finalSound as string | undefined) ?? null;
    case "form-sound":
      // Forward direction only (form shown, learner picks the sound) — see
      // the M11 review round 2 HIGH fix note on why the earlier bidirectional
      // (form<->sound) version was removed: verifying an answer server-side
      // requires a direction that's a pure function of (item, drillType),
      // not a client-supplied "reversed" flag.
      return item.initialIpa;
    default:
      return null;
  }
}

// Weighted pick **with replacement** from a scored pool — nothing is removed
// from `entries` between iterations, so the same subject can be picked more
// than once in a round (necessary: round size is fixed at ~15 regardless of
// pool size, and some pools, e.g. unit 2's 9 mid-class consonants, are
// smaller than that). The only repeat-avoidance is skipping an exact
// back-to-back repeat of the immediately previous question when the pool
// has more than one entry.
function weightedPick<T>(
  entries: { value: T; weight: number }[],
  previous: T | null,
  isSame: (a: T, b: T) => boolean,
): T {
  const pool = entries.filter(
    (e) => previous === null || !isSame(e.value, previous) || entries.length === 1,
  );
  const usable = pool.length ? pool : entries;
  const total = usable.reduce((sum, e) => sum + e.weight, 0);
  let r = Math.random() * total;
  for (const e of usable) {
    r -= e.weight;
    if (r <= 0) return e.value;
  }
  return usable[usable.length - 1].value;
}

async function fetchUnitItems(unit: number): Promise<ItemRow[]> {
  return db
    .select()
    .from(thaiItems)
    .where(and(eq(thaiItems.unit, unit), eq(thaiItems.drillable, true)));
}

async function fetchConsonantsWithFinal(): Promise<ItemRow[]> {
  const rows = await db
    .select()
    .from(thaiItems)
    .where(and(eq(thaiItems.kind, "consonant"), eq(thaiItems.drillable, true)));
  return rows.filter((r) => r.finalIpa !== null);
}

interface Subject {
  item: ItemRow;
  drillTypes: DrillType[];
}

// Subject selection is driven entirely by computeReachableIds (lib/thai/
// reachability.ts) — there is no second, hand-written "is this reachable"
// filter here to drift out of sync with it (M11 review round 3: this is
// exactly the class of bug that shipped twice — a thai_items row counted in
// a unit's denominator with no actual path to becoming a drill subject).
async function buildSubjectPool(unit: number): Promise<Subject[]> {
  if (unit >= 2 && unit <= 5) {
    const items = await fetchUnitItems(unit);
    const reachable = computeReachableIds(unit, items);
    return items
      .filter((item) => reachable.has(item.id))
      .map((item) => ({ item, drillTypes: ["letter-sound", "letter-class"] as DrillType[] }));
  }
  if (unit === 6) {
    const [unit6Items, consonantsWithFinal] = await Promise.all([
      fetchUnitItems(6),
      fetchConsonantsWithFinal(),
    ]);
    const reachable = computeReachableIds(6, [...unit6Items, ...consonantsWithFinal]);
    const words = unit6Items.filter((i) => i.kind === "syllable" && reachable.has(i.id));
    const consonants = consonantsWithFinal.filter((i) => reachable.has(i.id));
    return [
      ...consonants.map((item) => ({ item, drillTypes: ["letter-final"] as DrillType[] })),
      ...words.map((item) => ({ item, drillTypes: ["word-final"] as DrillType[] })),
    ];
  }
  if (unit === 7 || unit === 8) {
    const items = await fetchUnitItems(unit);
    const reachable = computeReachableIds(unit, items);
    return items
      .filter((item) => reachable.has(item.id))
      .map((item) => ({ item, drillTypes: ["form-sound"] as DrillType[] }));
  }
  return [];
}

function consonantDistractors(pool: ItemRow[], correct: ItemRow, field: "initialIpa"): DrillOption[] {
  const sameClass = pool.filter(
    (p) => p.id !== correct.id && p.consonantClass === correct.consonantClass && p[field],
  );
  const others = pool.filter((p) => p.id !== correct.id && p[field]);
  const seen = new Set([correct[field]]);
  const options: DrillOption[] = [];
  for (const candidate of [...pick(sameClass, 6), ...pick(others, 10)]) {
    const value = candidate[field] as string;
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: value });
    if (options.length >= 3) break;
  }
  return options;
}

function finalSoundDistractors(correct: string): DrillOption[] {
  const group = FINAL_GROUPS[correct] ?? [...FINAL_SOUNDS];
  const preferred = group.filter((s) => s !== correct);
  const rest = FINAL_SOUNDS.filter((s) => s !== correct && !preferred.includes(s));
  const chosen: string[] = [];
  for (const s of [...pick(preferred, preferred.length), ...pick(rest, rest.length)]) {
    if (chosen.length >= 3) break;
    if (!chosen.includes(s)) chosen.push(s);
  }
  return chosen.map((v) => ({ value: v, label: v }));
}

function vowelDistractors(pool: ItemRow[], correct: ItemRow, byForm: boolean): DrillOption[] {
  const correctValue = byForm ? correct.display : correct.initialIpa!;
  const correctMeta = metadataOf(correct);
  const sameCategory = pool.filter((p) => {
    if (p.id === correct.id) return false;
    const m = metadataOf(p);
    return m.category === correctMeta.category;
  });
  const others = pool.filter((p) => p.id !== correct.id);
  const seen = new Set([correctValue]);
  const options: DrillOption[] = [];
  for (const candidate of [...pick(sameCategory, 6), ...pick(others, 10)]) {
    const value = byForm ? candidate.display : candidate.initialIpa;
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: value });
    if (options.length >= 3) break;
  }
  return options;
}

function buildQuestion(subject: Subject, drillType: DrillType, pool: ItemRow[]): DrillQuestion | null {
  const item = subject.item;
  const meta = metadataOf(item);
  const correct = expectedAnswerFor(item, drillType);
  if (correct === null) return null;

  if (drillType === "letter-sound") {
    const distractors = consonantDistractors(pool, item, "initialIpa");
    if (distractors.length < 3) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "consonant",
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  if (drillType === "letter-class") {
    const allClasses = ["mid", "high", "low"];
    const distractors = allClasses
      .filter((c) => c !== correct)
      .map((c) => ({ value: c, label: c }));
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "consonant",
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  if (drillType === "letter-final") {
    const distractors = finalSoundDistractors(correct);
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "consonant",
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  if (drillType === "word-final") {
    const distractors = finalSoundDistractors(correct);
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "syllable",
      gloss: meta.gloss as string,
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  if (drillType === "form-sound") {
    // Forward direction only — prompt is the Thai vowel form, options are IPA
    // sounds. See expectedAnswerFor's comment for why bidirectionality was
    // dropped (M11 review round 2, HIGH fix).
    const distractors = vowelDistractors(pool, item, false);
    if (distractors.length < 3) return null;
    return {
      itemId: item.id,
      drillType,
      prompt: item.display,
      promptKind: "vowel",
      correct,
      options: shuffled([{ value: correct, label: correct }, ...distractors]),
    };
  }

  return null;
}

export async function buildDrillRound(learnerId: string, unit: number): Promise<DrillRound> {
  const subjects = await buildSubjectPool(unit);
  if (!subjects.length) return { unit, questions: [] };

  const itemIds = subjects.map((s) => s.item.id);
  const progress = await getProgressByItemIds(learnerId, itemIds);
  const now = Date.now();

  const scored: { value: Subject; weight: number }[] = subjects.map((s) => {
    const p = progress.get(s.item.id);
    const mastered = p?.masteredAt != null;
    const lastSeenMs = p?.lastSeen ? p.lastSeen.getTime() : 0;
    const ageMs = now - lastSeenMs;
    const ageBonus = Math.min(ageMs / (24 * 60 * 60 * 1000), 14); // cap at 14 "days"
    const weight = (mastered ? 0.3 : 1.5) + ageBonus * 0.15 + 0.05;
    return { value: s, weight };
  });

  const pool = subjects.map((s) => s.item);
  const questions: DrillQuestion[] = [];
  let previous: Subject | null = null;

  let guard = 0;
  while (questions.length < DRILL_ROUND_SIZE && guard < DRILL_ROUND_SIZE * 8) {
    guard++;
    const subject: Subject = weightedPick<Subject>(
      scored,
      previous,
      (a, b) => a.item.id === b.item.id,
    );
    const drillType = subject.drillTypes[Math.floor(Math.random() * subject.drillTypes.length)];
    const question = buildQuestion(subject, drillType, pool);
    if (!question) continue;
    questions.push(question);
    previous = subject;
  }

  return { unit, questions };
}

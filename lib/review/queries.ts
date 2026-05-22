import { and, asc, count, eq, lte, notExists, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  cards,
  cardTags,
  learnerSettings,
  reviewStates,
  tags,
  words,
} from "@/lib/db/schema";
import {
  createEmptyCard,
  getScheduler,
  hydrateFsrsCard,
  previewIntervals,
} from "./scheduler";
import type { IntervalHints, SessionCounts, StudyCard } from "./types";

// Start of the current UTC day. The new-card daily cap resets at UTC midnight
// (≈07:00 Thailand) — see active-plan.md A9.
function startOfUtcDay(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

// Read the Learner's settings, creating the default row only if missing. Common
// case (row exists) is a single SELECT — no write on every request.
export async function ensureLearnerSettings(learnerId: string) {
  const [existing] = await db
    .select()
    .from(learnerSettings)
    .where(eq(learnerSettings.learnerId, learnerId));
  if (existing) return existing;

  await db.insert(learnerSettings).values({ learnerId }).onConflictDoNothing();
  const [created] = await db
    .select()
    .from(learnerSettings)
    .where(eq(learnerSettings.learnerId, learnerId));
  return created;
}

// The three session counts. Run in parallel (one round-trip wave) using plain
// query-builder calls — type-checked, no hand-written SQL.
async function fetchRawCounts(
  learnerId: string,
  now: Date,
): Promise<{ due: number; newToday: number; unseen: number }> {
  const dayStart = startOfUtcDay(now);
  const [dueRow, newRow, unseenRow] = await Promise.all([
    db
      .select({ n: count() })
      .from(reviewStates)
      .where(
        and(eq(reviewStates.learnerId, learnerId), lte(reviewStates.due, now)),
      ),
    db
      .select({ n: count() })
      .from(reviewStates)
      .where(
        and(
          eq(reviewStates.learnerId, learnerId),
          sql`${reviewStates.createdAt} >= ${dayStart}`,
        ),
      ),
    db
      .select({ n: count() })
      .from(cards)
      .where(
        notExists(
          db
            .select({ one: sql`1` })
            .from(reviewStates)
            .where(
              and(
                eq(reviewStates.cardId, cards.id),
                eq(reviewStates.learnerId, learnerId),
              ),
            ),
        ),
      ),
  ]);

  return {
    due: dueRow[0]?.n ?? 0,
    newToday: newRow[0]?.n ?? 0,
    unseen: unseenRow[0]?.n ?? 0,
  };
}

function toCounts(
  raw: { due: number; newToday: number; unseen: number },
  newCardsPerDay: number,
): SessionCounts {
  const capRemaining = Math.max(0, newCardsPerDay - raw.newToday);
  return { dueCount: raw.due, newRemaining: Math.min(capRemaining, raw.unseen) };
}

export async function getSessionCounts(
  learnerId: string,
  now: Date = new Date(),
): Promise<SessionCounts> {
  const settings = await ensureLearnerSettings(learnerId);
  const raw = await fetchRawCounts(learnerId, now);
  return toCounts(raw, settings.newCardsPerDay);
}

// Load a Card's Words (ordered) and Tag names in parallel.
async function loadStudyCard(cardId: string): Promise<StudyCard | null> {
  const [card] = await db.select().from(cards).where(eq(cards.id, cardId));
  if (!card) return null;

  const [wordRows, tagRows] = await Promise.all([
    db
      .select()
      .from(words)
      .where(eq(words.cardId, cardId))
      .orderBy(asc(words.position)),
    db
      .select({ name: tags.name })
      .from(cardTags)
      .innerJoin(tags, eq(cardTags.tagId, tags.id))
      .where(eq(cardTags.cardId, cardId)),
  ]);

  return {
    id: card.id,
    headword: card.headword,
    isPhrase: card.isPhrase,
    wholeGloss: card.wholeGloss,
    wholePinyin: card.wholePinyin,
    wholeAudioUrl: card.wholeAudioUrl,
    words: wordRows.map((w) => ({
      id: w.id,
      position: w.position,
      hanzi: w.hanzi,
      gloss: w.gloss,
      pinyin: w.pinyin,
      audioUrl: w.audioUrl,
    })),
    tags: tagRows.map((t) => t.name),
  };
}

// Everything the study screen needs, in as few round-trips as possible:
//   wave 1: settings + (due-id, new-id, raw counts) in parallel
//   wave 2: the chosen Card's words+tags+fsrs-state in parallel
// The fsrs_card jsonb stays server-side; only the formatted hints cross to the client.
export async function getStudyScreenData(
  learnerId: string,
  now: Date = new Date(),
): Promise<{
  counts: SessionCounts;
  card: StudyCard | null;
  hints: IntervalHints | null;
}> {
  const [settings, raw, dueState, newCardRow] = await Promise.all([
    ensureLearnerSettings(learnerId),
    fetchRawCounts(learnerId, now),
    db
      .select({ cardId: reviewStates.cardId })
      .from(reviewStates)
      .where(
        and(eq(reviewStates.learnerId, learnerId), lte(reviewStates.due, now)),
      )
      .orderBy(asc(reviewStates.due))
      .limit(1),
    db
      .select({ id: cards.id })
      .from(cards)
      .where(
        notExists(
          db
            .select({ one: sql`1` })
            .from(reviewStates)
            .where(
              and(
                eq(reviewStates.cardId, cards.id),
                eq(reviewStates.learnerId, learnerId),
              ),
            ),
        ),
      )
      .orderBy(asc(cards.createdAt))
      .limit(1),
  ]);

  const counts = toCounts(raw, settings.newCardsPerDay);

  // Due Cards first; else a new Card if the daily cap allows.
  const dueCardId = dueState[0]?.cardId;
  const newCardId = counts.newRemaining > 0 ? newCardRow[0]?.id : undefined;
  const chosenId = dueCardId ?? newCardId;

  if (!chosenId) return { counts, card: null, hints: null };

  const [card, stateRow] = await Promise.all([
    loadStudyCard(chosenId),
    db
      .select({ fsrsCard: reviewStates.fsrsCard })
      .from(reviewStates)
      .where(
        and(
          eq(reviewStates.learnerId, learnerId),
          eq(reviewStates.cardId, chosenId),
        ),
      ),
  ]);

  if (!card) return { counts, card: null, hints: null };

  const scheduler = getScheduler(settings.requestRetention);
  const fsrsCard = stateRow[0]
    ? hydrateFsrsCard(stateRow[0].fsrsCard)
    : createEmptyCard(now);
  const hints = previewIntervals(scheduler, fsrsCard, now);

  return { counts, card, hints };
}

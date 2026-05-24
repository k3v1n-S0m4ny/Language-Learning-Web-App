import { and, asc, count, eq, gt, lte, notExists, sql } from "drizzle-orm";
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
import { endOfThailandDay, startOfThailandDay } from "./time";
import type { IntervalHints, SessionCounts, StudyCard } from "./types";

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
  const dayStart = startOfThailandDay(now);
  // "Due today" = overdue cards (due <= now) PLUS same-day learning/relearning
  // steps that fire later today (due <= end-of-Thailand-day).  We use the same
  // predicate as the queue selection below so the header count always matches
  // what is actually served (A6).
  //
  // Safety (A5): ts-fsrs v5.4.0 (enable_short_term=true, learning_steps=["1m","10m"],
  // relearning_steps=["10m"]) was probed with node -e.  Findings:
  //   • New/Learning cards rated Again/Hard/Good → state=Learning, due ≤ now+10m (intraday) ✓
  //   • New card rated Easy → state=Review, due = +8 days ✗  (excluded — well past today)
  //   • Review card rated Again → state=Relearning, due = now+10m (intraday) ✓
  //   • Review card rated Hard/Good/Easy → state=Review, due ≥ now+27d ✗ (excluded)
  //   • Relearning + Again → state=Relearning, due = now+10m (intraday) ✓
  //   • Relearning + Hard → state=Relearning, due = now+15m (intraday) ✓
  //   • Relearning + Good → state=Review, due = +1 day ✗  (excluded)
  //   • Relearning + Easy → state=Review, due = +2 days ✗  (excluded)
  // Therefore endOfThailandDay correctly includes {Learning, Relearning} intraday steps
  // and excludes all graduated Review-state intervals.  No state-filter fallback needed.
  const dayEnd = endOfThailandDay(now);
  const [dueRow, newRow, unseenRow] = await Promise.all([
    db
      .select({ n: count() })
      .from(reviewStates)
      .where(
        and(eq(reviewStates.learnerId, learnerId), lte(reviewStates.due, dayEnd)),
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
    // Placeholder — getStudyScreenData overwrites this with the real value once
    // the fsrs_card row is available. New (unseen) cards have lapses = 0.
    lapses: 0,
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
  // Broaden eligibility to end-of-Thailand-day so same-day learning/relearning
  // steps (Again → +1 min, Hard → +6 min, etc.) are served within the session
  // rather than waiting for wall-clock time to catch up (A1, A2).
  // Graduated Review-state cards rated Hard/Good/Easy land ≥ 27 days out, so
  // they are never pulled forward by this bound (A3).  See fetchRawCounts for
  // the full ts-fsrs v5.4.0 probe findings (A5).
  const dayEnd = endOfThailandDay(now);

  // === A-series queue selection (M9/A4) ======================================
  // Three tiers run in the same Promise.all wave (no extra round-trip):
  //
  //   Tier 1 — READY:        due <= now.  Overdue + intraday learning steps
  //                          whose wall-clock timer has already elapsed.
  //   Tier 2 — NEW:          unseen cards ordered by deck_order ASC (CSV row
  //                          order), created_at as tiebreak. Only served when
  //                          the daily new-card cap allows (newRemaining > 0).
  //   Tier 3 — FUTURE-TODAY: due > now AND due <= dayEnd. The failed card's
  //                          ~1-minute learning step will land here. Serving
  //                          it prevents a dead-end when only one card remains
  //                          and no ready or new card is available.
  //
  // Priority: readyId > (cap allows ? newId : skip) > futureTodayId.
  //
  // WHY this fixes immediate-repeat (commit ac38cce): when a brand-new card is
  // rated Again, FSRS schedules it ~1 min out (Learning step). On the very next
  // render Tier 1 finds nothing ready (the failed card's due is ~1 min future),
  // Tier 2 advances the next new card, and the failed card only resurfaces when
  // its timer elapses — exactly the natural learning-step delay, not instantly.
  // Tier 3 guarantees a session with a single card never goes blank.
  // ============================================================================
  const [settings, raw, readyRow, newCardRow, futureTodayRow] = await Promise.all([
    ensureLearnerSettings(learnerId),
    fetchRawCounts(learnerId, now),
    // Tier 1: cards whose due timestamp has already passed.
    db
      .select({ cardId: reviewStates.cardId })
      .from(reviewStates)
      .where(
        and(eq(reviewStates.learnerId, learnerId), lte(reviewStates.due, now)),
      )
      .orderBy(asc(reviewStates.due))
      .limit(1),
    // Tier 2: unseen cards ordered by CSV deck position.
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
      .orderBy(asc(cards.deckOrder), asc(cards.createdAt))
      .limit(1),
    // Tier 3: intraday learning-step cards not yet ready (due > now, <= dayEnd).
    db
      .select({ cardId: reviewStates.cardId })
      .from(reviewStates)
      .where(
        and(
          eq(reviewStates.learnerId, learnerId),
          gt(reviewStates.due, now),
          lte(reviewStates.due, dayEnd),
        ),
      )
      .orderBy(asc(reviewStates.due))
      .limit(1),
  ]);

  const counts = toCounts(raw, settings.newCardsPerDay);

  const readyId = readyRow[0]?.cardId;
  const newCardId = counts.newRemaining > 0 ? newCardRow[0]?.id : undefined;
  const futureTodayId = futureTodayRow[0]?.cardId;
  const chosenId = readyId ?? (counts.newRemaining > 0 ? newCardId : undefined) ?? futureTodayId;

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

  const scheduler = getScheduler();
  const fsrsCard = stateRow[0]
    ? hydrateFsrsCard(stateRow[0].fsrsCard)
    : createEmptyCard(now);
  const hints = previewIntervals(scheduler, fsrsCard, now);

  // Populate lapses from the persisted FSRS card so the client can show the
  // leech badge without receiving the full fsrs_card blob.
  card.lapses = fsrsCard.lapses;

  return { counts, card, hints };
}

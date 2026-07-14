"use server";

import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cards, learnerSettings, reviewLogs, reviewStates } from "@/lib/db/schema";
import { isCardEligible } from "./hsk-gate";
import { getHskGate } from "./queries";
import {
  applyRating,
  createEmptyCard,
  getScheduler,
  hydrateFsrsCard,
} from "./scheduler";
import type { RatingValue } from "./types";

// Apply a Learner's rating to a Card: advance its FSRS schedule and record the
// review. Server Actions are reachable by direct POST, so auth is enforced here.
export async function submitReview(cardId: string, rating: RatingValue) {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");

  // Server Actions are reachable by direct POST, so the rating is untrusted at
  // runtime despite its type — reject anything outside the four FSRS grades.
  if (![1, 2, 3, 4].includes(rating)) throw new Error("Invalid rating");

  const now = new Date();
  const scheduler = getScheduler();

  // Re-read the state here (the study screen already read it for the hint preview)
  // so the rating is applied to the freshest row — this avoids a lost update and
  // is intentional, not a redundant query to remove.
  const [existing] = await db
    .select()
    .from(reviewStates)
    .where(
      and(
        eq(reviewStates.learnerId, learnerId),
        eq(reviewStates.cardId, cardId),
      ),
    );

  // No review_states row means this rating would INTRODUCE the Card, so the HSK gate
  // applies. A Server Action is reachable by direct POST, so the page having served
  // the Card is not proof it was allowed — re-check here, exactly as the Thai course
  // re-derives its unit gate in lib/thai/actions.ts:173-183.
  //
  // Already-introduced Cards skip this entirely: they were admitted while their band
  // was open, and a locked band must never strand a Card the Learner is mid-way through.
  if (!existing) {
    const [gate, [card]] = await Promise.all([
      getHskGate(learnerId),
      db
        .select({ hskLevel: cards.hskLevel })
        .from(cards)
        .where(eq(cards.id, cardId)),
    ]);
    if (!card) throw new Error("Card not found");
    if (!isCardEligible(card.hskLevel, gate.unlockedBand)) {
      throw new Error("HSK band locked");
    }
  }

  const fsrsCard = existing
    ? hydrateFsrsCard(existing.fsrsCard)
    : createEmptyCard(now);

  const { card, log } = applyRating(scheduler, fsrsCard, now, rating);

  // neon-http has no interactive transactions; db.batch runs both writes as one
  // HTTP transaction.
  await db.batch([
    db
      .insert(reviewStates)
      .values({
        learnerId,
        cardId,
        due: card.due,
        fsrsCard: card,
        lastReview: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [reviewStates.learnerId, reviewStates.cardId],
        set: {
          due: card.due,
          fsrsCard: card,
          lastReview: now,
          updatedAt: now,
        },
      }),
    db.insert(reviewLogs).values({
      learnerId,
      cardId,
      rating,
      log,
    }),
  ]);

  // Re-render so the next Card (or the empty state) is shown.
  refresh();
}

// Update the signed-in Learner's new-cards-per-day cap. Like submitReview, this is
// a directly-POSTable server action: it derives the Learner from the session (never
// a caller-supplied id) and validates the value before writing.
export async function setNewCardsPerDay(value: number) {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");

  if (!Number.isInteger(value) || value < 0 || value > 1000) {
    throw new Error("Invalid new-cards-per-day value");
  }

  await db
    .update(learnerSettings)
    .set({ newCardsPerDay: value })
    .where(eq(learnerSettings.learnerId, learnerId));
}

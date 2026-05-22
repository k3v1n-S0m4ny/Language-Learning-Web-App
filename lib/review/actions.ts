"use server";

import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { learnerSettings, reviewLogs, reviewStates } from "@/lib/db/schema";
import {
  applyRating,
  createEmptyCard,
  getScheduler,
  hydrateFsrsCard,
} from "./scheduler";
import { ensureLearnerSettings } from "./queries";
import type { RatingValue } from "./types";

// Apply a Learner's rating to a Card: advance its FSRS schedule and record the
// review. Server Actions are reachable by direct POST, so auth is enforced here.
export async function submitReview(cardId: string, rating: RatingValue) {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");

  const now = new Date();
  const settings = await ensureLearnerSettings(learnerId);
  const scheduler = getScheduler(settings.requestRetention);

  const [existing] = await db
    .select()
    .from(reviewStates)
    .where(
      and(
        eq(reviewStates.learnerId, learnerId),
        eq(reviewStates.cardId, cardId),
      ),
    );

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

// Update a Learner's settings (kept here for completeness; not yet surfaced in UI).
export async function setNewCardsPerDay(learnerId: string, value: number) {
  await db
    .update(learnerSettings)
    .set({ newCardsPerDay: value })
    .where(eq(learnerSettings.learnerId, learnerId));
}

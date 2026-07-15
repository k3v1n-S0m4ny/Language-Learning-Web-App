"use server";

import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  atCards,
  atReviewLogs,
  atReviewStates,
  learnerSettings,
} from "@/lib/db/schema";
import { ensureLearnerSettings } from "@/lib/review/queries";
import {
  applyRating,
  createEmptyCard,
  getScheduler,
  hydrateFsrsCard,
} from "@/lib/review/scheduler";
import { thaiDateKey } from "@/lib/review/time";
import type { RatingValue } from "@/lib/review/types";
import { isAdvancedThaiLearner } from "./access";

/**
 * Apply a rating to an Advanced Thai card: advance its FSRS schedule, record the
 * review.
 *
 * A Server Action is a public POST endpoint. It does not matter that the only
 * route that renders these cards is already gated — the action can be called
 * without ever loading that route. So the allowlist is re-checked HERE, on the
 * signed-in session's own email, and this is the check that actually enforces
 * that Advanced Thai is the owner's personal course. Everything the UI does is
 * decoration on top of it.
 */
export async function submitAdvancedReview(cardId: string, rating: RatingValue) {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");
  if (!isAdvancedThaiLearner(session.user?.email)) throw new Error("Unauthorized");

  // Typed as RatingValue, but the type is erased at the network boundary — a
  // direct POST can send anything.
  if (![1, 2, 3, 4].includes(rating)) throw new Error("Invalid rating");

  const now = new Date();
  const scheduler = getScheduler();

  // The card must exist. Without this an unknown id would fall through to the
  // insert and fail on the FK with a Postgres error rather than a clear one.
  const [card] = await db
    .select({ id: atCards.id })
    .from(atCards)
    .where(eq(atCards.id, cardId));
  if (!card) throw new Error("Card not found");

  // Re-read the state so the rating applies to the freshest row (the study screen
  // already read it for the hint preview; this avoids a lost update and is
  // deliberate, not a redundant query).
  const [existing] = await db
    .select()
    .from(atReviewStates)
    .where(
      and(
        eq(atReviewStates.learnerId, learnerId),
        eq(atReviewStates.cardId, cardId),
      ),
    );

  const fsrsCard = existing
    ? hydrateFsrsCard(existing.fsrsCard)
    : createEmptyCard(now);

  const { card: next, log } = applyRating(scheduler, fsrsCard, now, rating);

  // neon-http has no interactive transactions; db.batch runs both writes as one
  // HTTP transaction.
  await db.batch([
    db
      .insert(atReviewStates)
      .values({
        learnerId,
        cardId,
        due: next.due,
        fsrsCard: next,
        lastReview: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [atReviewStates.learnerId, atReviewStates.cardId],
        set: {
          due: next.due,
          fsrsCard: next,
          lastReview: now,
          updatedAt: now,
        },
      }),
    db.insert(atReviewLogs).values({ learnerId, cardId, rating, log }),
  ]);

  refresh();
}

/**
 * Grant a today-only new-card top-up, requested from the "all caught up" screen.
 *
 * This does NOT touch the standing newCardsPerDay preference. It records a bonus
 * stamped with today's Thailand date; the Advanced Thai read layer honors it only
 * while that stamp is today, so it expires overnight on its own. The bonus lives
 * on the shared learner_settings row but is read only by the Advanced Thai
 * queries, so it does not inflate the Mandarin/Read-Thai intake.
 *
 * Like submitAdvancedReview, this is a public POST endpoint — the allowlist
 * re-check on the session's own email is the real enforcement.
 */
export async function addNewCardsToday(amount: number) {
  const session = await auth();
  const learnerId = session?.user?.id;
  if (!learnerId) throw new Error("Unauthorized");
  if (!isAdvancedThaiLearner(session.user?.email)) throw new Error("Unauthorized");

  // Typed as number, but erased at the network boundary — a direct POST can send
  // anything. Bound a single top-up to a sane batch.
  if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
    throw new Error("Invalid amount");
  }

  const today = thaiDateKey(new Date());
  const settings = await ensureLearnerSettings(learnerId);
  const priorBonus = settings.bonusNewCardsDate === today ? settings.bonusNewCards : 0;
  // Clamp to the same ceiling setNewCardsPerDay uses for the standing limit.
  const nextBonus = Math.min(1000, priorBonus + amount);

  await db
    .update(learnerSettings)
    .set({ bonusNewCards: nextBonus, bonusNewCardsDate: today })
    .where(eq(learnerSettings.learnerId, learnerId));

  refresh();
}

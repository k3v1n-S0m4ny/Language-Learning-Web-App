/**
 * Dev-only: backdate a Learner's Review States so their Cards become due now, for
 * building a round without waiting real days.
 *
 *   npm run dev:fast-forward -- learner@example.com
 *
 * Backdates review_states.due to one hour ago. There is no second copy of the due
 * date to keep in sync any more — the FSRS jsonb blob that used to hold one is
 * gone, and `due` is the whole schedule. config() runs before the db client is
 * built so DATABASE_URL is read.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";

const conn = neon(process.env.DATABASE_URL!);
const db = drizzle(conn, { schema });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run dev:fast-forward -- <learner-email>");
    process.exit(1);
  }

  const [learner] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()));

  if (!learner) {
    console.error(`No Learner found for ${email}`);
    process.exit(1);
  }

  const past = new Date(Date.now() - 60 * 60 * 1000); // one hour ago

  const updated = await db
    .update(schema.reviewStates)
    .set({ due: past })
    .where(eq(schema.reviewStates.learnerId, learner.id))
    .returning({ cardId: schema.reviewStates.cardId });

  console.log(
    `Backdated ${updated.length} Review State(s) for ${email} to ${past.toISOString()}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

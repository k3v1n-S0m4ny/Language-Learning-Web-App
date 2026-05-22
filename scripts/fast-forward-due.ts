/**
 * Dev-only: backdate a Learner's Review States so their Cards become due now, for
 * testing the "due first" branch of the study screen without waiting real days.
 *
 *   npm run dev:fast-forward -- learner@example.com
 *
 * Backdates both review_states.due and the due inside fsrs_card (jsonb) to one hour
 * ago. config() runs before the db client is built so DATABASE_URL is read.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
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
    .set({
      due: past,
      // Keep the jsonb due in sync so ts-fsrs sees the same backdated date.
      fsrsCard: sql`jsonb_set(${schema.reviewStates.fsrsCard}, '{due}', to_jsonb(${past.toISOString()}::text))`,
    })
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

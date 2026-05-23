/**
 * One-time migration: set requestRetention to 0.85 for all existing learner_settings
 * rows (previously defaulted to 0.9). The column is now vestigial — the scheduler
 * uses the global REQUEST_RETENTION constant — but keeping it consistent avoids
 * confusion when reading the table directly.
 *
 * Run once: `tsx scripts/migrate-retention.ts`
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { learnerSettings } from "../lib/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function main() {
  const result = await db
    .update(learnerSettings)
    .set({ requestRetention: 0.85 });
  console.log("Updated learner_settings rows:", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

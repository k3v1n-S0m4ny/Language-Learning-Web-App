--> The ladder redesign wipe. Every learner restarts at step 1: FSRS stability
--> and difficulty have no meaning under a fixed interval table, and there is no
--> honest mapping from a ts-fsrs Card to a ladder position. Clearing here rather
--> than in 0010 is load-bearing — 0010 adds NOT NULL columns with no default to
--> the log tables, which cannot succeed while rows exist.
--> Read-Thai (thai_progress / thai_attempts / thai_exam_sessions) is a separate
--> streak-based system and is deliberately NOT touched.
DELETE FROM "review_logs";--> statement-breakpoint
DELETE FROM "at_review_logs";--> statement-breakpoint
DELETE FROM "review_states";--> statement-breakpoint
DELETE FROM "at_review_states";--> statement-breakpoint
CREATE TABLE "hsk_unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" text NOT NULL,
	"band" integer NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hsk_unlocks" ADD CONSTRAINT "hsk_unlocks_learner_id_user_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hsk_unlocks_learner_band_uq" ON "hsk_unlocks" USING btree ("learner_id","band");--> statement-breakpoint
ALTER TABLE "at_review_logs" DROP COLUMN "rating";--> statement-breakpoint
ALTER TABLE "at_review_logs" DROP COLUMN "log";--> statement-breakpoint
ALTER TABLE "at_review_states" DROP COLUMN "fsrs_card";--> statement-breakpoint
ALTER TABLE "review_logs" DROP COLUMN "rating";--> statement-breakpoint
ALTER TABLE "review_logs" DROP COLUMN "log";--> statement-breakpoint
ALTER TABLE "review_states" DROP COLUMN "fsrs_card";
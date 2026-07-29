ALTER TABLE "at_review_logs" ADD COLUMN "step" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "at_review_logs" ADD COLUMN "passed" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "at_review_states" ADD COLUMN "step" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "at_review_states" ADD COLUMN "pass_streak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "at_review_states" ADD COLUMN "interval_rung" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "at_review_states" ADD COLUMN "demotions" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "review_logs" ADD COLUMN "step" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "review_logs" ADD COLUMN "passed" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "review_states" ADD COLUMN "step" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "review_states" ADD COLUMN "pass_streak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "review_states" ADD COLUMN "interval_rung" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "review_states" ADD COLUMN "demotions" integer DEFAULT 0 NOT NULL;
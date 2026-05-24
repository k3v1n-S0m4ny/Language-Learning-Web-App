ALTER TABLE "learner_settings" ALTER COLUMN "request_retention" SET DEFAULT 0.85;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "deck_order" integer DEFAULT 0 NOT NULL;
-- M12/A1: thai_progress gains a per-drillType dimension so a consonant's
-- letter-sound, letter-class, letter-final, and (new) audio-letter streaks no
-- longer blend into one row.
--
-- Data migration for existing rows (owner-approved rule, 2026-07-03): each
-- existing (learner, item) row is assigned its DOMINANT drillType, derived
-- from that learner+item's thai_attempts history — most attempts wins, ties
-- broken by most recent attempt. Rows with no attempt history fall back to
-- the item's kind-default drill type (consonant -> letter-sound, vowel ->
-- form-sound, syllable -> word-final, lesson-marker -> lesson-read, the
-- sentinel used by markUnit1LessonRead / LESSON_READ_DRILL_TYPE).
--
-- 1. Add the column nullable first (existing rows have none yet).
ALTER TABLE "thai_progress" ADD COLUMN "drill_type" text;
--> statement-breakpoint

-- 2. Backfill from the dominant drillType in thai_attempts, per (learner, item).
WITH ranked AS (
  SELECT
    learner_id,
    item_id,
    drill_type,
    COUNT(*) AS attempt_count,
    MAX(timestamp) AS last_attempt_at
  FROM thai_attempts
  GROUP BY learner_id, item_id, drill_type
),
dominant AS (
  SELECT DISTINCT ON (learner_id, item_id)
    learner_id,
    item_id,
    drill_type
  FROM ranked
  ORDER BY learner_id, item_id, attempt_count DESC, last_attempt_at DESC
)
UPDATE thai_progress p
SET drill_type = d.drill_type
FROM dominant d
WHERE p.learner_id = d.learner_id AND p.item_id = d.item_id;
--> statement-breakpoint

-- 3. Fill any remaining rows (no attempt history at all) with the item
--    kind's default drill type.
UPDATE thai_progress p
SET drill_type = CASE i.kind
  WHEN 'consonant' THEN 'letter-sound'
  WHEN 'vowel' THEN 'form-sound'
  WHEN 'syllable' THEN 'word-final'
  WHEN 'lesson-marker' THEN 'lesson-read'
  WHEN 'tone-word' THEN 'audio-tone'
  ELSE 'letter-sound'
END
FROM thai_items i
WHERE p.item_id = i.id AND p.drill_type IS NULL;
--> statement-breakpoint

-- 4. Enforce NOT NULL now that every row has a value.
ALTER TABLE "thai_progress" ALTER COLUMN "drill_type" SET NOT NULL;
--> statement-breakpoint

-- 5. Replace the (learner, item) unique constraint with (learner, item, drillType).
DROP INDEX IF EXISTS "thai_progress_learner_item_uq";
--> statement-breakpoint
CREATE UNIQUE INDEX "thai_progress_learner_item_drill_uq" ON "thai_progress" ("learner_id","item_id","drill_type");

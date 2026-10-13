-- Phase 3c (contract). Apply only after the code that reads topics through the embed is live in
-- production (Task 3.3). questions.category is dropped; its column grant and trigram index go with it.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'category') THEN
    IF EXISTS (SELECT 1 FROM questions WHERE topic_id IS NULL) THEN
      RAISE EXCEPTION 'topics_contract: % question(s) have no topic_id', (SELECT count(*) FROM questions WHERE topic_id IS NULL);
    END IF;
  END IF;
END $$;

ALTER TABLE questions ALTER COLUMN topic_id SET NOT NULL;
DROP TRIGGER IF EXISTS questions_set_topic ON questions;
DROP FUNCTION IF EXISTS set_question_topic();
DROP INDEX IF EXISTS idx_questions_category_trgm;
ALTER TABLE questions DROP COLUMN IF EXISTS category;

COMMIT;

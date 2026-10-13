-- Phase 1b (contract). Apply only after the code that stops reading list_id is live in production
-- (docs/migrations.md, expand/contract). ORDER MATTERS: questions.list_id is ON DELETE CASCADE to
-- question_lists, so the column goes first and the tables after. Never DELETE FROM question_lists:
-- it would delete the questions and their answers.
BEGIN;
-- fail fast instead of queueing behind a long-running transaction; re-run off-peak
SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'list_id') THEN
    IF EXISTS (SELECT 1 FROM questions WHERE list_id IS NOT NULL AND status <> 'rejected') THEN
      RAISE EXCEPTION 'drop_contest_schema: a contest question is not rejected; apply retire_contest_questions first';
    END IF;
  END IF;
END $$;

DROP FUNCTION IF EXISTS get_contest_analytics(UUID);
DROP INDEX IF EXISTS idx_questions_list_id;
ALTER TABLE questions DROP COLUMN IF EXISTS list_id;
DROP TABLE IF EXISTS question_list_confirmations;
DROP TABLE IF EXISTS list_entries;
DROP TABLE IF EXISTS question_lists;
DROP VIEW IF EXISTS client_questions;

COMMIT;

-- Deleting an account deletes the questions that account wrote (owner decision, 2026-10-14).
-- Ratings, comments, disputes and quiz_results on those questions already cascade from questions.
-- Before this, created_by_user was SET NULL, which left the question behind without an author.
-- list_entries.user_id has no cascade either, but the contest tables are dropped by
-- 20261013000200 and hold 0 rows in production, so it is left alone.
BEGIN;

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_created_by_user_fkey;
ALTER TABLE questions
  ADD CONSTRAINT questions_created_by_user_fkey
  FOREIGN KEY (created_by_user) REFERENCES users(id) ON DELETE CASCADE;

COMMIT;

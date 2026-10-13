-- Phase 2b/2c. Constraints are added NOT VALID then validated in the same transaction, so a
-- legacy row that breaks one aborts the migration instead of leaving a half-applied state.
-- Limits mirror the app's validators. Run the preflight query from the plan first.
BEGIN;

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_options_shape;
ALTER TABLE questions ADD CONSTRAINT questions_options_shape CHECK (
  CASE WHEN jsonb_typeof(options) = 'array'
       THEN jsonb_array_length(options) BETWEEN 2 AND 4 AND correct_index < jsonb_array_length(options)
       ELSE false END
) NOT VALID;
ALTER TABLE questions VALIDATE CONSTRAINT questions_options_shape;

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_prompt_length;
ALTER TABLE questions ADD CONSTRAINT questions_prompt_length CHECK (char_length(prompt) BETWEEN 1 AND 300) NOT VALID;
ALTER TABLE questions VALIDATE CONSTRAINT questions_prompt_length;

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_explanation_length;
ALTER TABLE questions ADD CONSTRAINT questions_explanation_length CHECK (explanation IS NULL OR char_length(explanation) <= 1000) NOT VALID;
ALTER TABLE questions VALIDATE CONSTRAINT questions_explanation_length;

-- -1 is the web per-question timer's timeout sentinel (recorded as a wrong answer); 0..3 are real options.
ALTER TABLE quiz_results DROP CONSTRAINT IF EXISTS quiz_results_answer_index_range;
ALTER TABLE quiz_results ADD CONSTRAINT quiz_results_answer_index_range CHECK (answer_index BETWEEN -1 AND 3) NOT VALID;
ALTER TABLE quiz_results VALIDATE CONSTRAINT quiz_results_answer_index_range;

ALTER TABLE question_disputes DROP CONSTRAINT IF EXISTS question_disputes_reason_length;
ALTER TABLE question_disputes ADD CONSTRAINT question_disputes_reason_length CHECK (char_length(reason) BETWEEN 1 AND 500) NOT VALID;
ALTER TABLE question_disputes VALIDATE CONSTRAINT question_disputes_reason_length;

ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_name_length;
ALTER TABLE groups ADD CONSTRAINT groups_name_length CHECK (char_length(name) BETWEEN 1 AND 50) NOT VALID;
ALTER TABLE groups VALIDATE CONSTRAINT groups_name_length;

ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_description_length;
ALTER TABLE groups ADD CONSTRAINT groups_description_length CHECK (description IS NULL OR char_length(description) <= 200) NOT VALID;
ALTER TABLE groups VALIDATE CONSTRAINT groups_description_length;

-- The history query in lib/db/results.ts orders by answered_at for one user; the unique index leads
-- with (user_id, question_id).
CREATE INDEX IF NOT EXISTS quiz_results_user_answered ON quiz_results (user_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS questions_status_created ON questions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS groups_owner_user ON groups (owner_user);

COMMIT;

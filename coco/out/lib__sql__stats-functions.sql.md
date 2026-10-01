# lib/sql/stats-functions.sql
lines:107 exports:
---
-- Aggregation functions for stats and leaderboards.
-- Idempotent: safe to re-run in the Supabase SQL Editor after lib/sql/accounts.sql.
-- Counting happens here instead of in the app because PostgREST caps each
-- response at 1000 rows, which silently truncated raw-row aggregation.
-- SECURITY DEFINER: quiz_results has no public read (each row's answer_index
-- would reveal the correct answer), so these run with the owner's rights and
-- return only totals. Limits are clamped because the public key can call them.

-- One account's totals and streaks.
-- streak: consecutive correct answers ending at the most recent answer.
-- best_streak: longest run of consecutive correct answers.
-- Databases set up before accounts.sql also keep the wallet-keyed get_user_stats(TEXT)
-- that older app code calls; lib/sql/accounts-drop-wallet-columns.sql drops it.
CREATE OR REPLACE FUNCTION get_user_stats(p_user UUID)
RETURNS TABLE (total_answered INT, correct_count INT, streak INT, best_streak INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ordered AS (
    SELECT
      is_correct,
      ROW_NUMBER() OVER (ORDER BY answered_at, id) AS rn,
      ROW_NUMBER() OVER (PARTITION BY is_correct ORDER BY answered_at, id) AS rn_in_group
    FROM quiz_results
    WHERE user_id = p_user
  ),
  correct_runs AS (
    -- Rows in the same run of correct answers share rn - rn_in_group.
    SELECT COUNT(*) AS len, MAX(rn) AS last_rn
    FROM ordered
    WHERE is_correct
    GROUP BY rn - rn_in_group
  )
  SELECT
    (SELECT COUNT(*) FROM ordered)::INT,
    (SELECT COUNT(*) FROM ordered WHERE is_correct)::INT,
    COALESCE((SELECT len FROM correct_runs WHERE last_rn = (SELECT MAX(rn) FROM ordered)), 0)::INT,
    COALESCE((SELECT MAX(len) FROM correct_runs), 0)::INT;

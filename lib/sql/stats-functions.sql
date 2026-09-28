-- Aggregation functions for stats and leaderboards.
-- Idempotent: safe to re-run in the Supabase SQL Editor after lib/schema.sql.
-- Counting happens here instead of in the app because PostgREST caps each
-- response at 1000 rows, which silently truncated raw-row aggregation.

-- One player's totals and streaks.
-- streak: consecutive correct answers ending at the most recent answer.
-- best_streak: longest run of consecutive correct answers.
CREATE OR REPLACE FUNCTION get_user_stats(p_wallet TEXT)
RETURNS TABLE (total_answered INT, correct_count INT, streak INT, best_streak INT)
LANGUAGE sql
STABLE
AS $$
  WITH ordered AS (
    SELECT
      is_correct,
      ROW_NUMBER() OVER (ORDER BY answered_at, id) AS rn,
      ROW_NUMBER() OVER (PARTITION BY is_correct ORDER BY answered_at, id) AS rn_in_group
    FROM quiz_results
    WHERE wallet_address = LOWER(p_wallet)
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
$$;

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

-- Accuracy is FLOOR(x + 0.5) on float8 so it matches JS Math.round((correct / total) * 100)
-- bit for bit (exact numeric rounding differs on values like 57/200).

-- Top players across all results, ranked by score then accuracy.
CREATE OR REPLACE FUNCTION get_global_leaderboard(p_limit INT)
RETURNS TABLE (wallet_address TEXT, score INT, accuracy INT)
LANGUAGE sql
STABLE
AS $$
  WITH totals AS (
    SELECT
      r.wallet_address,
      (COUNT(*) FILTER (WHERE r.is_correct))::INT AS score,
      FLOOR((COUNT(*) FILTER (WHERE r.is_correct))::FLOAT8 / COUNT(*) * 100 + 0.5)::INT AS accuracy
    FROM quiz_results r
    GROUP BY r.wallet_address
  )
  SELECT t.wallet_address, t.score, t.accuracy
  FROM totals t
  ORDER BY t.score DESC, t.accuracy DESC, t.wallet_address
  LIMIT p_limit;
$$;

-- Group members ranked the same way; members with no answers appear with 0 / 0.
CREATE OR REPLACE FUNCTION get_group_leaderboard(p_group_id UUID, p_limit INT)
RETURNS TABLE (wallet_address TEXT, score INT, accuracy INT)
LANGUAGE sql
STABLE
AS $$
  WITH totals AS (
    SELECT
      m.wallet_address,
      (COUNT(r.id) FILTER (WHERE r.is_correct))::INT AS score,
      CASE WHEN COUNT(r.id) = 0 THEN 0
        ELSE FLOOR((COUNT(r.id) FILTER (WHERE r.is_correct))::FLOAT8 / COUNT(r.id) * 100 + 0.5)::INT
      END AS accuracy
    FROM group_members m
    LEFT JOIN quiz_results r ON r.wallet_address = m.wallet_address
    WHERE m.group_id = p_group_id
    GROUP BY m.wallet_address
  )
  SELECT t.wallet_address, t.score, t.accuracy
  FROM totals t
  ORDER BY t.score DESC, t.accuracy DESC, t.wallet_address
  LIMIT p_limit;
$$;

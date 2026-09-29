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
$$;

-- Accuracy is FLOOR(x + 0.5) on float8 so it matches JS Math.round((correct / total) * 100)
-- bit for bit (exact numeric rounding differs on values like 57/200).

-- Top players across all results, ranked by score then accuracy. Re-keyed to the account
-- id (unlike get_user_stats, the argument list here is unchanged, so the old wallet-keyed
-- version can't stay as a separate overload; DROP first since CREATE OR REPLACE refuses
-- to change a function's return columns). Joins users for display_name/wallet_address so
-- an email account (no wallet) still appears.
DROP FUNCTION IF EXISTS get_global_leaderboard(INT);
CREATE FUNCTION get_global_leaderboard(p_limit INT)
RETURNS TABLE (user_id UUID, display_name TEXT, wallet_address TEXT, score INT, accuracy INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH totals AS (
    SELECT
      r.user_id,
      (COUNT(*) FILTER (WHERE r.is_correct))::INT AS score,
      FLOOR((COUNT(*) FILTER (WHERE r.is_correct))::FLOAT8 / COUNT(*) * 100 + 0.5)::INT AS accuracy
    FROM quiz_results r
    GROUP BY r.user_id
  )
  SELECT u.id, u.display_name, u.wallet_address, t.score, t.accuracy
  FROM totals t
  JOIN users u ON u.id = t.user_id
  ORDER BY t.score DESC, t.accuracy DESC, u.id
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

-- Group members ranked the same way; members with no answers appear with 0 / 0.
DROP FUNCTION IF EXISTS get_group_leaderboard(UUID, INT);
CREATE FUNCTION get_group_leaderboard(p_group_id UUID, p_limit INT)
RETURNS TABLE (user_id UUID, display_name TEXT, wallet_address TEXT, score INT, accuracy INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH totals AS (
    SELECT
      m.user_id,
      (COUNT(r.id) FILTER (WHERE r.is_correct))::INT AS score,
      CASE WHEN COUNT(r.id) = 0 THEN 0
        ELSE FLOOR((COUNT(r.id) FILTER (WHERE r.is_correct))::FLOAT8 / COUNT(r.id) * 100 + 0.5)::INT
      END AS accuracy
    FROM group_members m
    LEFT JOIN quiz_results r ON r.user_id = m.user_id
    WHERE m.group_id = p_group_id
    GROUP BY m.user_id
  )
  SELECT u.id, u.display_name, u.wallet_address, t.score, t.accuracy
  FROM totals t
  JOIN users u ON u.id = t.user_id
  ORDER BY t.score DESC, t.accuracy DESC, u.id
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

-- The app calls these with the public (anon) key, so they need EXECUTE.
-- Without this, PostgREST returns "permission denied" and stats/leaderboards
-- silently read as zero/empty even though answers are recorded.
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_global_leaderboard(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_group_leaderboard(UUID, INT) TO anon, authenticated;

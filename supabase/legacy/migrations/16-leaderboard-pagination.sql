DROP FUNCTION IF EXISTS get_global_leaderboard(INT);
DROP FUNCTION IF EXISTS get_global_leaderboard(INT, INT);
CREATE FUNCTION get_global_leaderboard(p_limit INT, p_offset INT DEFAULT 0)
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
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;

DROP FUNCTION IF EXISTS get_group_leaderboard(UUID, INT);
DROP FUNCTION IF EXISTS get_group_leaderboard(UUID, INT, INT);
CREATE FUNCTION get_group_leaderboard(p_group_id UUID, p_limit INT, p_offset INT DEFAULT 0)
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
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION get_global_leaderboard(INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_group_leaderboard(UUID, INT, INT) TO anon, authenticated;

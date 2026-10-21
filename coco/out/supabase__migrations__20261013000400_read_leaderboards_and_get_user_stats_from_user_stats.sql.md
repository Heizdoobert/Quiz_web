# supabase/migrations/20261013000400_read_leaderboards_and_get_user_stats_from_user_stats.sql
lines:68 exports:
---
-- Phase 2a (readers). The gate below compares, for every account, the OLD get_user_stats (window
-- functions over quiz_results) with the rollup. Any difference aborts the whole migration, so
-- the swap never ships a different number. The gate is meaningful only on the first apply, while
-- the OLD get_user_stats is still live; after the swap both sides read user_stats and a re-run
-- checks nothing. Later drift is repaired with rebuild_user_stats().
BEGIN;

DO $$
DECLARE
  bad INT;
BEGIN
  SELECT count(*) INTO bad
    FROM users u
   CROSS JOIN LATERAL get_user_stats(u.id) g
    LEFT JOIN user_stats s ON s.user_id = u.id
   WHERE (g.total_answered, g.correct_count, g.streak, g.best_streak)
         IS DISTINCT FROM (COALESCE(s.total_answered, 0), COALESCE(s.correct_count, 0),
                           COALESCE(s.streak, 0), COALESCE(s.best_streak, 0));
  IF bad > 0 THEN
    RAISE EXCEPTION 'stats_readers: % account(s) differ between get_user_stats and user_stats; run rebuild_user_stats() and investigate', bad;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION get_user_stats(p_user UUID)
RETURNS TABLE (total_answered INT, correct_count INT, streak INT, best_streak INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(s.total_answered, 0), COALESCE(s.correct_count, 0), COALESCE(s.streak, 0), COALESCE(s.best_streak, 0)
    FROM (SELECT 1) one
    LEFT JOIN user_stats s ON s.user_id = p_user;
$$;

CREATE OR REPLACE FUNCTION get_global_leaderboard(p_limit INT, p_offset INT DEFAULT 0)
RETURNS TABLE (user_id UUID, display_name TEXT, score INT, accuracy INT)
LANGUAGE sql
STABLE
SECURITY DEFINER

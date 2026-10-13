-- Phase 2a. Persisted per-player totals, kept by a trigger on quiz_results (spec section 6).
-- The streak definition is the one get_user_stats always used: consecutive correct answers ending
-- at the latest answer, ordered by (answered_at, id). The app never supplies answered_at, so
-- insertion order equals time order.
BEGIN;
-- fail fast instead of queueing behind a long-running transaction; re-run off-peak
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS user_stats (
  user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_answered   INT  NOT NULL DEFAULT 0 CHECK (total_answered >= 0),
  correct_count    INT  NOT NULL DEFAULT 0 CHECK (correct_count BETWEEN 0 AND total_answered),
  streak           INT  NOT NULL DEFAULT 0 CHECK (streak >= 0),
  best_streak      INT  NOT NULL DEFAULT 0 CHECK (best_streak >= streak),
  last_answered_at TIMESTAMPTZ,
  accuracy         INT  GENERATED ALWAYS AS (
                     CASE WHEN total_answered = 0 THEN 0
                          ELSE floor(correct_count::float8 / total_answered * 100 + 0.5)::int END) STORED,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_stats_rank ON user_stats (correct_count DESC, accuracy DESC, user_id);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON user_stats FROM anon, authenticated;

CREATE OR REPLACE FUNCTION apply_quiz_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_stats AS s (user_id, total_answered, correct_count, streak, best_streak, last_answered_at)
  VALUES (NEW.user_id, 1, NEW.is_correct::int, NEW.is_correct::int, NEW.is_correct::int, NEW.answered_at)
  ON CONFLICT (user_id) DO UPDATE SET
    total_answered   = s.total_answered + 1,
    correct_count    = s.correct_count + NEW.is_correct::int,
    streak           = CASE WHEN NEW.is_correct THEN s.streak + 1 ELSE 0 END,
    best_streak      = GREATEST(s.best_streak, CASE WHEN NEW.is_correct THEN s.streak + 1 ELSE 0 END),
    last_answered_at = NEW.answered_at,
    updated_at       = now();
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION apply_quiz_result() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS quiz_results_apply ON quiz_results;
CREATE TRIGGER quiz_results_apply
  AFTER INSERT ON quiz_results
  FOR EACH ROW EXECUTE FUNCTION apply_quiz_result();

-- Recompute from quiz_results with the same window logic the old get_user_stats used. Used for
-- the backfill below and for repair after any delete (a cascade does not touch user_stats).
-- Returns the number of rows upserted.
CREATE OR REPLACE FUNCTION rebuild_user_stats(p_user UUID DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INT;
BEGIN
  -- A live repair call must not race a concurrent answer: its snapshot would be taken before the
  -- answer commits and its upsert would overwrite the trigger's increment. The lock blocks answer
  -- inserts for the duration of the rebuild, so run it off-peak. (The migration-time call is
  -- already inside a transaction that holds this lock; repeating it is harmless.)
  LOCK TABLE quiz_results IN SHARE ROW EXCLUSIVE MODE;

  DELETE FROM user_stats s
   WHERE (p_user IS NULL OR s.user_id = p_user)
     AND NOT EXISTS (SELECT 1 FROM quiz_results r WHERE r.user_id = s.user_id);

  WITH ordered AS (
    SELECT user_id, is_correct, answered_at,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY answered_at, id) AS rn,
           ROW_NUMBER() OVER (PARTITION BY user_id, is_correct ORDER BY answered_at, id) AS rn_in_group
      FROM quiz_results
     WHERE p_user IS NULL OR user_id = p_user
  ),
  runs AS (
    -- Rows in the same run of correct answers share rn - rn_in_group.
    SELECT user_id, COUNT(*) AS len, MAX(rn) AS last_rn
      FROM ordered
     WHERE is_correct
     GROUP BY user_id, rn - rn_in_group
  ),
  totals AS (
    SELECT user_id, COUNT(*) AS total, COUNT(*) FILTER (WHERE is_correct) AS correct,
           MAX(rn) AS max_rn, MAX(answered_at) AS last_at
      FROM ordered
     GROUP BY user_id
  )
  INSERT INTO user_stats AS s (user_id, total_answered, correct_count, streak, best_streak, last_answered_at, updated_at)
  SELECT t.user_id, t.total, t.correct,
         COALESCE((SELECT r.len FROM runs r WHERE r.user_id = t.user_id AND r.last_rn = t.max_rn), 0),
         COALESCE((SELECT MAX(r.len) FROM runs r WHERE r.user_id = t.user_id), 0),
         t.last_at, now()
    FROM totals t
  ON CONFLICT (user_id) DO UPDATE SET
    total_answered   = EXCLUDED.total_answered,
    correct_count    = EXCLUDED.correct_count,
    streak           = EXCLUDED.streak,
    best_streak      = EXCLUDED.best_streak,
    last_answered_at = EXCLUDED.last_answered_at,
    updated_at       = now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION rebuild_user_stats(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rebuild_user_stats(UUID) TO service_role;

-- Backfill. The trigger now exists, and CREATE TRIGGER already holds SHARE ROW EXCLUSIVE on
-- quiz_results until COMMIT; the explicit lock states the intent: no answer can slip in between
-- the rebuild's snapshot and the commit, so no incremental update is overwritten.
LOCK TABLE quiz_results IN SHARE ROW EXCLUSIVE MODE;
SELECT rebuild_user_stats();

COMMIT;

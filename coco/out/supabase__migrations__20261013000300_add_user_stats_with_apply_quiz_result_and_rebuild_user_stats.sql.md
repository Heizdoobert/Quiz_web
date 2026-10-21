# supabase/migrations/20261013000300_add_user_stats_with_apply_quiz_result_and_rebuild_user_stats.sql
lines:121 exports:
---
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

-- Phase 5 (spec section 9). Achievements are rows (metric + threshold), unlocked by a function the
-- app calls after an answer or a finished daily attempt. A function, not a trigger, because the
-- request needs the newly unlocked slugs back. Idempotent and race-safe through the primary key.
-- Names and descriptions are English only for now (D7); mirror topic_translations when a second
-- language is real.
BEGIN;

CREATE TABLE IF NOT EXISTS achievements (
  slug        TEXT PRIMARY KEY CHECK (slug ~ '^[a-z0-9_]+$'),
  metric      TEXT NOT NULL CHECK (metric IN ('total_answered', 'correct_count', 'best_streak', 'daily_completed')),
  threshold   INT  NOT NULL CHECK (threshold > 0),
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement TEXT NOT NULL REFERENCES achievements(slug) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement)
);
CREATE INDEX IF NOT EXISTS user_achievements_user ON user_achievements (user_id, unlocked_at DESC);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for achievements" ON achievements;
CREATE POLICY "Allow public read for achievements" ON achievements FOR SELECT USING (true);
REVOKE ALL ON achievements, user_achievements FROM anon, authenticated;
GRANT SELECT ON achievements TO anon, authenticated;

INSERT INTO achievements (slug, metric, threshold, name, description, sort_order) VALUES
  ('first_answer',    'total_answered',  1,   'First answer',     'Answer your first question.',        10),
  ('ten_correct',     'correct_count',   10,  'Ten right',        'Get 10 questions right.',            20),
  ('hundred_correct', 'correct_count',   100, 'Hundred right',    'Get 100 questions right.',           30),
  ('streak_5',        'best_streak',     5,   'On a roll',        'Answer 5 in a row correctly.',       40),
  ('streak_10',       'best_streak',     10,  'Unstoppable',      'Answer 10 in a row correctly.',      50),
  ('first_daily',     'daily_completed', 1,   'Daily challenger', 'Finish your first daily challenge.',  60)
ON CONFLICT (slug) DO NOTHING;

-- Returns only the achievements unlocked by THIS call.
CREATE OR REPLACE FUNCTION award_achievements(p_user UUID)
RETURNS SETOF TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s       user_stats%ROWTYPE;
  v_daily INT;
BEGIN
  SELECT * INTO s FROM user_stats WHERE user_id = p_user;
  SELECT count(*)::INT INTO v_daily FROM daily_attempts WHERE user_id = p_user AND finished_at IS NOT NULL;

  RETURN QUERY
  WITH ins AS (
    INSERT INTO user_achievements (user_id, achievement)
    SELECT p_user, a.slug
      FROM achievements a
     WHERE a.active
       AND a.threshold <= CASE a.metric
             WHEN 'total_answered'  THEN COALESCE(s.total_answered, 0)
             WHEN 'correct_count'   THEN COALESCE(s.correct_count, 0)
             WHEN 'best_streak'     THEN COALESCE(s.best_streak, 0)
             WHEN 'daily_completed' THEN v_daily
           END
    ON CONFLICT DO NOTHING
    RETURNING achievement
  )
  SELECT achievement FROM ins;
END;
$$;
REVOKE ALL ON FUNCTION award_achievements(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION award_achievements(UUID) TO service_role;

-- Existing players get what they already earned, silently: the app shows an unlock only for slugs
-- returned by calls after the release.
SELECT count(*) FROM users u, LATERAL award_achievements(u.id);

COMMIT;

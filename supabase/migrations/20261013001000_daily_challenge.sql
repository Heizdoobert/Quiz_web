-- Phase 4 (spec section 8, decision D1). The daily challenge keeps its own answer tables:
-- quiz_results is unique per (user, question) and is the lifetime ledger behind user_stats, so a
-- daily question the player already answered could not be recorded there. challenge_date is a UTC
-- date; the app computes it in UTC. Additive only: no existing table changes.
BEGIN;

CREATE TABLE IF NOT EXISTS daily_challenges (
  challenge_date DATE PRIMARY KEY,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_challenge_questions (
  challenge_date DATE NOT NULL REFERENCES daily_challenges(challenge_date) ON DELETE CASCADE,
  position       SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 20),
  question_id    UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  PRIMARY KEY (challenge_date, position),
  UNIQUE (challenge_date, question_id)
);

CREATE TABLE IF NOT EXISTS daily_attempts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL REFERENCES daily_challenges(challenge_date) ON DELETE CASCADE,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ,
  correct_count  INT NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  UNIQUE (user_id, challenge_date),
  UNIQUE (id, challenge_date),
  CHECK (finished_at IS NULL OR finished_at >= started_at)
);

-- The two composite foreign keys make the database refuse an answer to a question that is not part
-- of that day's challenge, or an answer attached to another day's attempt. No trigger needed.
CREATE TABLE IF NOT EXISTS daily_attempt_answers (
  attempt_id     UUID NOT NULL,
  challenge_date DATE NOT NULL,
  question_id    UUID NOT NULL,
  answer_index   INT NOT NULL CHECK (answer_index BETWEEN 0 AND 3),
  is_correct     BOOLEAN NOT NULL,
  answered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_id, question_id),
  FOREIGN KEY (attempt_id, challenge_date) REFERENCES daily_attempts (id, challenge_date) ON DELETE CASCADE,
  FOREIGN KEY (challenge_date, question_id) REFERENCES daily_challenge_questions (challenge_date, question_id)
);

CREATE INDEX IF NOT EXISTS daily_attempts_rank ON daily_attempts (challenge_date, correct_count DESC, finished_at);

ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attempt_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON daily_challenges, daily_challenge_questions, daily_attempts, daily_attempt_answers FROM anon, authenticated;

CREATE OR REPLACE FUNCTION apply_daily_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_correct THEN
    UPDATE daily_attempts SET correct_count = correct_count + 1 WHERE id = NEW.attempt_id;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION apply_daily_answer() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS daily_attempt_answers_apply ON daily_attempt_answers;
CREATE TRIGGER daily_attempt_answers_apply
  AFTER INSERT ON daily_attempt_answers
  FOR EACH ROW EXECUTE FUNCTION apply_daily_answer();

-- Picks p_count random verified questions for a day. A repeat for the same day inserts nothing
-- (returns 0), so the cron job can retry safely. An advisory lock keeps two runs from interleaving.
CREATE OR REPLACE FUNCTION pick_daily_challenge(p_date DATE, p_count INT DEFAULT 10)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INT;
BEGIN
  IF p_count < 1 OR p_count > 20 THEN
    RAISE EXCEPTION 'pick_daily_challenge: p_count must be 1 to 20';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('daily_challenge:' || p_date::text));
  INSERT INTO daily_challenges (challenge_date) VALUES (p_date) ON CONFLICT DO NOTHING;
  IF EXISTS (SELECT 1 FROM daily_challenge_questions WHERE challenge_date = p_date) THEN
    RETURN 0;
  END IF;
  INSERT INTO daily_challenge_questions (challenge_date, position, question_id)
  SELECT p_date, (row_number() OVER ())::smallint, r.id
    FROM (SELECT id FROM questions WHERE status = 'verified' ORDER BY random() LIMIT p_count) r;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION pick_daily_challenge(DATE, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION pick_daily_challenge(DATE, INT) TO service_role;

CREATE OR REPLACE FUNCTION get_daily_leaderboard(p_date DATE, p_limit INT, p_offset INT DEFAULT 0)
RETURNS TABLE (user_id UUID, display_name TEXT, correct_count INT, duration_seconds INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.user_id, u.display_name, a.correct_count,
         EXTRACT(EPOCH FROM (a.finished_at - a.started_at))::INT
    FROM daily_attempts a
    JOIN users u ON u.id = a.user_id
   WHERE a.challenge_date = p_date AND a.finished_at IS NOT NULL
   ORDER BY a.correct_count DESC, a.finished_at - a.started_at ASC, a.user_id
   LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;
GRANT EXECUTE ON FUNCTION get_daily_leaderboard(DATE, INT, INT) TO anon, authenticated;

COMMIT;

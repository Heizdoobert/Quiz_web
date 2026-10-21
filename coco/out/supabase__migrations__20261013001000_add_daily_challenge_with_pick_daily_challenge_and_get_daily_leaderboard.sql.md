# supabase/migrations/20261013001000_add_daily_challenge_with_pick_daily_challenge_and_get_daily_leaderboard.sql
lines:121 exports:
---
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

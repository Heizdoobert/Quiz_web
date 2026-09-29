-- Ratings, comments and suggestions on questions. RLS on, no public policies:
-- every read and write goes through lib/actions/community-actions.ts on the
-- secret-key client, same lock-down as question_disputes/quiz_results.
CREATE TABLE IF NOT EXISTS question_ratings (
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (question_id, user_id)
);

CREATE TABLE IF NOT EXISTS question_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('comment', 'suggestion')),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_question_comments_question_created
  ON question_comments (question_id, created_at DESC);
-- Backs the 20-per-day gate and getSuggestionsForAuthor's per-sender lookups.
CREATE INDEX IF NOT EXISTS idx_question_comments_user_created
  ON question_comments (user_id, created_at DESC);

ALTER TABLE question_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_comments ENABLE ROW LEVEL SECURITY;

-- Average and count in one round trip; called only from community-actions.ts
-- via the secret-key client, so no anon/authenticated grant is needed.
CREATE OR REPLACE FUNCTION get_rating_summary(p_question_id UUID)
RETURNS TABLE (average NUMERIC(2,1), count INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROUND(AVG(rating)::NUMERIC, 1) AS average,
    COUNT(*)::INT AS count
  FROM question_ratings
  WHERE question_id = p_question_id;
$$;

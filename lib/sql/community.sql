-- Community tables: question ratings, comments, and author suggestions.
-- RLS enabled with NO public policies: all read/write mutations go through
-- server actions using the service role / admin client, enforcing gates
-- (signed in, recorded answer, public question, not-author, daily rate limit).

CREATE TABLE IF NOT EXISTS question_ratings (
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (question_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_question_ratings_user ON question_ratings (user_id);

ALTER TABLE question_ratings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS question_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('comment', 'suggestion')),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_question_comments_qid_created ON question_comments (question_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_comments_uid_created ON question_comments (user_id, created_at DESC);

ALTER TABLE question_comments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_rating_summary(p_question_id UUID)
RETURNS TABLE (
  average NUMERIC(2,1),
  count INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0.0) AS average,
    COUNT(*)::INT AS count
  FROM question_ratings
  WHERE question_id = p_question_id;
$$;

GRANT EXECUTE ON FUNCTION get_rating_summary(UUID) TO anon, authenticated;

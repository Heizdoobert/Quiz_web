-- Question search: pg_trgm substring + trigram similarity, public questions only.
-- Same public-question rule as get_topics()/getPublicQuestion (status = 'verified'
-- AND list_id IS NULL). Never returns correct_index/explanation/options.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_questions_prompt_trgm ON questions USING GIN (lower(prompt) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_questions_category_trgm ON questions USING GIN (lower(category) gin_trgm_ops);

CREATE OR REPLACE FUNCTION search_questions(p_query TEXT, p_limit INT, p_offset INT)
RETURNS TABLE (
  id UUID,
  prompt TEXT,
  category TEXT,
  author_name TEXT,
  created_at TIMESTAMPTZ,
  score REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Escaped for ILIKE ('%'/'_' matched literally); the unescaped raw text still
  -- feeds word_similarity so a typo like "etherum" still finds "Ethereum".
  WITH escaped AS (
    SELECT
      replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_') AS pattern,
      lower(p_query) AS raw
  )
  SELECT
    q.id,
    q.prompt,
    q.category,
    COALESCE(u.display_name, 'Player') AS author_name,
    q.created_at,
    GREATEST(
      word_similarity(escaped.raw, lower(q.prompt)),
      word_similarity(escaped.raw, lower(q.category))
    ) AS score
  FROM questions q
  LEFT JOIN users u ON u.id = q.created_by_user
  CROSS JOIN escaped
  WHERE q.status = 'verified' AND q.list_id IS NULL
    AND (
      lower(q.prompt) ILIKE '%' || lower(escaped.pattern) || '%' ESCAPE '\'
      OR lower(q.category) ILIKE '%' || lower(escaped.pattern) || '%' ESCAPE '\'
      OR word_similarity(escaped.raw, lower(q.prompt)) > 0.3
      OR word_similarity(escaped.raw, lower(q.category)) > 0.3
    )
  ORDER BY score DESC, q.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION search_questions(TEXT, INT, INT) TO anon, authenticated;

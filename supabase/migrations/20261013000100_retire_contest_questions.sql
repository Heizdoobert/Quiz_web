-- Phase 1a (expand). Safe while the old code runs: the two public readers stop depending on
-- list_id, and the contest questions that list_id used to hide are retired in the same
-- transaction so none becomes visible in between. Rows are retired, not deleted: deleting would
-- cascade into quiz_results and change players' scores (spec D2, F3).
BEGIN;

UPDATE questions SET status = 'rejected' WHERE list_id IS NOT NULL AND status <> 'rejected';

CREATE OR REPLACE FUNCTION get_topics()
RETURNS TABLE (name TEXT, question_count INT, latest_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Most recent spelling represents the whole group ("DeFi" over "defi").
    (ARRAY_AGG(category ORDER BY created_at DESC))[1] AS name,
    COUNT(*)::INT AS question_count,
    MAX(created_at) AS latest_at
  FROM questions
  WHERE status = 'verified'
  GROUP BY lower(TRIM(category))
  ORDER BY latest_at DESC;
$$;

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
  WHERE q.status = 'verified'
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

-- Placeholder rows from the old seed: example.com links shown in the ad zone (spec F8).
UPDATE sponsors SET active = false WHERE active AND url LIKE 'https://example.com/%';

COMMIT;

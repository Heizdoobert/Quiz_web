# lib/sql/search.sql
lines:55 exports:
---
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

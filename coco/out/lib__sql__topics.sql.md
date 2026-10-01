# lib/sql/topics.sql
lines:25 exports:
---
-- Topics for CategoryBar/discovery: questions.category grouped case-insensitively
-- after trimming, newest question first. A function (not a raw query) because
-- PostgREST caps each response at 1000 rows, which would silently truncate
-- aggregation done client-side across all public questions.
-- Public-question rule applied here too (status = 'verified' AND list_id IS NULL),
-- same as fetchRandomQuestion/getPublicQuestion.
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
  WHERE status = 'verified' AND list_id IS NULL
  GROUP BY lower(TRIM(category))
  ORDER BY latest_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_topics() TO anon, authenticated;

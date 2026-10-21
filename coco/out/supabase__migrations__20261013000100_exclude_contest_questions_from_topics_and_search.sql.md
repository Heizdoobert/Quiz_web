# supabase/migrations/20261013000100_exclude_contest_questions_from_topics_and_search.sql
lines:76 exports:
---
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

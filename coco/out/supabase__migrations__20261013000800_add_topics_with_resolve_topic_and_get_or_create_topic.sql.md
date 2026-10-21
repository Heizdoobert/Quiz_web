# supabase/migrations/20261013000800_add_topics_with_resolve_topic_and_get_or_create_topic.sql
lines:193 exports:
---
-- Phase 3a (expand). Topics become rows with per-locale names. questions.category stays and stays
-- authoritative until the code release in Task 3.2 is live: a trigger fills topic_id from it, so
-- code that still writes only category keeps working. Existing names are stored as locale 'en' (D5).
BEGIN;
-- fail fast instead of queueing behind a long-running transaction; re-run off-peak
SET LOCAL lock_timeout = '5s';

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

CREATE OR REPLACE FUNCTION slugify_topic(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(trim(BOTH '-' FROM regexp_replace(lower(unaccent(COALESCE(NULLIF(trim(p_name), ''), 'General'))), '[^a-z0-9]+', '-', 'g')), ''),
    'topic-' || substr(md5(lower(trim(p_name))), 1, 8)
  );
$$;

CREATE TABLE IF NOT EXISTS topics (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS topic_translations (
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  locale   TEXT NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  name     TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  PRIMARY KEY (topic_id, locale)
);

CREATE INDEX IF NOT EXISTS topic_translations_name_trgm ON topic_translations USING GIN (lower(name) gin_trgm_ops);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_translations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for topics" ON topics;
CREATE POLICY "Allow public read for topics" ON topics FOR SELECT USING (true);

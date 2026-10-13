-- Phase 3a (expand). Topics become rows with per-locale names. questions.category stays and stays
-- authoritative until the code release in Task 3.2 is live: a trigger fills topic_id from it, so
-- code that still writes only category keeps working. Existing names are stored as locale 'en' (D5).
BEGIN;

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
DROP POLICY IF EXISTS "Allow public read for topic_translations" ON topic_translations;
CREATE POLICY "Allow public read for topic_translations" ON topic_translations FOR SELECT USING (true);
REVOKE ALL ON topics, topic_translations FROM anon, authenticated;
GRANT SELECT ON topics, topic_translations TO anon, authenticated;

ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id);
CREATE INDEX IF NOT EXISTS questions_topic ON questions (topic_id, created_at DESC);
GRANT SELECT (topic_id) ON questions TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_or_create_topic(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := COALESCE(NULLIF(trim(p_name), ''), 'General');
  v_slug TEXT := slugify_topic(v_name);
  v_id   UUID;
BEGIN
  INSERT INTO topics (slug) VALUES (v_slug) ON CONFLICT (slug) DO NOTHING;
  SELECT id INTO v_id FROM topics WHERE slug = v_slug;
  INSERT INTO topic_translations (topic_id, locale, name) VALUES (v_id, 'en', left(v_name, 60))
    ON CONFLICT (topic_id, locale) DO NOTHING;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION get_or_create_topic(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_topic(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION resolve_topic(p_name TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM topics WHERE slug = slugify_topic(p_name);
$$;
GRANT EXECUTE ON FUNCTION resolve_topic(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION set_question_topic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.topic_id IS NULL
     OR (TG_OP = 'UPDATE' AND NEW.category IS DISTINCT FROM OLD.category AND NEW.topic_id IS NOT DISTINCT FROM OLD.topic_id) THEN
    NEW.topic_id := get_or_create_topic(NEW.category);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION set_question_topic() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS questions_set_topic ON questions;
CREATE TRIGGER questions_set_topic
  BEFORE INSERT OR UPDATE OF category ON questions
  FOR EACH ROW EXECUTE FUNCTION set_question_topic();

-- Backfill: group by slug (not by lower(trim(category))) so two spellings that slugify the same
-- cannot collide; the name is the most recent spelling, the rule get_topics() has always used.
CREATE TEMP TABLE _topic_names ON COMMIT DROP AS
  SELECT DISTINCT ON (slugify_topic(category))
         slugify_topic(category) AS slug,
         left(COALESCE(NULLIF(trim(category), ''), 'General'), 60) AS name
    FROM questions
   ORDER BY slugify_topic(category), created_at DESC NULLS LAST;
INSERT INTO topics (slug) SELECT slug FROM _topic_names ON CONFLICT (slug) DO NOTHING;
INSERT INTO topic_translations (topic_id, locale, name)
  SELECT t.id, 'en', n.name FROM _topic_names n JOIN topics t ON t.slug = n.slug
  ON CONFLICT (topic_id, locale) DO NOTHING;
UPDATE questions q SET topic_id = t.id FROM topics t
 WHERE t.slug = slugify_topic(q.category) AND q.topic_id IS DISTINCT FROM t.id;

DROP FUNCTION IF EXISTS get_topics();
CREATE OR REPLACE FUNCTION get_topics(p_locale TEXT DEFAULT 'en')
RETURNS TABLE (slug TEXT, name TEXT, question_count INT, latest_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.slug,
    (SELECT tr.name FROM topic_translations tr WHERE tr.topic_id = t.id
      ORDER BY (tr.locale = p_locale) DESC, (tr.locale = 'en') DESC, tr.locale LIMIT 1),
    COUNT(*)::INT,
    MAX(q.created_at)
  FROM questions q
  JOIN topics t ON t.id = q.topic_id
  WHERE q.status = 'verified'
  GROUP BY t.id, t.slug
  ORDER BY MAX(q.created_at) DESC;
$$;
GRANT EXECUTE ON FUNCTION get_topics(TEXT) TO anon, authenticated;

-- A 4th parameter would add an overload next to the 3-argument version and make a 3-argument call
-- ambiguous, so the old one goes first. Old callers still work through the default.
DROP FUNCTION IF EXISTS search_questions(TEXT, INT, INT);
CREATE OR REPLACE FUNCTION search_questions(p_query TEXT, p_limit INT, p_offset INT, p_locale TEXT DEFAULT 'en')
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
  WITH escaped AS (
    SELECT
      replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_') AS pattern,
      lower(p_query) AS raw
  )
  SELECT
    q.id,
    q.prompt,
    tn.name AS category,
    COALESCE(u.display_name, 'Player') AS author_name,
    q.created_at,
    GREATEST(
      word_similarity(escaped.raw, lower(q.prompt)),
      word_similarity(escaped.raw, lower(tn.name))
    ) AS score
  FROM questions q
  JOIN topics t ON t.id = q.topic_id
  CROSS JOIN LATERAL (
    SELECT tr.name FROM topic_translations tr WHERE tr.topic_id = t.id
     ORDER BY (tr.locale = p_locale) DESC, (tr.locale = 'en') DESC, tr.locale LIMIT 1
  ) tn
  LEFT JOIN users u ON u.id = q.created_by_user
  CROSS JOIN escaped
  WHERE q.status = 'verified'
    AND (
      lower(q.prompt) ILIKE '%' || lower(escaped.pattern) || '%' ESCAPE '\'
      OR lower(tn.name) ILIKE '%' || lower(escaped.pattern) || '%' ESCAPE '\'
      OR word_similarity(escaped.raw, lower(q.prompt)) > 0.3
      OR word_similarity(escaped.raw, lower(tn.name)) > 0.3
    )
  ORDER BY score DESC, q.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;
GRANT EXECUTE ON FUNCTION search_questions(TEXT, INT, INT, TEXT) TO anon, authenticated;

COMMIT;

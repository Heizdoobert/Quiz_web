


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."apply_daily_answer"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.is_correct THEN
    UPDATE daily_attempts SET correct_count = correct_count + 1 WHERE id = NEW.attempt_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."apply_daily_answer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_quiz_result"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO user_stats AS s (user_id, total_answered, correct_count, streak, best_streak, last_answered_at)
  VALUES (NEW.user_id, 1, NEW.is_correct::int, NEW.is_correct::int, NEW.is_correct::int, NEW.answered_at)
  ON CONFLICT (user_id) DO UPDATE SET
    total_answered   = s.total_answered + 1,
    correct_count    = s.correct_count + NEW.is_correct::int,
    streak           = CASE WHEN NEW.is_correct THEN s.streak + 1 ELSE 0 END,
    best_streak      = GREATEST(s.best_streak, CASE WHEN NEW.is_correct THEN s.streak + 1 ELSE 0 END),
    last_answered_at = NEW.answered_at,
    updated_at       = now();
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."apply_quiz_result"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."award_achievements"("p_user" "uuid") RETURNS SETOF "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  s       user_stats%ROWTYPE;
  v_daily INT;
BEGIN
  SELECT * INTO s FROM user_stats WHERE user_id = p_user;
  SELECT count(*)::INT INTO v_daily FROM daily_attempts WHERE user_id = p_user AND finished_at IS NOT NULL;

  RETURN QUERY
  WITH ins AS (
    INSERT INTO user_achievements (user_id, achievement)
    SELECT p_user, a.slug
      FROM achievements a
     WHERE a.active
       AND a.threshold <= CASE a.metric
             WHEN 'total_answered'  THEN COALESCE(s.total_answered, 0)
             WHEN 'correct_count'   THEN COALESCE(s.correct_count, 0)
             WHEN 'best_streak'     THEN COALESCE(s.best_streak, 0)
             WHEN 'daily_completed' THEN v_daily
           END
    ON CONFLICT DO NOTHING
    RETURNING achievement
  )
  SELECT achievement FROM ins;
END;
$$;


ALTER FUNCTION "public"."award_achievements"("p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_leaderboard"("p_date" "date", "p_limit" integer, "p_offset" integer DEFAULT 0) RETURNS TABLE("user_id" "uuid", "display_name" "text", "correct_count" integer, "duration_seconds" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT a.user_id, u.display_name, a.correct_count,
         EXTRACT(EPOCH FROM (a.finished_at - a.started_at))::INT
    FROM daily_attempts a
    JOIN users u ON u.id = a.user_id
   WHERE a.challenge_date = p_date AND a.finished_at IS NOT NULL
   ORDER BY a.correct_count DESC, a.finished_at - a.started_at ASC, a.user_id
   LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;


ALTER FUNCTION "public"."get_daily_leaderboard"("p_date" "date", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_global_leaderboard"("p_limit" integer, "p_offset" integer DEFAULT 0) RETURNS TABLE("user_id" "uuid", "display_name" "text", "score" integer, "accuracy" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT u.id, u.display_name, s.correct_count, s.accuracy
    FROM user_stats s
    JOIN users u ON u.id = s.user_id
   ORDER BY s.correct_count DESC, s.accuracy DESC, u.id
   LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;


ALTER FUNCTION "public"."get_global_leaderboard"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_group_leaderboard"("p_group_id" "uuid", "p_limit" integer, "p_offset" integer DEFAULT 0) RETURNS TABLE("user_id" "uuid", "display_name" "text", "score" integer, "accuracy" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT u.id, u.display_name, COALESCE(s.correct_count, 0), COALESCE(s.accuracy, 0)
    FROM group_members m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN user_stats s ON s.user_id = m.user_id
   WHERE m.group_id = p_group_id
   ORDER BY COALESCE(s.correct_count, 0) DESC, COALESCE(s.accuracy, 0) DESC, u.id
   LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;


ALTER FUNCTION "public"."get_group_leaderboard"("p_group_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_topic"("p_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_or_create_topic"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_question_analytics"("p_user_id" "uuid") RETURNS TABLE("question_id" "uuid", "prompt" "text", "play_count" bigint, "accuracy_rate" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.id AS question_id,
        q.prompt,
        COUNT(qr.id) AS play_count,
        COALESCE(SUM(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(qr.id), 0), 0) AS accuracy_rate
    FROM questions q
    LEFT JOIN quiz_results qr ON q.id = qr.question_id
    WHERE q.created_by_user = p_user_id
    GROUP BY q.id, q.prompt;
END;
$$;


ALTER FUNCTION "public"."get_question_analytics"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_rating_summary"("p_question_id" "uuid") RETURNS TABLE("average" numeric, "count" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0.0) AS average,
    COUNT(*)::INT AS count
  FROM question_ratings
  WHERE question_id = p_question_id;
$$;


ALTER FUNCTION "public"."get_rating_summary"("p_question_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_topics"("p_locale" "text" DEFAULT 'en'::"text") RETURNS TABLE("slug" "text", "name" "text", "question_count" integer, "latest_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_topics"("p_locale" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_stats"("p_user" "uuid") RETURNS TABLE("total_answered" integer, "correct_count" integer, "streak" integer, "best_streak" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(s.total_answered, 0), COALESCE(s.correct_count, 0), COALESCE(s.streak, 0), COALESCE(s.best_streak, 0)
    FROM (SELECT 1) one
    LEFT JOIN user_stats s ON s.user_id = p_user;
$$;


ALTER FUNCTION "public"."get_user_stats"("p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_ai_generation"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_count INT;
BEGIN
    INSERT INTO user_ai_usage (user_id, action_date, generations_count)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, action_date)
    DO UPDATE SET generations_count = user_ai_usage.generations_count + 1
    RETURNING generations_count INTO v_count;

    RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."increment_ai_generation"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pick_daily_challenge"("p_date" "date", "p_count" integer DEFAULT 10) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  n INT;
BEGIN
  IF p_count < 1 OR p_count > 20 THEN
    RAISE EXCEPTION 'pick_daily_challenge: p_count must be 1 to 20';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('daily_challenge:' || p_date::text));
  INSERT INTO daily_challenges (challenge_date) VALUES (p_date) ON CONFLICT DO NOTHING;
  IF EXISTS (SELECT 1 FROM daily_challenge_questions WHERE challenge_date = p_date) THEN
    RETURN 0;
  END IF;
  INSERT INTO daily_challenge_questions (challenge_date, position, question_id)
  SELECT p_date, (row_number() OVER ())::smallint, r.id
    FROM (SELECT id FROM questions WHERE status = 'verified' ORDER BY random() LIMIT p_count) r;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;


ALTER FUNCTION "public"."pick_daily_challenge"("p_date" "date", "p_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rate_limit_hit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  recent INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_key));
  -- Every window used is at most an hour, so a day-old row is never counted again.
  DELETE FROM auth_attempts WHERE created_at < now() - interval '1 day';
  SELECT count(*) INTO recent FROM auth_attempts
    WHERE key = p_key AND created_at > now() - make_interval(secs => p_window_seconds);
  IF recent >= p_max THEN
    RETURN FALSE;
  END IF;
  INSERT INTO auth_attempts (key) VALUES (p_key);
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."rate_limit_hit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rebuild_user_stats"("p_user" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  n INT;
BEGIN
  -- A live repair call must not race a concurrent answer: its snapshot would be taken before the
  -- answer commits and its upsert would overwrite the trigger's increment. The lock blocks answer
  -- inserts for the duration of the rebuild, so run it off-peak. (The migration-time call is
  -- already inside a transaction that holds this lock; repeating it is harmless.)
  LOCK TABLE quiz_results IN SHARE ROW EXCLUSIVE MODE;

  DELETE FROM user_stats s
   WHERE (p_user IS NULL OR s.user_id = p_user)
     AND NOT EXISTS (SELECT 1 FROM quiz_results r WHERE r.user_id = s.user_id);

  WITH ordered AS (
    SELECT user_id, is_correct, answered_at,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY answered_at, id) AS rn,
           ROW_NUMBER() OVER (PARTITION BY user_id, is_correct ORDER BY answered_at, id) AS rn_in_group
      FROM quiz_results
     WHERE p_user IS NULL OR user_id = p_user
  ),
  runs AS (
    -- Rows in the same run of correct answers share rn - rn_in_group.
    SELECT user_id, COUNT(*) AS len, MAX(rn) AS last_rn
      FROM ordered
     WHERE is_correct
     GROUP BY user_id, rn - rn_in_group
  ),
  totals AS (
    SELECT user_id, COUNT(*) AS total, COUNT(*) FILTER (WHERE is_correct) AS correct,
           MAX(rn) AS max_rn, MAX(answered_at) AS last_at
      FROM ordered
     GROUP BY user_id
  )
  INSERT INTO user_stats AS s (user_id, total_answered, correct_count, streak, best_streak, last_answered_at, updated_at)
  SELECT t.user_id, t.total, t.correct,
         COALESCE((SELECT r.len FROM runs r WHERE r.user_id = t.user_id AND r.last_rn = t.max_rn), 0),
         COALESCE((SELECT MAX(r.len) FROM runs r WHERE r.user_id = t.user_id), 0),
         t.last_at, now()
    FROM totals t
  ON CONFLICT (user_id) DO UPDATE SET
    total_answered   = EXCLUDED.total_answered,
    correct_count    = EXCLUDED.correct_count,
    streak           = EXCLUDED.streak,
    best_streak      = EXCLUDED.best_streak,
    last_answered_at = EXCLUDED.last_answered_at,
    updated_at       = now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;


ALTER FUNCTION "public"."rebuild_user_stats"("p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_quarantined_question"("p_question_id" "uuid", "p_outcome" "text", "p_moderator" "uuid", "p_note" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_outcome NOT IN ('restored', 'retired') THEN
    RAISE EXCEPTION 'resolve_quarantined_question: outcome must be restored or retired';
  END IF;

  UPDATE questions
     SET status = CASE p_outcome WHEN 'restored' THEN 'verified' ELSE 'rejected' END,
         dispute_count = CASE p_outcome WHEN 'restored' THEN 0 ELSE dispute_count END
   WHERE id = p_question_id AND status = 'quarantined';
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE question_disputes
     SET resolved_at = now(), resolved_by = p_moderator, resolution = p_outcome, resolution_note = p_note
   WHERE question_id = p_question_id AND resolved_at IS NULL;
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."resolve_quarantined_question"("p_question_id" "uuid", "p_outcome" "text", "p_moderator" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_topic"("p_name" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT id FROM topics WHERE slug = slugify_topic(p_name);
$$;


ALTER FUNCTION "public"."resolve_topic"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_questions"("p_query" "text", "p_limit" integer, "p_offset" integer, "p_locale" "text" DEFAULT 'en'::"text") RETURNS TABLE("id" "uuid", "prompt" "text", "category" "text", "author_name" "text", "created_at" timestamp with time zone, "score" real)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."search_questions"("p_query" "text", "p_limit" integer, "p_offset" integer, "p_locale" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."slugify_topic"("p_name" "text") RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    NULLIF(trim(BOTH '-' FROM regexp_replace(lower(unaccent(COALESCE(NULLIF(trim(p_name), ''), 'General'))), '[^a-z0-9]+', '-', 'g')), ''),
    'topic-' || substr(md5(lower(trim(p_name))), 1, 8)
  );
$$;


ALTER FUNCTION "public"."slugify_topic"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_dispute_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  qid UUID := COALESCE(NEW.question_id, OLD.question_id);
BEGIN
  -- Own statement: the UPDATE below then takes its snapshot after the lock wait.
  PERFORM 1 FROM questions WHERE id = qid FOR NO KEY UPDATE;
  UPDATE questions
     SET dispute_count = (SELECT count(*) FROM question_disputes WHERE question_id = qid AND resolved_at IS NULL)
   WHERE id = qid;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_dispute_count"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "slug" "text" NOT NULL,
    "metric" "text" NOT NULL,
    "threshold" integer NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "achievements_metric_check" CHECK (("metric" = ANY (ARRAY['total_answered'::"text", 'correct_count'::"text", 'best_streak'::"text", 'daily_completed'::"text"]))),
    CONSTRAINT "achievements_slug_check" CHECK (("slug" ~ '^[a-z0-9_]+$'::"text")),
    CONSTRAINT "achievements_threshold_check" CHECK (("threshold" > 0))
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_attempts" (
    "id" bigint NOT NULL,
    "key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."auth_attempts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."auth_attempts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."auth_attempts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."auth_attempts_id_seq" OWNED BY "public"."auth_attempts"."id";



CREATE TABLE IF NOT EXISTS "public"."daily_attempt_answers" (
    "attempt_id" "uuid" NOT NULL,
    "challenge_date" "date" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "answer_index" integer NOT NULL,
    "is_correct" boolean NOT NULL,
    "answered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "daily_attempt_answers_answer_index_check" CHECK ((("answer_index" >= 0) AND ("answer_index" <= 3)))
);


ALTER TABLE "public"."daily_attempt_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "challenge_date" "date" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    "correct_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "daily_attempts_check" CHECK ((("finished_at" IS NULL) OR ("finished_at" >= "started_at"))),
    CONSTRAINT "daily_attempts_correct_count_check" CHECK (("correct_count" >= 0))
);


ALTER TABLE "public"."daily_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_challenge_questions" (
    "challenge_date" "date" NOT NULL,
    "position" smallint NOT NULL,
    "question_id" "uuid" NOT NULL,
    CONSTRAINT "daily_challenge_questions_position_check" CHECK ((("position" >= 1) AND ("position" <= 20)))
);


ALTER TABLE "public"."daily_challenge_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_challenges" (
    "challenge_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_members" (
    "group_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "owner_user" "uuid" NOT NULL,
    CONSTRAINT "groups_description_length" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 200))),
    CONSTRAINT "groups_name_length" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 50)))
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    CONSTRAINT "question_comments_body_check" CHECK ((("char_length"("body") >= 1) AND ("char_length"("body") <= 500))),
    CONSTRAINT "question_comments_kind_check" CHECK (("kind" = ANY (ARRAY['comment'::"text", 'suggestion'::"text"])))
);


ALTER TABLE "public"."question_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_disputes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reporter_user" "uuid" NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "resolution" "text",
    "resolution_note" "text",
    CONSTRAINT "question_disputes_reason_length" CHECK ((("char_length"("reason") >= 1) AND ("char_length"("reason") <= 500))),
    CONSTRAINT "question_disputes_resolution_check" CHECK (("resolution" = ANY (ARRAY['restored'::"text", 'retired'::"text"]))),
    CONSTRAINT "question_disputes_resolved_together" CHECK ((("resolved_at" IS NULL) = ("resolution" IS NULL)))
);


ALTER TABLE "public"."question_disputes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_ratings" (
    "question_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "question_ratings_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."question_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prompt" "text" NOT NULL,
    "options" "jsonb" NOT NULL,
    "correct_index" integer NOT NULL,
    "explanation" "text",
    "status" "text" DEFAULT 'verified'::"text" NOT NULL,
    "dispute_count" integer DEFAULT 0 NOT NULL,
    "verified_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by_user" "uuid",
    "topic_id" "uuid" NOT NULL,
    CONSTRAINT "questions_correct_index_check" CHECK ((("correct_index" >= 0) AND ("correct_index" <= 3))),
    CONSTRAINT "questions_explanation_length" CHECK ((("explanation" IS NULL) OR ("char_length"("explanation") <= 1000))),
    CONSTRAINT "questions_options_shape" CHECK (
CASE
    WHEN ("jsonb_typeof"("options") = 'array'::"text") THEN ((("jsonb_array_length"("options") >= 2) AND ("jsonb_array_length"("options") <= 4)) AND ("correct_index" < "jsonb_array_length"("options")))
    ELSE false
END),
    CONSTRAINT "questions_prompt_length" CHECK ((("char_length"("prompt") >= 1) AND ("char_length"("prompt") <= 300))),
    CONSTRAINT "questions_status_check" CHECK (("status" = ANY (ARRAY['verified'::"text", 'pending'::"text", 'quarantined'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "answer_index" integer NOT NULL,
    "is_correct" boolean NOT NULL,
    "answered_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL,
    CONSTRAINT "quiz_results_answer_index_range" CHECK ((("answer_index" >= '-1'::integer) AND ("answer_index" <= 3)))
);


ALTER TABLE "public"."quiz_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."remote_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."remote_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sponsors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "url" "text" NOT NULL,
    "icon" "text",
    "category" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sponsors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic_translations" (
    "topic_id" "uuid" NOT NULL,
    "locale" "text" NOT NULL,
    "name" "text" NOT NULL,
    CONSTRAINT "topic_translations_locale_check" CHECK (("locale" ~ '^[a-z]{2}(-[A-Z]{2})?$'::"text")),
    CONSTRAINT "topic_translations_name_check" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 60)))
);


ALTER TABLE "public"."topic_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "topics_slug_check" CHECK (("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text"))
);


ALTER TABLE "public"."topics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "user_id" "uuid" NOT NULL,
    "achievement" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_ai_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "generations_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."user_ai_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_stats" (
    "user_id" "uuid" NOT NULL,
    "total_answered" integer DEFAULT 0 NOT NULL,
    "correct_count" integer DEFAULT 0 NOT NULL,
    "streak" integer DEFAULT 0 NOT NULL,
    "best_streak" integer DEFAULT 0 NOT NULL,
    "last_answered_at" timestamp with time zone,
    "accuracy" integer GENERATED ALWAYS AS (
CASE
    WHEN ("total_answered" = 0) THEN 0
    ELSE ("floor"((((("correct_count")::double precision / ("total_answered")::double precision) * (100)::double precision) + (0.5)::double precision)))::integer
END) STORED,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_stats_check" CHECK ((("correct_count" >= 0) AND ("correct_count" <= "total_answered"))),
    CONSTRAINT "user_stats_check1" CHECK (("best_streak" >= "streak")),
    CONSTRAINT "user_stats_streak_check" CHECK (("streak" >= 0)),
    CONSTRAINT "user_stats_total_answered_check" CHECK (("total_answered" >= 0))
);


ALTER TABLE "public"."user_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "display_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'moderator'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."auth_attempts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."auth_attempts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("slug");



ALTER TABLE ONLY "public"."auth_attempts"
    ADD CONSTRAINT "auth_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_attempt_answers"
    ADD CONSTRAINT "daily_attempt_answers_pkey" PRIMARY KEY ("attempt_id", "question_id");



ALTER TABLE ONLY "public"."daily_attempts"
    ADD CONSTRAINT "daily_attempts_id_challenge_date_key" UNIQUE ("id", "challenge_date");



ALTER TABLE ONLY "public"."daily_attempts"
    ADD CONSTRAINT "daily_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_attempts"
    ADD CONSTRAINT "daily_attempts_user_id_challenge_date_key" UNIQUE ("user_id", "challenge_date");



ALTER TABLE ONLY "public"."daily_challenge_questions"
    ADD CONSTRAINT "daily_challenge_questions_challenge_date_question_id_key" UNIQUE ("challenge_date", "question_id");



ALTER TABLE ONLY "public"."daily_challenge_questions"
    ADD CONSTRAINT "daily_challenge_questions_pkey" PRIMARY KEY ("challenge_date", "position");



ALTER TABLE ONLY "public"."daily_challenges"
    ADD CONSTRAINT "daily_challenges_pkey" PRIMARY KEY ("challenge_date");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("group_id", "user_id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_comments"
    ADD CONSTRAINT "question_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_disputes"
    ADD CONSTRAINT "question_disputes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_ratings"
    ADD CONSTRAINT "question_ratings_pkey" PRIMARY KEY ("question_id", "user_id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_results"
    ADD CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."remote_config"
    ADD CONSTRAINT "remote_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."sponsors"
    ADD CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_translations"
    ADD CONSTRAINT "topic_translations_pkey" PRIMARY KEY ("topic_id", "locale");



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("user_id", "achievement");



ALTER TABLE ONLY "public"."user_ai_usage"
    ADD CONSTRAINT "user_ai_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_ai_usage"
    ADD CONSTRAINT "user_ai_usage_user_id_action_date_key" UNIQUE ("user_id", "action_date");



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "auth_attempts_created" ON "public"."auth_attempts" USING "btree" ("created_at");



CREATE INDEX "auth_attempts_key_created" ON "public"."auth_attempts" USING "btree" ("key", "created_at" DESC);



CREATE INDEX "daily_attempts_rank" ON "public"."daily_attempts" USING "btree" ("challenge_date", "correct_count" DESC, "finished_at");



CREATE INDEX "groups_owner_user" ON "public"."groups" USING "btree" ("owner_user");



CREATE INDEX "idx_group_members_user" ON "public"."group_members" USING "btree" ("user_id");



CREATE INDEX "idx_question_comments_qid_created" ON "public"."question_comments" USING "btree" ("question_id", "created_at" DESC);



CREATE INDEX "idx_question_comments_uid_created" ON "public"."question_comments" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_question_disputes_qid" ON "public"."question_disputes" USING "btree" ("question_id");



CREATE INDEX "idx_question_ratings_user" ON "public"."question_ratings" USING "btree" ("user_id");



CREATE INDEX "idx_questions_created_by_user" ON "public"."questions" USING "btree" ("created_by_user");



CREATE INDEX "idx_questions_prompt_trgm" ON "public"."questions" USING "gin" ("lower"("prompt") "public"."gin_trgm_ops");



CREATE INDEX "idx_quiz_results_question" ON "public"."quiz_results" USING "btree" ("question_id");



CREATE UNIQUE INDEX "question_disputes_one_per_account" ON "public"."question_disputes" USING "btree" ("question_id", "reporter_user");



CREATE INDEX "questions_status_created" ON "public"."questions" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "questions_topic" ON "public"."questions" USING "btree" ("topic_id", "created_at" DESC);



CREATE UNIQUE INDEX "quiz_results_one_answer_per_account" ON "public"."quiz_results" USING "btree" ("user_id", "question_id");



CREATE INDEX "quiz_results_user_answered" ON "public"."quiz_results" USING "btree" ("user_id", "answered_at" DESC);



CREATE INDEX "topic_translations_name_trgm" ON "public"."topic_translations" USING "gin" ("lower"("name") "public"."gin_trgm_ops");



CREATE INDEX "user_achievements_user" ON "public"."user_achievements" USING "btree" ("user_id", "unlocked_at" DESC);



CREATE INDEX "user_stats_rank" ON "public"."user_stats" USING "btree" ("correct_count" DESC, "accuracy" DESC, "user_id");



CREATE OR REPLACE TRIGGER "daily_attempt_answers_apply" AFTER INSERT ON "public"."daily_attempt_answers" FOR EACH ROW EXECUTE FUNCTION "public"."apply_daily_answer"();



CREATE OR REPLACE TRIGGER "question_disputes_sync_count" AFTER INSERT OR DELETE OR UPDATE OF "resolved_at" ON "public"."question_disputes" FOR EACH ROW EXECUTE FUNCTION "public"."sync_dispute_count"();



CREATE OR REPLACE TRIGGER "quiz_results_apply" AFTER INSERT ON "public"."quiz_results" FOR EACH ROW EXECUTE FUNCTION "public"."apply_quiz_result"();



ALTER TABLE ONLY "public"."daily_attempt_answers"
    ADD CONSTRAINT "daily_attempt_answers_attempt_id_challenge_date_fkey" FOREIGN KEY ("attempt_id", "challenge_date") REFERENCES "public"."daily_attempts"("id", "challenge_date") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_attempt_answers"
    ADD CONSTRAINT "daily_attempt_answers_challenge_date_question_id_fkey" FOREIGN KEY ("challenge_date", "question_id") REFERENCES "public"."daily_challenge_questions"("challenge_date", "question_id");



ALTER TABLE ONLY "public"."daily_attempts"
    ADD CONSTRAINT "daily_attempts_challenge_date_fkey" FOREIGN KEY ("challenge_date") REFERENCES "public"."daily_challenges"("challenge_date") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_attempts"
    ADD CONSTRAINT "daily_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_challenge_questions"
    ADD CONSTRAINT "daily_challenge_questions_challenge_date_fkey" FOREIGN KEY ("challenge_date") REFERENCES "public"."daily_challenges"("challenge_date") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_challenge_questions"
    ADD CONSTRAINT "daily_challenge_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_owner_user_fkey" FOREIGN KEY ("owner_user") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_comments"
    ADD CONSTRAINT "question_comments_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_comments"
    ADD CONSTRAINT "question_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_disputes"
    ADD CONSTRAINT "question_disputes_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_disputes"
    ADD CONSTRAINT "question_disputes_reporter_user_fkey" FOREIGN KEY ("reporter_user") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_disputes"
    ADD CONSTRAINT "question_disputes_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_ratings"
    ADD CONSTRAINT "question_ratings_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_ratings"
    ADD CONSTRAINT "question_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_created_by_user_fkey" FOREIGN KEY ("created_by_user") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id");



ALTER TABLE ONLY "public"."quiz_results"
    ADD CONSTRAINT "quiz_results_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_results"
    ADD CONSTRAINT "quiz_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_translations"
    ADD CONSTRAINT "topic_translations_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_fkey" FOREIGN KEY ("achievement") REFERENCES "public"."achievements"("slug") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Allow public read access on sponsors" ON "public"."sponsors" FOR SELECT USING (("active" = true));



CREATE POLICY "Allow public read for achievements" ON "public"."achievements" FOR SELECT USING (true);



CREATE POLICY "Allow public read for group_members" ON "public"."group_members" FOR SELECT USING (true);



CREATE POLICY "Allow public read for groups" ON "public"."groups" FOR SELECT USING (true);



CREATE POLICY "Allow public read for questions" ON "public"."questions" FOR SELECT USING (true);



CREATE POLICY "Allow public read for topic_translations" ON "public"."topic_translations" FOR SELECT USING (true);



CREATE POLICY "Allow public read for topics" ON "public"."topics" FOR SELECT USING (true);



CREATE POLICY "Allow public read for users" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Allow public read on remote_config" ON "public"."remote_config" FOR SELECT USING (true);



ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_attempt_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_challenge_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_disputes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_ratings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."remote_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sponsors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topic_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_ai_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_daily_answer"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_daily_answer"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_quiz_result"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_quiz_result"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."award_achievements"("p_user" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."award_achievements"("p_user" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_leaderboard"("p_date" "date", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_leaderboard"("p_date" "date", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_leaderboard"("p_date" "date", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_global_leaderboard"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_global_leaderboard"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_global_leaderboard"("p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_group_leaderboard"("p_group_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_group_leaderboard"("p_group_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_group_leaderboard"("p_group_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_or_create_topic"("p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_or_create_topic"("p_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_question_analytics"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_question_analytics"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_rating_summary"("p_question_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_rating_summary"("p_question_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_rating_summary"("p_question_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_topics"("p_locale" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_topics"("p_locale" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_topics"("p_locale" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_stats"("p_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_stats"("p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_stats"("p_user" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_ai_generation"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_ai_generation"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."pick_daily_challenge"("p_date" "date", "p_count" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."pick_daily_challenge"("p_date" "date", "p_count" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rate_limit_hit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rate_limit_hit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rebuild_user_stats"("p_user" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rebuild_user_stats"("p_user" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_quarantined_question"("p_question_id" "uuid", "p_outcome" "text", "p_moderator" "uuid", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_quarantined_question"("p_question_id" "uuid", "p_outcome" "text", "p_moderator" "uuid", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_topic"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_topic"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_topic"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_questions"("p_query" "text", "p_limit" integer, "p_offset" integer, "p_locale" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_questions"("p_query" "text", "p_limit" integer, "p_offset" integer, "p_locale" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_questions"("p_query" "text", "p_limit" integer, "p_offset" integer, "p_locale" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."slugify_topic"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."slugify_topic"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."slugify_topic"("p_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_dispute_count"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_dispute_count"() TO "service_role";



GRANT ALL ON TABLE "public"."achievements" TO "service_role";
GRANT SELECT ON TABLE "public"."achievements" TO "anon";
GRANT SELECT ON TABLE "public"."achievements" TO "authenticated";



GRANT ALL ON TABLE "public"."auth_attempts" TO "anon";
GRANT ALL ON TABLE "public"."auth_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_attempts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."auth_attempts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."auth_attempts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auth_attempts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."daily_attempt_answers" TO "service_role";



GRANT ALL ON TABLE "public"."daily_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."daily_challenge_questions" TO "service_role";



GRANT ALL ON TABLE "public"."daily_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."group_members" TO "anon";
GRANT ALL ON TABLE "public"."group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."group_members" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."question_comments" TO "anon";
GRANT ALL ON TABLE "public"."question_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."question_comments" TO "service_role";



GRANT ALL ON TABLE "public"."question_disputes" TO "anon";
GRANT ALL ON TABLE "public"."question_disputes" TO "authenticated";
GRANT ALL ON TABLE "public"."question_disputes" TO "service_role";



GRANT ALL ON TABLE "public"."question_ratings" TO "anon";
GRANT ALL ON TABLE "public"."question_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."question_ratings" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."questions" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."questions" TO "anon";
GRANT SELECT("id") ON TABLE "public"."questions" TO "authenticated";



GRANT SELECT("prompt") ON TABLE "public"."questions" TO "anon";
GRANT SELECT("prompt") ON TABLE "public"."questions" TO "authenticated";



GRANT SELECT("options") ON TABLE "public"."questions" TO "anon";
GRANT SELECT("options") ON TABLE "public"."questions" TO "authenticated";



GRANT SELECT("status") ON TABLE "public"."questions" TO "anon";
GRANT SELECT("status") ON TABLE "public"."questions" TO "authenticated";



GRANT SELECT("dispute_count") ON TABLE "public"."questions" TO "anon";
GRANT SELECT("dispute_count") ON TABLE "public"."questions" TO "authenticated";



GRANT SELECT("verified_at") ON TABLE "public"."questions" TO "anon";
GRANT SELECT("verified_at") ON TABLE "public"."questions" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."questions" TO "anon";
GRANT SELECT("created_at") ON TABLE "public"."questions" TO "authenticated";



GRANT SELECT("created_by_user") ON TABLE "public"."questions" TO "anon";
GRANT SELECT("created_by_user") ON TABLE "public"."questions" TO "authenticated";



GRANT SELECT("topic_id") ON TABLE "public"."questions" TO "anon";
GRANT SELECT("topic_id") ON TABLE "public"."questions" TO "authenticated";



GRANT ALL ON TABLE "public"."quiz_results" TO "anon";
GRANT ALL ON TABLE "public"."quiz_results" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_results" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."remote_config" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."remote_config" TO "authenticated";
GRANT ALL ON TABLE "public"."remote_config" TO "service_role";



GRANT ALL ON TABLE "public"."sponsors" TO "anon";
GRANT ALL ON TABLE "public"."sponsors" TO "authenticated";
GRANT ALL ON TABLE "public"."sponsors" TO "service_role";



GRANT ALL ON TABLE "public"."topic_translations" TO "service_role";
GRANT SELECT ON TABLE "public"."topic_translations" TO "anon";
GRANT SELECT ON TABLE "public"."topic_translations" TO "authenticated";



GRANT ALL ON TABLE "public"."topics" TO "service_role";
GRANT SELECT ON TABLE "public"."topics" TO "anon";
GRANT SELECT ON TABLE "public"."topics" TO "authenticated";



GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."user_ai_usage" TO "anon";
GRANT ALL ON TABLE "public"."user_ai_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."user_ai_usage" TO "service_role";



GRANT ALL ON TABLE "public"."user_stats" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."users" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT SELECT("display_name") ON TABLE "public"."users" TO "anon";
GRANT SELECT("display_name") ON TABLE "public"."users" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."users" TO "anon";
GRANT SELECT("created_at") ON TABLE "public"."users" TO "authenticated";



GRANT SELECT("id") ON TABLE "public"."users" TO "anon";
GRANT SELECT("id") ON TABLE "public"."users" TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








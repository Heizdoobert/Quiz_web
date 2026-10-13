


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


-- Baseline edit: the dump omits extensions, but the trigram indexes below need pg_trgm in public.
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";



CREATE OR REPLACE FUNCTION "public"."get_contest_analytics"("p_list_id" "uuid") RETURNS TABLE("participation_count" bigint, "completion_rate" numeric, "avg_score" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(le.user_id) as participation_count,
        COALESCE(SUM(CASE WHEN le.status IN ('completed', 'claimed') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(le.user_id), 0), 0) as completion_rate,
        COALESCE(AVG(le.correct_count), 0) as avg_score
    FROM list_entries le
    WHERE le.list_id = p_list_id;
END;
$$;


ALTER FUNCTION "public"."get_contest_analytics"("p_list_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_global_leaderboard"("p_limit" integer, "p_offset" integer DEFAULT 0) RETURNS TABLE("user_id" "uuid", "display_name" "text", "score" integer, "accuracy" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH totals AS (
    SELECT
      r.user_id,
      (COUNT(*) FILTER (WHERE r.is_correct))::INT AS score,
      FLOOR((COUNT(*) FILTER (WHERE r.is_correct))::FLOAT8 / COUNT(*) * 100 + 0.5)::INT AS accuracy
    FROM quiz_results r
    GROUP BY r.user_id
  )
  SELECT u.id, u.display_name, t.score, t.accuracy
  FROM totals t
  JOIN users u ON u.id = t.user_id
  ORDER BY t.score DESC, t.accuracy DESC, u.id
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;


ALTER FUNCTION "public"."get_global_leaderboard"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_group_leaderboard"("p_group_id" "uuid", "p_limit" integer, "p_offset" integer DEFAULT 0) RETURNS TABLE("user_id" "uuid", "display_name" "text", "score" integer, "accuracy" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH totals AS (
    SELECT
      m.user_id,
      (COUNT(r.id) FILTER (WHERE r.is_correct))::INT AS score,
      CASE WHEN COUNT(r.id) = 0 THEN 0
        ELSE FLOOR((COUNT(r.id) FILTER (WHERE r.is_correct))::FLOAT8 / COUNT(r.id) * 100 + 0.5)::INT
      END AS accuracy
    FROM group_members m
    LEFT JOIN quiz_results r ON r.user_id = m.user_id
    WHERE m.group_id = p_group_id
    GROUP BY m.user_id
  )
  SELECT u.id, u.display_name, t.score, t.accuracy
  FROM totals t
  JOIN users u ON u.id = t.user_id
  ORDER BY t.score DESC, t.accuracy DESC, u.id
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;


ALTER FUNCTION "public"."get_group_leaderboard"("p_group_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_question_analytics"("p_user_id" "uuid") RETURNS TABLE("question_id" "uuid", "prompt" "text", "play_count" bigint, "accuracy_rate" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id as question_id,
        q.prompt,
        COUNT(qr.id) as play_count,
        COALESCE(SUM(CASE WHEN qr.is_correct THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(qr.id), 0), 0) as accuracy_rate
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


CREATE OR REPLACE FUNCTION "public"."get_topics"() RETURNS TABLE("name" "text", "question_count" integer, "latest_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_topics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_stats"("p_user" "uuid") RETURNS TABLE("total_answered" integer, "correct_count" integer, "streak" integer, "best_streak" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH ordered AS (
    SELECT
      is_correct,
      ROW_NUMBER() OVER (ORDER BY answered_at, id) AS rn,
      ROW_NUMBER() OVER (PARTITION BY is_correct ORDER BY answered_at, id) AS rn_in_group
    FROM quiz_results
    WHERE user_id = p_user
  ),
  correct_runs AS (
    -- Rows in the same run of correct answers share rn - rn_in_group.
    SELECT COUNT(*) AS len, MAX(rn) AS last_rn
    FROM ordered
    WHERE is_correct
    GROUP BY rn - rn_in_group
  )
  SELECT
    (SELECT COUNT(*) FROM ordered)::INT,
    (SELECT COUNT(*) FROM ordered WHERE is_correct)::INT,
    COALESCE((SELECT len FROM correct_runs WHERE last_rn = (SELECT MAX(rn) FROM ordered)), 0)::INT,
    COALESCE((SELECT MAX(len) FROM correct_runs), 0)::INT;
$$;


ALTER FUNCTION "public"."get_user_stats"("p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_ai_generation"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION "public"."search_questions"("p_query" "text", "p_limit" integer, "p_offset" integer) RETURNS TABLE("id" "uuid", "prompt" "text", "category" "text", "author_name" "text", "created_at" timestamp with time zone, "score" real)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."search_questions"("p_query" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


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



CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" DEFAULT 'General'::"text" NOT NULL,
    "prompt" "text" NOT NULL,
    "options" "jsonb" NOT NULL,
    "correct_index" integer NOT NULL,
    "explanation" "text",
    "status" "text" DEFAULT 'verified'::"text" NOT NULL,
    "dispute_count" integer DEFAULT 0 NOT NULL,
    "verified_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "list_id" "uuid",
    "created_by_user" "uuid",
    CONSTRAINT "questions_correct_index_check" CHECK ((("correct_index" >= 0) AND ("correct_index" <= 3))),
    CONSTRAINT "questions_status_check" CHECK (("status" = ANY (ARRAY['verified'::"text", 'pending'::"text", 'quarantined'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."client_questions" AS
 SELECT "id",
    "category",
    "prompt",
    "options",
    "created_at"
   FROM "public"."questions";


ALTER VIEW "public"."client_questions" OWNER TO "postgres";


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
    "owner_user" "uuid" NOT NULL
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."list_entries" (
    "list_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "correct_count" integer DEFAULT 0 NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL,
    CONSTRAINT "list_entries_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text", 'claimed'::"text", 'reviewer'::"text"])))
);


ALTER TABLE "public"."list_entries" OWNER TO "postgres";


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
    CONSTRAINT "question_disputes_resolution_check" CHECK (("resolution" = ANY (ARRAY['restored'::"text", 'retired'::"text"]))),
    CONSTRAINT "question_disputes_resolved_together" CHECK ((("resolved_at" IS NULL) = ("resolution" IS NULL)))
);


ALTER TABLE "public"."question_disputes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_list_confirmations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "list_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "confirmer_user" "uuid" NOT NULL
);


ALTER TABLE "public"."question_list_confirmations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_lists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "max_participants" integer DEFAULT 10 NOT NULL,
    "submitted_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "refunded_at" timestamp with time zone,
    "owner_user" "uuid" NOT NULL,
    CONSTRAINT "question_lists_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'approved'::"text", 'live'::"text", 'completed'::"text", 'expired'::"text", 'refunded'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."question_lists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_ratings" (
    "question_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "question_ratings_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."question_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "answer_index" integer NOT NULL,
    "is_correct" boolean NOT NULL,
    "answered_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL
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


CREATE TABLE IF NOT EXISTS "public"."user_ai_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "generations_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."user_ai_usage" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."auth_attempts"
    ADD CONSTRAINT "auth_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("group_id", "user_id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."list_entries"
    ADD CONSTRAINT "list_entries_pkey" PRIMARY KEY ("list_id", "user_id");



ALTER TABLE ONLY "public"."question_comments"
    ADD CONSTRAINT "question_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_disputes"
    ADD CONSTRAINT "question_disputes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_list_confirmations"
    ADD CONSTRAINT "question_list_confirmations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_lists"
    ADD CONSTRAINT "question_lists_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."user_ai_usage"
    ADD CONSTRAINT "user_ai_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_ai_usage"
    ADD CONSTRAINT "user_ai_usage_user_id_action_date_key" UNIQUE ("user_id", "action_date");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "auth_attempts_created" ON "public"."auth_attempts" USING "btree" ("created_at");



CREATE INDEX "auth_attempts_key_created" ON "public"."auth_attempts" USING "btree" ("key", "created_at" DESC);



CREATE INDEX "idx_group_members_user" ON "public"."group_members" USING "btree" ("user_id");



CREATE INDEX "idx_list_confirmations_list" ON "public"."question_list_confirmations" USING "btree" ("list_id");



CREATE INDEX "idx_question_comments_qid_created" ON "public"."question_comments" USING "btree" ("question_id", "created_at" DESC);



CREATE INDEX "idx_question_comments_uid_created" ON "public"."question_comments" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_question_disputes_qid" ON "public"."question_disputes" USING "btree" ("question_id");



CREATE INDEX "idx_question_lists_owner_user" ON "public"."question_lists" USING "btree" ("owner_user");



CREATE INDEX "idx_question_ratings_user" ON "public"."question_ratings" USING "btree" ("user_id");



CREATE INDEX "idx_questions_category_trgm" ON "public"."questions" USING "gin" ("lower"("category") "public"."gin_trgm_ops");



CREATE INDEX "idx_questions_created_by_user" ON "public"."questions" USING "btree" ("created_by_user");



CREATE INDEX "idx_questions_list_id" ON "public"."questions" USING "btree" ("list_id");



CREATE INDEX "idx_questions_prompt_trgm" ON "public"."questions" USING "gin" ("lower"("prompt") "public"."gin_trgm_ops");



CREATE INDEX "idx_quiz_results_question" ON "public"."quiz_results" USING "btree" ("question_id");



CREATE UNIQUE INDEX "question_disputes_one_per_account" ON "public"."question_disputes" USING "btree" ("question_id", "reporter_user");



CREATE UNIQUE INDEX "question_list_confirmations_one_per_account" ON "public"."question_list_confirmations" USING "btree" ("list_id", "confirmer_user");



CREATE UNIQUE INDEX "quiz_results_one_answer_per_account" ON "public"."quiz_results" USING "btree" ("user_id", "question_id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_owner_user_fkey" FOREIGN KEY ("owner_user") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."list_entries"
    ADD CONSTRAINT "list_entries_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "public"."question_lists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."list_entries"
    ADD CONSTRAINT "list_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



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



ALTER TABLE ONLY "public"."question_list_confirmations"
    ADD CONSTRAINT "question_list_confirmations_confirmer_user_fkey" FOREIGN KEY ("confirmer_user") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_list_confirmations"
    ADD CONSTRAINT "question_list_confirmations_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "public"."question_lists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_lists"
    ADD CONSTRAINT "question_lists_owner_user_fkey" FOREIGN KEY ("owner_user") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_ratings"
    ADD CONSTRAINT "question_ratings_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_ratings"
    ADD CONSTRAINT "question_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_created_by_user_fkey" FOREIGN KEY ("created_by_user") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "public"."question_lists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_results"
    ADD CONSTRAINT "quiz_results_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_results"
    ADD CONSTRAINT "quiz_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Allow public read access on sponsors" ON "public"."sponsors" FOR SELECT USING (("active" = true));



CREATE POLICY "Allow public read for group_members" ON "public"."group_members" FOR SELECT USING (true);



CREATE POLICY "Allow public read for groups" ON "public"."groups" FOR SELECT USING (true);



CREATE POLICY "Allow public read for list_entries" ON "public"."list_entries" FOR SELECT USING (true);



CREATE POLICY "Allow public read for question_list_confirmations" ON "public"."question_list_confirmations" FOR SELECT USING (true);



CREATE POLICY "Allow public read for question_lists" ON "public"."question_lists" FOR SELECT USING (true);



CREATE POLICY "Allow public read for questions" ON "public"."questions" FOR SELECT USING (true);



CREATE POLICY "Allow public read for users" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Allow public read on remote_config" ON "public"."remote_config" FOR SELECT USING (true);



ALTER TABLE "public"."auth_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."list_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_disputes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_list_confirmations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_lists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_ratings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."remote_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sponsors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_ai_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_contest_analytics"("p_list_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_contest_analytics"("p_list_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_contest_analytics"("p_list_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_global_leaderboard"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_global_leaderboard"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_global_leaderboard"("p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_group_leaderboard"("p_group_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_group_leaderboard"("p_group_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_group_leaderboard"("p_group_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_question_analytics"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_question_analytics"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_question_analytics"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_rating_summary"("p_question_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_rating_summary"("p_question_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_rating_summary"("p_question_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_topics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_topics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_topics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_stats"("p_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_stats"("p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_stats"("p_user" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_ai_generation"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_ai_generation"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_ai_generation"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rate_limit_hit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) FROM PUBLIC;
-- Baseline edit: default privileges grant ALL at CREATE, and pg_dump does not emit the legacy REVOKEs.
REVOKE ALL ON FUNCTION "public"."rate_limit_hit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) FROM "anon";
REVOKE ALL ON FUNCTION "public"."rate_limit_hit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) FROM "authenticated";
GRANT ALL ON FUNCTION "public"."rate_limit_hit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_quarantined_question"("p_question_id" "uuid", "p_outcome" "text", "p_moderator" "uuid", "p_note" "text") FROM PUBLIC;
-- Baseline edit: default privileges grant ALL at CREATE, and pg_dump does not emit the legacy REVOKEs.
REVOKE ALL ON FUNCTION "public"."resolve_quarantined_question"("p_question_id" "uuid", "p_outcome" "text", "p_moderator" "uuid", "p_note" "text") FROM "anon";
REVOKE ALL ON FUNCTION "public"."resolve_quarantined_question"("p_question_id" "uuid", "p_outcome" "text", "p_moderator" "uuid", "p_note" "text") FROM "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_quarantined_question"("p_question_id" "uuid", "p_outcome" "text", "p_moderator" "uuid", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_questions"("p_query" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_questions"("p_query" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_questions"("p_query" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON TABLE "public"."auth_attempts" TO "anon";
GRANT ALL ON TABLE "public"."auth_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_attempts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."auth_attempts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."auth_attempts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auth_attempts_id_seq" TO "service_role";



-- Baseline edit: default privileges grant ALL at CREATE, and pg_dump does not emit the legacy REVOKEs.
REVOKE ALL ON TABLE "public"."questions" FROM "anon";
REVOKE ALL ON TABLE "public"."questions" FROM "authenticated";
REVOKE ALL ON TABLE "public"."questions" FROM "service_role";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."questions" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."questions" TO "anon";
GRANT SELECT("id") ON TABLE "public"."questions" TO "authenticated";



GRANT SELECT("category") ON TABLE "public"."questions" TO "anon";
GRANT SELECT("category") ON TABLE "public"."questions" TO "authenticated";



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



GRANT ALL ON TABLE "public"."client_questions" TO "anon";
GRANT ALL ON TABLE "public"."client_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."client_questions" TO "service_role";



GRANT ALL ON TABLE "public"."group_members" TO "anon";
GRANT ALL ON TABLE "public"."group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."group_members" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."list_entries" TO "anon";
GRANT ALL ON TABLE "public"."list_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."list_entries" TO "service_role";



GRANT ALL ON TABLE "public"."question_comments" TO "anon";
GRANT ALL ON TABLE "public"."question_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."question_comments" TO "service_role";



GRANT ALL ON TABLE "public"."question_disputes" TO "anon";
GRANT ALL ON TABLE "public"."question_disputes" TO "authenticated";
GRANT ALL ON TABLE "public"."question_disputes" TO "service_role";



GRANT ALL ON TABLE "public"."question_list_confirmations" TO "anon";
GRANT ALL ON TABLE "public"."question_list_confirmations" TO "authenticated";
GRANT ALL ON TABLE "public"."question_list_confirmations" TO "service_role";



GRANT ALL ON TABLE "public"."question_lists" TO "anon";
GRANT ALL ON TABLE "public"."question_lists" TO "authenticated";
GRANT ALL ON TABLE "public"."question_lists" TO "service_role";



GRANT ALL ON TABLE "public"."question_ratings" TO "anon";
GRANT ALL ON TABLE "public"."question_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."question_ratings" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_results" TO "anon";
GRANT ALL ON TABLE "public"."quiz_results" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_results" TO "service_role";



-- Baseline edit: default privileges grant ALL at CREATE, and pg_dump does not emit the legacy REVOKEs.
REVOKE ALL ON TABLE "public"."remote_config" FROM "anon";
REVOKE ALL ON TABLE "public"."remote_config" FROM "authenticated";
REVOKE ALL ON TABLE "public"."remote_config" FROM "service_role";
GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."remote_config" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."remote_config" TO "authenticated";
GRANT ALL ON TABLE "public"."remote_config" TO "service_role";



GRANT ALL ON TABLE "public"."sponsors" TO "anon";
GRANT ALL ON TABLE "public"."sponsors" TO "authenticated";
GRANT ALL ON TABLE "public"."sponsors" TO "service_role";



GRANT ALL ON TABLE "public"."user_ai_usage" TO "anon";
GRANT ALL ON TABLE "public"."user_ai_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."user_ai_usage" TO "service_role";



-- Baseline edit: default privileges grant ALL at CREATE, and pg_dump does not emit the legacy REVOKEs.
REVOKE ALL ON TABLE "public"."users" FROM "anon";
REVOKE ALL ON TABLE "public"."users" FROM "authenticated";
REVOKE ALL ON TABLE "public"."users" FROM "service_role";
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








-- Reference data a fresh database needs (the dump holds schema only).
INSERT INTO "public"."remote_config" ("key", "value")
VALUES ('maintenance_mode', 'false'::jsonb)
ON CONFLICT ("key") DO NOTHING;

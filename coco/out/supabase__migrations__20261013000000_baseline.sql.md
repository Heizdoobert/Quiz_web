# supabase/migrations/20261013000000_baseline.sql
lines:1176 exports:
---
-- PROVISIONAL BASELINE. Produced by replaying the legacy scripts in a local Supabase stack, NOT
-- from a production dump, so production may differ. Known evidence: the replay lost anon SELECT on
-- questions.list_id (re-added by hand below as a 'Baseline edit'), and production code calls
-- increment_ai_generation with the public key, so production likely grants it.
-- The owner must redo plan Task 0.4 from the real `supabase db dump` of production, and the schema
-- diff (scripts/db-schema-diff.sh) must be empty BEFORE `supabase migration repair` marks this
-- file applied anywhere. Keep every `-- Baseline edit:` hunk.




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

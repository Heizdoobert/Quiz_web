-- Attempt counter behind the auth rate limits (lib/services/rate-limit.ts).
-- Run in the Supabase SQL editor. Idempotent.
--
-- rate_limit_hit records one attempt for p_key and returns TRUE, or returns FALSE (recording
-- nothing, so a blocked caller cannot extend its own lockout) once p_max attempts already sit
-- inside the last p_window_seconds. The advisory lock makes check-then-insert atomic per key.

CREATE TABLE IF NOT EXISTS auth_attempts (
  id         BIGSERIAL PRIMARY KEY,
  key        TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_attempts_key_created ON auth_attempts (key, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_attempts_created ON auth_attempts (created_at);

-- RLS on with no policies: only the service role (which bypasses RLS) can touch it.
ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION rate_limit_hit(p_key TEXT, p_max INT, p_window_seconds INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION rate_limit_hit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rate_limit_hit(TEXT, INT, INT) TO service_role;

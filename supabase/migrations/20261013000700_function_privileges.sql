-- Phase 2d (spec F7). Two SECURITY DEFINER functions had no pinned search_path and were callable
-- with the public key: increment_ai_generation (any caller could burn another account's daily AI
-- quota) and get_question_analytics. Both are now server-only. Bodies are unchanged.
BEGIN;

CREATE OR REPLACE FUNCTION increment_ai_generation(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION get_question_analytics(p_user_id UUID)
RETURNS TABLE (question_id UUID, prompt TEXT, play_count BIGINT, accuracy_rate NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION increment_ai_generation(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_ai_generation(UUID) TO service_role;
REVOKE ALL ON FUNCTION get_question_analytics(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_question_analytics(UUID) TO service_role;

COMMIT;

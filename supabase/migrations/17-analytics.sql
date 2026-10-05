-- Add analytics functions for v0.5.0

CREATE OR REPLACE FUNCTION get_question_analytics(p_user_id UUID)
RETURNS TABLE (
    question_id UUID,
    prompt TEXT,
    play_count BIGINT,
    accuracy_rate NUMERIC
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_contest_analytics(p_list_id UUID)
RETURNS TABLE (
    participation_count BIGINT,
    completion_rate NUMERIC,
    avg_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(le.user_id) as participation_count,
        COALESCE(SUM(CASE WHEN le.status IN ('completed', 'claimed') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(le.user_id), 0), 0) as completion_rate,
        COALESCE(AVG(le.correct_count), 0) as avg_score
    FROM list_entries le
    WHERE le.list_id = p_list_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_question_analytics(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_contest_analytics(UUID) TO anon, authenticated;

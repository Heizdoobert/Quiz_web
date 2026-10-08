CREATE TABLE IF NOT EXISTS user_ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action_date DATE NOT NULL DEFAULT CURRENT_DATE,
    generations_count INT NOT NULL DEFAULT 0,
    UNIQUE(user_id, action_date)
);

CREATE OR REPLACE FUNCTION increment_ai_generation(p_user_id UUID)
RETURNS INT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

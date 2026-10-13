-- Enable RLS on user_ai_usage and prevent any public access.
-- All operations on this table are performed via the SECURITY DEFINER function increment_ai_generation.
ALTER TABLE user_ai_usage ENABLE ROW LEVEL SECURITY;

-- No public policies created.
-- This ensures that only the service_role (or SECURITY DEFINER functions) can read/write this table.

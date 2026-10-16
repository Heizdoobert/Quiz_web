-- Migration: add a separate usernames table to enforce uniqueness
-- This avoids needing to modify the auth.users table ownership.
CREATE TABLE IF NOT EXISTS public.usernames (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE NOT NULL
);

-- Optional: create an index on username for faster lookups (unique already creates one)
-- CREATE UNIQUE INDEX IF NOT EXISTS usernames_username_idx ON public.usernames (username);

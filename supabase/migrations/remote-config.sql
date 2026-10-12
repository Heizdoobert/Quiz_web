-- Remote config: flags and tunable values the owner changes in the Supabase dashboard.
-- Read by sdk/remote_config through the public key (RLS applies). No write policy exists, so
-- only the dashboard and the secret key can change a row. Never store a secret here.
-- Idempotent: safe to re-run in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS remote_config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE remote_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on remote_config" ON remote_config;
CREATE POLICY "Allow public read on remote_config"
  ON remote_config FOR SELECT
  USING (true);

-- TRUNCATE is not governed by RLS; revoking writes keeps a write policy added later by
-- mistake from opening writes on its own.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON remote_config FROM anon, authenticated;

INSERT INTO remote_config (key, value)
VALUES ('maintenance_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

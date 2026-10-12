-- RBAC (ADR-014): one role per account, and the columns a moderator's resolution of a
-- disputed question is recorded in. Idempotent: safe to re-run.
-- Apply to a Supabase branch first, then production (docs/migrations.md).
--
-- This script creates no admin. The repository is public, so the first admin is granted
-- by the one-off statement in docs/migrations.md, run with the owner's own email.
BEGIN;

-- Roles are data, permissions are code (lib/services/rbac.ts). Reads go through the
-- secret key only: the public-key column grant on users (accounts.sql) does not name role.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'moderator', 'admin'));

-- A moderator resolves a quarantined question: the open disputes are stamped, not deleted.
-- resolved_by is SET NULL, not CASCADE: deleting a moderator must not erase the history.
ALTER TABLE question_disputes ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE question_disputes ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE question_disputes ADD COLUMN IF NOT EXISTS resolution TEXT;
ALTER TABLE question_disputes ADD COLUMN IF NOT EXISTS resolution_note TEXT;
ALTER TABLE question_disputes DROP CONSTRAINT IF EXISTS question_disputes_resolution_check;
ALTER TABLE question_disputes ADD CONSTRAINT question_disputes_resolution_check
  CHECK (resolution IN ('restored', 'retired'));
ALTER TABLE question_disputes DROP CONSTRAINT IF EXISTS question_disputes_resolved_together;
ALTER TABLE question_disputes ADD CONSTRAINT question_disputes_resolved_together
  CHECK ((resolved_at IS NULL) = (resolution IS NULL));

-- schema.sql let the public key read every dispute, which would now expose who resolved one
-- and the moderator's note (and already exposed each reporter and their reason). Only the
-- server reads this table, through the secret key, so close it: RLS on, no policies.
DROP POLICY IF EXISTS "Allow public read for question_disputes" ON question_disputes;

-- Refuse to finish if the role column is readable with a public key (a table-level grant
-- would make it so). Rolls the whole script back.
DO $$
BEGIN
  IF has_column_privilege('anon', 'users', 'role', 'SELECT')
     OR has_column_privilege('authenticated', 'users', 'role', 'SELECT') THEN
    RAISE EXCEPTION '21-rbac.sql: users.role is readable with a public key; revoke the table-level SELECT on users and grant the display columns instead (see accounts.sql)';
  END IF;
END $$;

COMMIT;

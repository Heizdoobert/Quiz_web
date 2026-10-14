# supabase/migrations/21-rbac.sql
lines:91 exports:
---
-- RBAC (ADR-014): one role per account, and the columns a moderator's resolution of a
-- disputed question is recorded in. Idempotent: safe to re-run.
-- Apply to a Supabase branch first, then production (docs/migrations.md).
--
-- This script creates no admin. The repository is public, so the first admin is granted
-- by the one-off statement in docs/migrations.md, run with the owner's own email.
BEGIN;

-- Needs the account schema: users.id (accounts.sql) for the resolved_by key and
-- question_disputes (schema.sql). A database still keyed by wallet_address would otherwise
-- stop at the foreign key with 42703 "column id referenced in foreign key constraint does
-- not exist".
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id') THEN
    RAISE EXCEPTION '21-rbac.sql: public.users has no id column; apply accounts.sql first (docs/migrations.md)';
  END IF;
  IF to_regclass('public.question_disputes') IS NULL THEN
    RAISE EXCEPTION '21-rbac.sql: public.question_disputes does not exist; apply schema.sql and accounts.sql first (docs/migrations.md)';
  END IF;
END $$;

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

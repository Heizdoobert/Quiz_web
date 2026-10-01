# lib/sql/accounts.sql
lines:227 exports:
---
-- Accounts: users.id becomes the identity every table references; the wallet is optional.
-- Additive and safe to re-run. Run on a Supabase branch first, then production,
-- after the other lib/sql scripts. Old wallet columns stay, kept in sync by the
-- bridge trigger below, until lib/sql/accounts-drop-wallet-columns.sql removes them.
-- Everything runs in one transaction: any failed check rolls the whole script back.
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.pk_has_column(tbl regclass, col text) RETURNS boolean
LANGUAGE sql AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = tbl AND c.contype = 'p' AND a.attname = col
  );
$$;

CREATE OR REPLACE FUNCTION pg_temp.drop_primary_key(tbl regclass) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', tbl,
    (SELECT conname FROM pg_constraint WHERE conrelid = tbl AND contype = 'p'));
END $$;

-- The backfill matches wallets case-insensitively; two users rows that differ only
-- by case would make it ambiguous which account a row belongs to.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users WHERE wallet_address IS NOT NULL
    GROUP BY lower(wallet_address) HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'accounts.sql: users has wallet addresses that differ only by case; merge them first';
  END IF;
END $$;

-- users: account id, Supabase Auth link (email accounts), and when a wallet was added.
ALTER TABLE users ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid();
-- SET NULL, not CASCADE: deleting a login by mistake must not erase a player's history.
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_linked_at TIMESTAMPTZ;

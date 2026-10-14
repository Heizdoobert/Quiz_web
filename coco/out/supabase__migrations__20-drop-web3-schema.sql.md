# supabase/migrations/20-drop-web3-schema.sql
lines:150 exports:
---
-- Web2 only (ADR-013): drop the wallet, reward and escrow schema the app no longer uses.
-- This is the contract step accounts.sql left for later: every table is keyed by account
-- id, and the wallet columns were only kept in sync by the bridge trigger.
--
-- DESTRUCTIVE: removes reward_claims and every wallet address for good. Before applying,
-- take a backup or confirm point-in-time recovery, and make sure production runs code that
-- reads questions.created_by_user (not created_by). Apply to a Supabase branch first.
-- Re-runnable; one transaction, so a failed check leaves the database untouched.
-- Test: bash supabase/tests/run-drop-web3-schema.sh
BEGIN;

-- Refuse while any row is owned only through a wallet column: dropping it would orphan the row.
DO $$
DECLARE
  pair RECORD;
  n BIGINT;
BEGIN
  FOR pair IN SELECT * FROM (VALUES
    ('questions', 'created_by', 'created_by_user'),
    ('quiz_results', 'wallet_address', 'user_id'),
    ('groups', 'owner_wallet', 'owner_user'),
    ('group_members', 'wallet_address', 'user_id'),
    ('question_lists', 'owner_wallet', 'owner_user'),
    ('question_list_confirmations', 'confirmer_wallet', 'confirmer_user'),
    ('list_entries', 'wallet_address', 'user_id'),
    ('question_disputes', 'reporter_wallet', 'reporter_user')
  ) AS p(tbl, wallet_col, account_col)
  LOOP
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = pair.tbl AND column_name = pair.wallet_col
    );
    EXECUTE format('SELECT count(*) FROM %I WHERE %I IS NOT NULL AND %I IS NULL',
      pair.tbl, pair.wallet_col, pair.account_col) INTO n;
    IF n > 0 THEN
      RAISE EXCEPTION '20-drop-web3-schema.sql: % rows in % have % but no %; backfill them first',
        n, pair.tbl, pair.wallet_col, pair.account_col;
    END IF;
  END LOOP;
END $$;

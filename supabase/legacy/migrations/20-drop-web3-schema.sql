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

-- The bridge that kept wallet and account columns in sync.
DROP TRIGGER IF EXISTS questions_bridge_account ON questions;
DROP TRIGGER IF EXISTS quiz_results_bridge_account ON quiz_results;
DROP TRIGGER IF EXISTS groups_bridge_account ON groups;
DROP TRIGGER IF EXISTS group_members_bridge_account ON group_members;
DROP TRIGGER IF EXISTS question_lists_bridge_account ON question_lists;
DROP TRIGGER IF EXISTS question_list_confirmations_bridge_account ON question_list_confirmations;
DROP TRIGGER IF EXISTS list_entries_bridge_account ON list_entries;
DROP TRIGGER IF EXISTS question_disputes_bridge_account ON question_disputes;
DO $$
BEGIN
  IF to_regclass('public.reward_claims') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS reward_claims_bridge_account ON reward_claims;
  END IF;
END $$;
DROP FUNCTION IF EXISTS bridge_wallet_account();

-- Treasury sweep (reward-payee.sql) and the wallet-keyed stats kept for pre-accounts app code.
DROP FUNCTION IF EXISTS sweep_to_treasury();
DROP FUNCTION IF EXISTS get_treasury_entitled_count();
DROP FUNCTION IF EXISTS get_user_stats(TEXT);

-- Leaderboards without wallet_address (16-leaderboard-pagination.sql otherwise unchanged).
-- Changing the result columns needs DROP + CREATE; the app never read wallet_address.
DROP FUNCTION IF EXISTS get_global_leaderboard(INT);
DROP FUNCTION IF EXISTS get_global_leaderboard(INT, INT);
CREATE FUNCTION get_global_leaderboard(p_limit INT, p_offset INT DEFAULT 0)
RETURNS TABLE (user_id UUID, display_name TEXT, score INT, accuracy INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH totals AS (
    SELECT
      r.user_id,
      (COUNT(*) FILTER (WHERE r.is_correct))::INT AS score,
      FLOOR((COUNT(*) FILTER (WHERE r.is_correct))::FLOAT8 / COUNT(*) * 100 + 0.5)::INT AS accuracy
    FROM quiz_results r
    GROUP BY r.user_id
  )
  SELECT u.id, u.display_name, t.score, t.accuracy
  FROM totals t
  JOIN users u ON u.id = t.user_id
  ORDER BY t.score DESC, t.accuracy DESC, u.id
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;

DROP FUNCTION IF EXISTS get_group_leaderboard(UUID, INT);
DROP FUNCTION IF EXISTS get_group_leaderboard(UUID, INT, INT);
CREATE FUNCTION get_group_leaderboard(p_group_id UUID, p_limit INT, p_offset INT DEFAULT 0)
RETURNS TABLE (user_id UUID, display_name TEXT, score INT, accuracy INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH totals AS (
    SELECT
      m.user_id,
      (COUNT(r.id) FILTER (WHERE r.is_correct))::INT AS score,
      CASE WHEN COUNT(r.id) = 0 THEN 0
        ELSE FLOOR((COUNT(r.id) FILTER (WHERE r.is_correct))::FLOAT8 / COUNT(r.id) * 100 + 0.5)::INT
      END AS accuracy
    FROM group_members m
    LEFT JOIN quiz_results r ON r.user_id = m.user_id
    WHERE m.group_id = p_group_id
    GROUP BY m.user_id
  )
  SELECT u.id, u.display_name, t.score, t.accuracy
  FROM totals t
  JOIN users u ON u.id = t.user_id
  ORDER BY t.score DESC, t.accuracy DESC, u.id
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION get_global_leaderboard(INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_group_leaderboard(UUID, INT, INT) TO anon, authenticated;

-- Reward vouchers ($QUIZ, badges, contest payouts).
DROP TABLE IF EXISTS reward_claims;

-- Wallet, reward and escrow columns. No CASCADE: anything still depending on one of them
-- (a view, a foreign key from elsewhere) stops the script instead of vanishing with it.
-- users.wallet_address goes last, after the columns that may reference it.
ALTER TABLE questions DROP COLUMN IF EXISTS created_by;
ALTER TABLE quiz_results DROP COLUMN IF EXISTS wallet_address;
ALTER TABLE groups DROP COLUMN IF EXISTS owner_wallet;
ALTER TABLE group_members DROP COLUMN IF EXISTS wallet_address;
ALTER TABLE question_lists
  DROP COLUMN IF EXISTS owner_wallet,
  DROP COLUMN IF EXISTS reward_pool_tokens,
  DROP COLUMN IF EXISTS onchain_contest_id,
  DROP COLUMN IF EXISTS funding_tx_hash,
  DROP COLUMN IF EXISTS refund_tx_hash;
ALTER TABLE question_list_confirmations DROP COLUMN IF EXISTS confirmer_wallet;
ALTER TABLE list_entries
  DROP COLUMN IF EXISTS wallet_address,
  DROP COLUMN IF EXISTS reward_amount,
  DROP COLUMN IF EXISTS claim_tx_hash;
ALTER TABLE question_disputes DROP COLUMN IF EXISTS reporter_wallet;
ALTER TABLE users
  DROP COLUMN IF EXISTS treasury_swept_count,
  DROP COLUMN IF EXISTS wallet_linked_at,
  DROP COLUMN IF EXISTS wallet_address;

COMMIT;

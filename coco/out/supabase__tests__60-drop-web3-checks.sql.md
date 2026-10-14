# supabase/tests/60-drop-web3-checks.sql
lines:75 exports:
---
\set ON_ERROR_STOP 1
DO $$
DECLARE
  e UUID;
  f UUID;
  g UUID;
  q UUID;
  n INT;
BEGIN
  -- Gone: wallet, reward and escrow columns, the reward table, the bridge and treasury functions.
  SELECT count(*) INTO n FROM information_schema.columns
  WHERE table_schema = 'public' AND (table_name, column_name) IN (
    ('users', 'wallet_address'), ('users', 'wallet_linked_at'), ('users', 'treasury_swept_count'),
    ('questions', 'created_by'), ('quiz_results', 'wallet_address'), ('groups', 'owner_wallet'),
    ('group_members', 'wallet_address'), ('question_lists', 'owner_wallet'),
    ('question_lists', 'reward_pool_tokens'), ('question_lists', 'onchain_contest_id'),
    ('question_lists', 'funding_tx_hash'), ('question_lists', 'refund_tx_hash'),
    ('question_list_confirmations', 'confirmer_wallet'), ('list_entries', 'wallet_address'),
    ('list_entries', 'reward_amount'), ('list_entries', 'claim_tx_hash'),
    ('question_disputes', 'reporter_wallet'));
  ASSERT n = 0, format('%s wallet, reward or escrow columns remain', n);
  ASSERT to_regclass('public.reward_claims') IS NULL, 'reward_claims dropped';
  ASSERT to_regprocedure('bridge_wallet_account()') IS NULL, 'bridge_wallet_account dropped';
  ASSERT NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname LIKE '%\_bridge\_account'), 'bridge triggers dropped';
  ASSERT to_regprocedure('sweep_to_treasury()') IS NULL, 'sweep_to_treasury dropped';
  ASSERT to_regprocedure('get_treasury_entitled_count()') IS NULL, 'get_treasury_entitled_count dropped';
  ASSERT to_regprocedure('get_user_stats(text)') IS NULL, 'wallet-keyed get_user_stats dropped';

  -- Leaderboards: one overload each, no wallet in the result.
  ASSERT (SELECT count(*) FROM pg_proc WHERE proname = 'get_global_leaderboard') = 1, 'one get_global_leaderboard';
  ASSERT (SELECT count(*) FROM pg_proc WHERE proname = 'get_group_leaderboard') = 1, 'one get_group_leaderboard';
  ASSERT pg_get_function_result('get_global_leaderboard(int, int)'::regprocedure) NOT LIKE '%wallet%',
    'get_global_leaderboard returns no wallet';
  ASSERT pg_get_function_result('get_group_leaderboard(uuid, int, int)'::regprocedure) NOT LIKE '%wallet%',
    'get_group_leaderboard returns no wallet';

  -- Every function the app calls still runs.
  SELECT id INTO e FROM users WHERE display_name = 'E';
  SELECT id INTO g FROM groups ORDER BY name LIMIT 1;
  SELECT id INTO q FROM questions WHERE created_by_user = e LIMIT 1;

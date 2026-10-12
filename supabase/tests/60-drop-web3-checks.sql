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
  PERFORM * FROM get_global_leaderboard(50, 0);
  PERFORM * FROM get_group_leaderboard(g, 50, 0);
  PERFORM * FROM get_user_stats(e);
  PERFORM * FROM get_topics();
  PERFORM * FROM search_questions('Q', 10, 0);
  PERFORM * FROM get_question_analytics(e);
  PERFORM * FROM get_rating_summary(q);
  PERFORM rate_limit_hit('drop-web3-check', 5, 60);
  PERFORM increment_ai_generation(e);

  -- The app's writes (lib/actions, lib/services/users.ts) work without the bridge triggers.
  INSERT INTO questions (prompt, options, correct_index, category, explanation, created_by_user, status, dispute_count)
  VALUES ('Q after drop', '["a","b"]', 0, 'Test', NULL, e, 'verified', 0) RETURNING id INTO q;
  INSERT INTO quiz_results (user_id, question_id, answer_index, is_correct) VALUES (e, q, 0, true);
  BEGIN
    INSERT INTO quiz_results (user_id, question_id, answer_index, is_correct) VALUES (e, q, 1, false);
    RAISE EXCEPTION 'second answer should have failed';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  INSERT INTO question_disputes (question_id, reporter_user, reason) VALUES (q, e, 'typo');
  INSERT INTO groups (name, description, owner_user) VALUES ('G2', NULL, e) RETURNING id INTO g;
  INSERT INTO group_members (group_id, user_id) VALUES (g, e);
  INSERT INTO auth.users (email) VALUES ('f@example.com') RETURNING id INTO f;
  INSERT INTO users (auth_user_id, display_name) VALUES (f, 'F') ON CONFLICT (auth_user_id) DO NOTHING;
  SELECT score INTO n FROM get_global_leaderboard(50, 0) WHERE user_id = e;
  ASSERT n = 3, format('E''s new answer counts: score %s, expected 3', n);

  RAISE NOTICE 'all checks passed';
END $$;

-- The public key can read the columns the app selects with it (lib/actions/question-actions.ts).
SET ROLE anon;
SELECT id, category, prompt, options, created_by_user, status FROM questions LIMIT 1;
SELECT id, display_name, created_at FROM users LIMIT 1;
RESET ROLE;

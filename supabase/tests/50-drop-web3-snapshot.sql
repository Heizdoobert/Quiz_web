\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
-- Account-keyed data that 20-drop-web3-schema.sql must leave unchanged. Reads no wallet,
-- reward or escrow column, so the same file runs before and after the drop.
SELECT format('count %s %s', t, n) FROM (
  SELECT 'users' AS t, count(*) AS n FROM users
  UNION ALL SELECT 'questions', count(*) FROM questions
  UNION ALL SELECT 'quiz_results', count(*) FROM quiz_results
  UNION ALL SELECT 'groups', count(*) FROM groups
  UNION ALL SELECT 'group_members', count(*) FROM group_members
  UNION ALL SELECT 'question_lists', count(*) FROM question_lists
  UNION ALL SELECT 'question_list_confirmations', count(*) FROM question_list_confirmations
  UNION ALL SELECT 'list_entries', count(*) FROM list_entries
  UNION ALL SELECT 'question_disputes', count(*) FROM question_disputes
) c ORDER BY t;
SELECT format('user %s %s %s', id, display_name, auth_user_id) FROM users ORDER BY id;
SELECT format('question %s %s %s', prompt, created_by_user, status) FROM questions ORDER BY prompt, id;
SELECT format('answer %s %s %s', user_id, question_id, is_correct) FROM quiz_results ORDER BY 1;
SELECT format('group %s %s', name, owner_user) FROM groups ORDER BY 1;
SELECT format('member %s %s', group_id, user_id) FROM group_members ORDER BY 1;
SELECT format('list %s %s %s', title, owner_user, status) FROM question_lists ORDER BY 1;
SELECT format('confirmation %s %s', list_id, confirmer_user) FROM question_list_confirmations ORDER BY 1;
SELECT format('entry %s %s %s', list_id, user_id, status) FROM list_entries ORDER BY 1;
SELECT format('dispute %s %s %s', question_id, reporter_user, reason) FROM question_disputes ORDER BY 1;
SELECT format('stats %s %s', u.id, row_to_json(s)) FROM users u, LATERAL get_user_stats(u.id) s ORDER BY u.id;
SELECT format('global %s %s %s %s', l.user_id, l.display_name, l.score, l.accuracy) FROM get_global_leaderboard(50) l;
SELECT format('grouplb %s %s %s %s', g.name, l.user_id, l.score, l.accuracy)
FROM groups g, LATERAL get_group_leaderboard(g.id, 50) l ORDER BY 1;
-- Policies, indexes and column grants not tied to a dropped column or table: the drop
-- must not take any of them with it.
SELECT format('policy %s %s', tablename, policyname) FROM pg_policies WHERE tablename <> 'reward_claims' ORDER BY 1;
SELECT format('index %s', indexname) FROM pg_indexes
WHERE schemaname = 'public' AND tablename <> 'reward_claims'
  AND indexdef !~ '\m(wallet_address|owner_wallet|confirmer_wallet|reporter_wallet|created_by)\M'
ORDER BY 1;
SELECT format('grant %s %s.%s %s', grantee, table_name, column_name, privilege_type)
FROM information_schema.column_privileges
WHERE grantee IN ('anon', 'authenticated') AND table_schema = 'public' AND table_name <> 'reward_claims'
  AND column_name !~ '^(wallet_address|owner_wallet|confirmer_wallet|reporter_wallet|created_by|wallet_linked_at|treasury_swept_count|reward_pool_tokens|reward_amount|onchain_contest_id|funding_tx_hash|refund_tx_hash|claim_tx_hash)$'
ORDER BY 1;

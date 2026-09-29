\set ON_ERROR_STOP 1
CREATE FUNCTION pg_temp.pk_cols(tbl regclass) RETURNS text LANGUAGE sql AS $$
  SELECT string_agg(a.attname, ',' ORDER BY k.ord)
  FROM pg_constraint c, unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
  JOIN pg_attribute a ON a.attnum = k.attnum
  WHERE c.conrelid = tbl AND c.contype = 'p' AND a.attrelid = tbl;
$$;
DO $$
DECLARE
  a TEXT := '0x' || repeat('a', 40);
  c TEXT := '0x' || repeat('c', 40);
  d TEXT := '0x' || repeat('d', 40);
  a_id UUID; c_id UUID; d_id UUID; email_id UUID; list UUID; q UUID; q2 UUID; w TEXT; n INT;
BEGIN
  SELECT id INTO a_id FROM users WHERE wallet_address = a;
  SELECT id INTO list FROM question_lists LIMIT 1;

  -- Shape
  ASSERT (SELECT pg_temp.pk_cols('users') = 'id'), 'users pk is id';
  ASSERT (SELECT pg_temp.pk_cols('group_members') = 'group_id,user_id'), 'group_members pk';
  ASSERT (SELECT pg_temp.pk_cols('list_entries') = 'list_id,user_id'), 'list_entries pk';
  ASSERT NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow public insert for users'), 'insert policy dropped';

  -- C had no users row; it now has exactly one account, matched from upper and lower case rows.
  SELECT count(*) INTO n FROM users WHERE lower(wallet_address) = c;
  ASSERT n = 1, 'one account for C';
  SELECT id INTO c_id FROM users WHERE wallet_address = c;
  ASSERT (SELECT user_id FROM reward_claims WHERE nonce = 'n2') = c_id, 'upper-case C claim backfilled';
  ASSERT (SELECT user_id FROM list_entries WHERE wallet_address = c) = c_id, 'C entry backfilled';
  ASSERT (SELECT owner_user FROM groups LIMIT 1) = a_id, 'group owner backfilled';
  ASSERT (SELECT created_by_user FROM questions WHERE prompt = 'Q by A') = a_id, 'question creator backfilled';
  ASSERT NOT EXISTS (SELECT 1 FROM questions WHERE created_by IS NULL AND created_by_user IS NOT NULL), 'seed questions stay creatorless';
  ASSERT (SELECT wallet_linked_at IS NOT NULL FROM users WHERE id = a_id), 'wallet_linked_at set';

  -- Stats by account (stats-functions.sql) match the old wallet-keyed function for every wallet.
  ASSERT (SELECT total_answered FROM get_user_stats(a_id)) = 2, 'A stats by account';
  ASSERT NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.wallet_address IS NOT NULL
      AND (SELECT to_jsonb(s) FROM get_user_stats(u.id) s)
          IS DISTINCT FROM (SELECT to_jsonb(s) FROM get_user_stats(u.wallet_address) s)
  ), 'account stats match wallet stats';

  -- Old code: insert with only a wallet (unknown wallet D) gets an account.
  SELECT id INTO q FROM questions WHERE created_by IS NULL ORDER BY created_at, id OFFSET 5 LIMIT 1;
  INSERT INTO quiz_results (wallet_address, question_id, answer_index, is_correct) VALUES (d, q, 0, true);
  SELECT id INTO d_id FROM users WHERE wallet_address = d;
  ASSERT d_id IS NOT NULL, 'account created for D';
  ASSERT (SELECT user_id FROM quiz_results WHERE wallet_address = d) = d_id, 'D answer has account';

  -- New code: insert with only an account id gets the wallet filled in.
  SELECT id INTO q2 FROM questions WHERE created_by IS NULL ORDER BY created_at, id OFFSET 6 LIMIT 1;
  INSERT INTO quiz_results (user_id, question_id, answer_index, is_correct) VALUES (a_id, q2, 0, true);
  ASSERT (SELECT wallet_address FROM quiz_results WHERE user_id = a_id AND question_id = q2) = a, 'wallet filled from account';

  -- Email account (no wallet) can answer; both columns behave.
  INSERT INTO auth.users (email) VALUES ('p@example.com') RETURNING id INTO email_id;
  INSERT INTO users (auth_user_id, display_name) VALUES (email_id, 'Player-x') RETURNING id INTO email_id;
  INSERT INTO quiz_results (user_id, question_id, answer_index, is_correct) VALUES (email_id, q, 1, false);
  ASSERT (SELECT wallet_address IS NULL FROM quiz_results WHERE user_id = email_id), 'email answer has no wallet';
  ASSERT (SELECT total_answered FROM get_user_stats(email_id)) = 1, 'email answer counts in stats';

  -- Leaderboards are keyed by account id, with wallet_address/display_name joined in.
  ASSERT (SELECT wallet_address FROM get_global_leaderboard(50) WHERE user_id = a_id) = a,
    'global leaderboard resolves A''s wallet from the account id';
  ASSERT (SELECT display_name FROM get_global_leaderboard(50) WHERE user_id = email_id) = 'Player-x'
    AND (SELECT wallet_address FROM get_global_leaderboard(50) WHERE user_id = email_id) IS NULL,
    'email account appears on the global leaderboard with no wallet';
  ASSERT (SELECT count(*) FROM groups g, LATERAL get_group_leaderboard(g.id, 50) l WHERE l.user_id = a_id) = 1,
    'A appears on the group leaderboard keyed by account id';
  BEGIN
    INSERT INTO quiz_results (user_id, question_id, answer_index, is_correct) VALUES (email_id, q, 0, true);
    RAISE EXCEPTION 'second answer should have failed';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- lib/users.ts upsert (ON CONFLICT wallet_address DO NOTHING) still works.
  INSERT INTO users (wallet_address, display_name) VALUES (a, 'again') ON CONFLICT (wallet_address) DO NOTHING;
  -- The list_entries reviewer upsert: PostgREST resolves on the primary key, which the trigger fills first.
  INSERT INTO list_entries (list_id, wallet_address, status) VALUES (list, a, 'reviewer')
    ON CONFLICT (list_id, user_id) DO NOTHING;
  SELECT count(*) INTO n FROM list_entries WHERE list_id = list AND user_id = a_id;
  ASSERT n = 1, 'reviewer upsert did not duplicate';
  -- A case variant of an existing wallet can never become a second account.
  BEGIN
    INSERT INTO users (wallet_address) VALUES (upper(a));
    RAISE EXCEPTION 'case variant should have failed';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  RAISE NOTICE 'all checks passed';
END $$;

-- The public key reads display fields, never auth_user_id.
SET ROLE anon;
SELECT id, wallet_address, display_name, created_at FROM users LIMIT 1;
DO $$ BEGIN
  PERFORM auth_user_id FROM users LIMIT 1;
  RAISE EXCEPTION 'anon could read auth_user_id';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
RESET ROLE;

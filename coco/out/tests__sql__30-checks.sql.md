# tests/sql/30-checks.sql
lines:102 exports:
---
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

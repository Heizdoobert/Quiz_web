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

-- Move the primary key from wallet_address to id. The foreign keys that point at
-- users(wallet_address) depend on the old key, so they go first; the new account
-- columns below replace them.
DO $$
DECLARE fk record;
BEGIN
  IF pg_temp.pk_has_column('users', 'wallet_address') THEN
    FOR fk IN SELECT conrelid::regclass AS tbl, conname FROM pg_constraint
              WHERE contype = 'f' AND confrelid = 'users'::regclass LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', fk.tbl, fk.conname);
    END LOOP;
    PERFORM pg_temp.drop_primary_key('users');
    ALTER TABLE users ADD PRIMARY KEY (id);
  END IF;
END $$;

ALTER TABLE users ALTER COLUMN wallet_address DROP NOT NULL;
-- Plain unique index: ON CONFLICT (wallet_address) in lib/users.ts infers it.
CREATE UNIQUE INDEX IF NOT EXISTS users_wallet_address_key ON users (wallet_address);
CREATE UNIQUE INDEX IF NOT EXISTS users_wallet_address_lower_key ON users (lower(wallet_address));

UPDATE users SET wallet_linked_at = coalesce(created_at, now())
WHERE wallet_address IS NOT NULL AND wallet_linked_at IS NULL;

-- Four tables never had a foreign key to users, so they can name wallets that have
-- no users row. Give every referenced wallet an account before backfilling.
INSERT INTO users (wallet_address, display_name, wallet_linked_at)
SELECT w, left(w, 6) || '...' || right(w, 4), now()
FROM (
  SELECT lower(created_by) AS w FROM questions
  UNION SELECT lower(wallet_address) FROM quiz_results
  UNION SELECT lower(owner_wallet) FROM groups
  UNION SELECT lower(wallet_address) FROM group_members
  UNION SELECT lower(owner_wallet) FROM question_lists
  UNION SELECT lower(confirmer_wallet) FROM question_list_confirmations
  UNION SELECT lower(wallet_address) FROM list_entries
  UNION SELECT lower(wallet_address) FROM reward_claims
  UNION SELECT lower(reporter_wallet) FROM question_disputes
) refs
WHERE w IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users u WHERE lower(u.wallet_address) = refs.w);

-- Account columns. Money records (list_entries, reward_claims) block deleting their account.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_by_user UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS owner_user UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE question_lists ADD COLUMN IF NOT EXISTS owner_user UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE question_list_confirmations ADD COLUMN IF NOT EXISTS confirmer_user UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE list_entries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE reward_claims ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE question_disputes ADD COLUMN IF NOT EXISTS reporter_user UUID REFERENCES users(id) ON DELETE CASCADE;

UPDATE questions t SET created_by_user = u.id FROM users u
WHERE t.created_by_user IS NULL AND lower(t.created_by) = lower(u.wallet_address);
UPDATE quiz_results t SET user_id = u.id FROM users u
WHERE t.user_id IS NULL AND lower(t.wallet_address) = lower(u.wallet_address);
UPDATE groups t SET owner_user = u.id FROM users u
WHERE t.owner_user IS NULL AND lower(t.owner_wallet) = lower(u.wallet_address);
UPDATE group_members t SET user_id = u.id FROM users u
WHERE t.user_id IS NULL AND lower(t.wallet_address) = lower(u.wallet_address);
UPDATE question_lists t SET owner_user = u.id FROM users u
WHERE t.owner_user IS NULL AND lower(t.owner_wallet) = lower(u.wallet_address);
UPDATE question_list_confirmations t SET confirmer_user = u.id FROM users u
WHERE t.confirmer_user IS NULL AND lower(t.confirmer_wallet) = lower(u.wallet_address);
UPDATE list_entries t SET user_id = u.id FROM users u
WHERE t.user_id IS NULL AND lower(t.wallet_address) = lower(u.wallet_address);
UPDATE reward_claims t SET user_id = u.id FROM users u
WHERE t.user_id IS NULL AND lower(t.wallet_address) = lower(u.wallet_address);
UPDATE question_disputes t SET reporter_user = u.id FROM users u
WHERE t.reporter_user IS NULL AND lower(t.reporter_wallet) = lower(u.wallet_address);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM questions WHERE created_by IS NOT NULL AND created_by_user IS NULL)
     OR EXISTS (SELECT 1 FROM quiz_results WHERE user_id IS NULL)
     OR EXISTS (SELECT 1 FROM groups WHERE owner_user IS NULL)
     OR EXISTS (SELECT 1 FROM group_members WHERE user_id IS NULL)
     OR EXISTS (SELECT 1 FROM question_lists WHERE owner_user IS NULL)
     OR EXISTS (SELECT 1 FROM question_list_confirmations WHERE confirmer_user IS NULL)
     OR EXISTS (SELECT 1 FROM list_entries WHERE user_id IS NULL)
     OR EXISTS (SELECT 1 FROM reward_claims WHERE user_id IS NULL)
     OR EXISTS (SELECT 1 FROM question_disputes WHERE reporter_user IS NULL) THEN
    RAISE EXCEPTION 'accounts.sql: some rows could not be matched to an account';
  END IF;
END $$;

ALTER TABLE quiz_results ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE groups ALTER COLUMN owner_user SET NOT NULL;
ALTER TABLE group_members ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE question_lists ALTER COLUMN owner_user SET NOT NULL;
ALTER TABLE question_list_confirmations ALTER COLUMN confirmer_user SET NOT NULL;
ALTER TABLE list_entries ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE reward_claims ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE question_disputes ALTER COLUMN reporter_user SET NOT NULL;

DO $$
BEGIN
  IF pg_temp.pk_has_column('group_members', 'wallet_address') THEN
    PERFORM pg_temp.drop_primary_key('group_members');
    ALTER TABLE group_members ADD PRIMARY KEY (group_id, user_id);
  END IF;
  IF pg_temp.pk_has_column('list_entries', 'wallet_address') THEN
    PERFORM pg_temp.drop_primary_key('list_entries');
    ALTER TABLE list_entries ADD PRIMARY KEY (list_id, user_id);
  END IF;
END $$;

-- Email accounts have no wallet, so the old columns must accept NULL.
ALTER TABLE quiz_results ALTER COLUMN wallet_address DROP NOT NULL;
ALTER TABLE groups ALTER COLUMN owner_wallet DROP NOT NULL;
ALTER TABLE group_members ALTER COLUMN wallet_address DROP NOT NULL;
ALTER TABLE question_lists ALTER COLUMN owner_wallet DROP NOT NULL;
ALTER TABLE question_list_confirmations ALTER COLUMN confirmer_wallet DROP NOT NULL;
ALTER TABLE list_entries ALTER COLUMN wallet_address DROP NOT NULL;
ALTER TABLE reward_claims ALTER COLUMN wallet_address DROP NOT NULL;
ALTER TABLE question_disputes ALTER COLUMN reporter_wallet DROP NOT NULL;

-- The same uniqueness rules, per account.
CREATE UNIQUE INDEX IF NOT EXISTS quiz_results_one_answer_per_account ON quiz_results (user_id, question_id);
CREATE UNIQUE INDEX IF NOT EXISTS question_list_confirmations_one_per_account
  ON question_list_confirmations (list_id, confirmer_user);
CREATE UNIQUE INDEX IF NOT EXISTS question_disputes_one_per_account ON question_disputes (question_id, reporter_user);
CREATE UNIQUE INDEX IF NOT EXISTS reward_claims_account_nonce ON reward_claims (user_id, nonce);
CREATE UNIQUE INDEX IF NOT EXISTS reward_claims_one_open_token_per_account
  ON reward_claims (user_id) WHERE claim_type = 'token' AND status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS reward_claims_one_open_contest_per_account
  ON reward_claims (user_id, list_id) WHERE claim_type = 'contest' AND status = 'pending';
CREATE INDEX IF NOT EXISTS idx_questions_created_by_user ON questions (created_by_user);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_question_lists_owner_user ON question_lists (owner_user);

-- Bridge while code moves from wallets to accounts: a row inserted with only a
-- wallet gets its account (created if needed), and a row inserted with only an
-- account gets that account's wallet. Old and new code can then write side by side.
CREATE OR REPLACE FUNCTION bridge_wallet_account() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  wallet_col TEXT := TG_ARGV[0];
  account_col TEXT := TG_ARGV[1];
  v_wallet TEXT := lower(to_jsonb(NEW) ->> wallet_col);
  v_account UUID := (to_jsonb(NEW) ->> account_col)::uuid;
BEGIN
  IF v_account IS NULL AND v_wallet IS NOT NULL THEN
    SELECT id INTO v_account FROM users WHERE lower(wallet_address) = v_wallet;
    IF v_account IS NULL THEN
      INSERT INTO users (wallet_address, display_name, wallet_linked_at)
      VALUES (v_wallet, left(v_wallet, 6) || '...' || right(v_wallet, 4), now())
      RETURNING id INTO v_account;
    END IF;
    NEW := jsonb_populate_record(NEW, jsonb_build_object(account_col, v_account));
  ELSIF v_wallet IS NULL AND v_account IS NOT NULL THEN
    SELECT wallet_address INTO v_wallet FROM users WHERE id = v_account;
    IF v_wallet IS NOT NULL THEN
      NEW := jsonb_populate_record(NEW, jsonb_build_object(wallet_col, v_wallet));
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE TRIGGER questions_bridge_account BEFORE INSERT ON questions
  FOR EACH ROW EXECUTE FUNCTION bridge_wallet_account('created_by', 'created_by_user');
CREATE OR REPLACE TRIGGER quiz_results_bridge_account BEFORE INSERT ON quiz_results
  FOR EACH ROW EXECUTE FUNCTION bridge_wallet_account('wallet_address', 'user_id');
CREATE OR REPLACE TRIGGER groups_bridge_account BEFORE INSERT ON groups
  FOR EACH ROW EXECUTE FUNCTION bridge_wallet_account('owner_wallet', 'owner_user');
CREATE OR REPLACE TRIGGER group_members_bridge_account BEFORE INSERT ON group_members
  FOR EACH ROW EXECUTE FUNCTION bridge_wallet_account('wallet_address', 'user_id');
CREATE OR REPLACE TRIGGER question_lists_bridge_account BEFORE INSERT ON question_lists
  FOR EACH ROW EXECUTE FUNCTION bridge_wallet_account('owner_wallet', 'owner_user');
CREATE OR REPLACE TRIGGER question_list_confirmations_bridge_account BEFORE INSERT ON question_list_confirmations
  FOR EACH ROW EXECUTE FUNCTION bridge_wallet_account('confirmer_wallet', 'confirmer_user');
CREATE OR REPLACE TRIGGER list_entries_bridge_account BEFORE INSERT ON list_entries
  FOR EACH ROW EXECUTE FUNCTION bridge_wallet_account('wallet_address', 'user_id');
CREATE OR REPLACE TRIGGER reward_claims_bridge_account BEFORE INSERT ON reward_claims
  FOR EACH ROW EXECUTE FUNCTION bridge_wallet_account('wallet_address', 'user_id');
CREATE OR REPLACE TRIGGER question_disputes_bridge_account BEFORE INSERT ON question_disputes
  FOR EACH ROW EXECUTE FUNCTION bridge_wallet_account('reporter_wallet', 'reporter_user');

-- Accounts are created by the server with the secret key only.
DROP POLICY IF EXISTS "Allow public insert for users" ON users;
-- The public key reads display fields only; auth_user_id links an account to its email.
REVOKE SELECT ON users FROM anon, authenticated;
GRANT SELECT (id, wallet_address, display_name, created_at) ON users TO anon, authenticated;
GRANT SELECT (created_by_user) ON questions TO anon, authenticated;

COMMIT;

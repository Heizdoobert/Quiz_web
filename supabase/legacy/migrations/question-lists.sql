-- Question lists (user-authored, peer-reviewed contests), locked down like the rest:
-- the public key may only read; every write goes through the server as the signed-in
-- wallet (lib/actions/question-list-actions.ts). Run after lock-down-public-writes.sql.
-- Idempotent: safe to re-run in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS question_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'live', 'rejected')),
  reward_pool_tokens NUMERIC NOT NULL DEFAULT 0, -- wei (18 decimals)
  submitted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- List questions stay 'pending' so they never enter the global pool.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES question_lists(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_questions_list_id ON questions(list_id);

CREATE TABLE IF NOT EXISTS question_list_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES question_lists(id) ON DELETE CASCADE,
  confirmer_wallet TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, confirmer_wallet)
);
CREATE INDEX IF NOT EXISTS idx_list_confirmations_list ON question_list_confirmations(list_id);

-- One row per wallet per list. 'reviewer' marks a wallet that has seen the answers
-- while reviewing; it can never start an attempt at that list.
CREATE TABLE IF NOT EXISTS list_entries (
  list_id UUID NOT NULL REFERENCES question_lists(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  correct_count INT NOT NULL DEFAULT 0,
  reward_amount NUMERIC NOT NULL DEFAULT 0, -- wei (18 decimals)
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (list_id, wallet_address)
);
ALTER TABLE list_entries DROP CONSTRAINT IF EXISTS list_entries_status_check;
ALTER TABLE list_entries ADD CONSTRAINT list_entries_status_check
  CHECK (status IN ('in_progress', 'completed', 'claimed', 'reviewer'));

ALTER TABLE question_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_list_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for question_lists" ON question_lists;
CREATE POLICY "Allow public read for question_lists" ON question_lists FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read for question_list_confirmations" ON question_list_confirmations;
CREATE POLICY "Allow public read for question_list_confirmations" ON question_list_confirmations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read for list_entries" ON list_entries;
CREATE POLICY "Allow public read for list_entries" ON list_entries FOR SELECT USING (true);

-- In case an earlier draft of this schema was applied: no public writes.
DROP POLICY IF EXISTS "Allow public insert for question_lists" ON question_lists;
DROP POLICY IF EXISTS "Allow public update for question_lists" ON question_lists;
DROP POLICY IF EXISTS "Allow public delete for question_lists" ON question_lists;
DROP POLICY IF EXISTS "Allow public insert for question_list_confirmations" ON question_list_confirmations;
DROP POLICY IF EXISTS "Allow public insert for list_entries" ON list_entries;
DROP POLICY IF EXISTS "Allow public update for list_entries" ON list_entries;

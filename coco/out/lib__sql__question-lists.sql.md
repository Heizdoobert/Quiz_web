# lib/sql/question-lists.sql
lines:64 exports:
---
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

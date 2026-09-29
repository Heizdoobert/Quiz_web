-- Users table
CREATE TABLE IF NOT EXISTS users (
  wallet_address TEXT PRIMARY KEY,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'General',
  prompt TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INT NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  explanation TEXT,
  created_by TEXT REFERENCES users(wallet_address) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'pending', 'quarantined', 'rejected')),
  dispute_count INT NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);

-- Quiz results log table
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_index INT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_wallet ON quiz_results(wallet_address);
CREATE INDEX IF NOT EXISTS idx_quiz_results_question ON quiz_results(question_id);
-- Only the first answer to a question counts.
CREATE UNIQUE INDEX IF NOT EXISTS quiz_results_one_answer_per_question ON quiz_results (wallet_address, question_id);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  owner_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_group_members_wallet ON group_members(wallet_address);

-- Enable Row Level Security (RLS) on all tables to prevent direct REST client bypass
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read for users" ON users FOR SELECT USING (true);

-- Groups, questions and disputes are written by the server (secret key) for the signed-in wallet.
CREATE POLICY "Allow public read for groups" ON groups FOR SELECT USING (true);

CREATE POLICY "Allow public read for group_members" ON group_members FOR SELECT USING (true);

-- No public read or insert: answers are recorded by the server, and stats are read
-- through the SECURITY DEFINER functions in lib/sql/stats-functions.sql.

CREATE POLICY "Allow public read for questions" ON questions FOR SELECT USING (true);
-- Answers and explanations are only readable with the secret key.
REVOKE SELECT ON questions FROM anon, authenticated;
GRANT SELECT (id, category, prompt, options, created_by, status, dispute_count, verified_at, created_at)
  ON questions TO anon, authenticated;

-- Secure Client View (omits correct_index and explanation)
CREATE OR REPLACE VIEW client_questions AS
  SELECT id, category, prompt, options, created_at
  FROM questions;

-- Reward claims tracking table
CREATE TABLE IF NOT EXISTS reward_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    claim_type TEXT NOT NULL CHECK (claim_type IN ('token', 'badge', 'contest')),
    list_id UUID REFERENCES question_lists(id) ON DELETE CASCADE,
    amount NUMERIC(78,0), -- wei; any uint256 fits
    badge_type INTEGER,
    nonce TEXT NOT NULL,
    deadline BIGINT, -- unix seconds; past it an unused voucher can't be minted
    signature TEXT,  -- kept so the one open voucher can be handed out again
    tx_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wallet_address, nonce)
);

CREATE INDEX IF NOT EXISTS idx_reward_claims_wallet ON reward_claims(wallet_address);
ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read for reward_claims" ON reward_claims FOR SELECT USING (true);
-- Only the server (secret key) writes claims. One open token voucher per wallet.
CREATE UNIQUE INDEX IF NOT EXISTS reward_claims_one_open_token
  ON reward_claims (wallet_address) WHERE claim_type = 'token' AND status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS reward_claims_one_open_contest
  ON reward_claims (wallet_address, list_id) WHERE claim_type = 'contest' AND status = 'pending';

-- Question Disputes Table (Community Challenge & Transparency Engine)
CREATE TABLE IF NOT EXISTS question_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  reporter_wallet TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, reporter_wallet)
);

CREATE INDEX IF NOT EXISTS idx_question_disputes_qid ON question_disputes(question_id);
ALTER TABLE question_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read for question_disputes" ON question_disputes FOR SELECT USING (true);

-- ============================================================================
-- Question Lists (user-authored, peer-reviewed crypto contests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS question_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'live', 'rejected')),
  reward_pool_tokens NUMERIC NOT NULL DEFAULT 0, -- wei-scale (18 decimals), NUMERIC to avoid BIGINT overflow at token scale
  max_participants INT NOT NULL DEFAULT 10,
  submitted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE questions ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES question_lists(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_questions_list_id ON questions(list_id);
-- The public-question rule (status = 'verified' AND list_id IS NULL) filters on list_id, and
-- Postgres column privileges gate WHERE/filter usage the same as SELECT output.
GRANT SELECT (list_id) ON questions TO anon, authenticated;

-- Peer confirmations required before a submitted list can go live
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
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'claimed', 'reviewer')),
  correct_count INT NOT NULL DEFAULT 0,
  reward_amount NUMERIC NOT NULL DEFAULT 0, -- wei-scale (18 decimals)
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (list_id, wallet_address)
);

ALTER TABLE question_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_list_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_entries ENABLE ROW LEVEL SECURITY;

-- Public read only; the server writes as the signed-in wallet (lib/actions/question-list-actions.ts).
CREATE POLICY "Allow public read for question_lists" ON question_lists FOR SELECT USING (true);
CREATE POLICY "Allow public read for question_list_confirmations" ON question_list_confirmations FOR SELECT USING (true);
CREATE POLICY "Allow public read for list_entries" ON list_entries FOR SELECT USING (true);


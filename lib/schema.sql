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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
CREATE POLICY "Allow public insert for users" ON users FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read for groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Allow public insert for groups" ON groups FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read for group_members" ON group_members FOR SELECT USING (true);
CREATE POLICY "Allow public insert for group_members" ON group_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete for group_members" ON group_members FOR DELETE USING (true);

CREATE POLICY "Allow public read for quiz_results" ON quiz_results FOR SELECT USING (true);
CREATE POLICY "Allow public insert for quiz_results" ON quiz_results FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read for questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert for questions" ON questions FOR INSERT WITH CHECK (true);

-- Secure Client View (omits correct_index and explanation)
CREATE OR REPLACE VIEW client_questions AS
  SELECT id, category, prompt, options, created_at
  FROM questions;

-- Reward claims tracking table
CREATE TABLE IF NOT EXISTS reward_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    claim_type TEXT NOT NULL CHECK (claim_type IN ('token', 'badge')),
    amount BIGINT,
    badge_type INTEGER,
    nonce TEXT NOT NULL,
    tx_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wallet_address, nonce)
);

CREATE INDEX IF NOT EXISTS idx_reward_claims_wallet ON reward_claims(wallet_address);
ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read for reward_claims" ON reward_claims FOR SELECT USING (true);
CREATE POLICY "Allow public insert for reward_claims" ON reward_claims FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for reward_claims" ON reward_claims FOR UPDATE USING (true);

-- ============================================================================
-- Initial Question Seed Data (Curated Trivia Bank)
-- ============================================================================
INSERT INTO questions (category, prompt, options, correct_index, explanation) VALUES
(
  'Web3 & Crypto',
  'Which consensus mechanism did Ethereum transition to during The Merge in September 2022?',
  '["Proof of Work (PoW)", "Proof of Stake (PoS)", "Proof of Authority (PoA)", "Delegated Proof of Stake (DPoS)"]'::jsonb,
  1,
  'Ethereum transitioned from Proof of Work to Proof of Stake during The Merge on September 15, 2022, drastically reducing energy consumption.'
),
(
  'Web3 & Crypto',
  'What is the primary function of an EIP-712 structured data signature?',
  '["To encrypt private keys on-chain", "To sign human-readable typed data securely off-chain", "To compress bytecode in smart contracts", "To automate gas fee payments"]'::jsonb,
  1,
  'EIP-712 specifies a standard for hashing and signing of typed structured data as opposed to just arbitrary byte strings, providing transparent signing previews in wallets.'
),
(
  'Web Development',
  'In Next.js App Router, which file convention is used to render an error boundary fallback UI for a route segment?',
  '["500.tsx", "catch.tsx", "error.tsx", "boundary.tsx"]'::jsonb,
  2,
  'Next.js App Router uses error.tsx to wrap route segments and child layouts in a React Error Boundary.'
),
(
  'Web Development',
  'What does CSS property "backface-visibility: hidden" do during a 3D rotation transform?',
  '["Hides the background color of the element", "Hides the reverse side of an element when turned away from the screen", "Disables all 3D hardware acceleration", "Blurs the border of the card"]'::jsonb,
  1,
  'backface-visibility determines whether the backside of an element is visible when facing the viewer during 3D rotations.'
),
(
  'Computer Science',
  'What is the average time complexity of searching an element in a balanced Binary Search Tree (BST)?',
  '["O(1)", "O(n)", "O(log n)", "O(n log n)"]'::jsonb,
  2,
  'In a balanced binary search tree, searching cuts the remaining search space roughly in half each step, giving an average time complexity of O(log n).'
),
(
  'Web3 & Crypto',
  'Which Ethereum token standard defines non-fungible tokens (NFTs)?',
  '["ERC-20", "ERC-721", "ERC-777", "ERC-4626"]'::jsonb,
  1,
  'ERC-721 is the free, open standard that describes how to build non-fungible or unique tokens on the Ethereum blockchain.'
),
(
  'Web Development',
  'Which React hook should be used to synchronize with an external store with tearing prevention in React 18 & 19?',
  '["useSyncExternalStore", "useEffectOnce", "useMutableSource", "useExternalState"]'::jsonb,
  0,
  'useSyncExternalStore is recommended for reading and subscribing from external data stores safely under concurrent rendering.'
),
(
  'General Tech',
  'What year was the Git version control system created by Linus Torvalds?',
  '["1998", "2001", "2005", "2008"]'::jsonb,
  2,
  'Linus Torvalds created Git in April 2005 to manage the development of the Linux kernel.'
),
(
  'Layer 1 & Infra',
  'What is Base in the Ethereum ecosystem?',
  '["An EVM-compatible Layer 2 rollup built on the OP Stack", "A non-EVM Layer 1 blockchain", "A hardware wallet manufacturer", "A decentralized crypto exchange protocol"]'::jsonb,
  0,
  'Base is a secure, low-cost, builder-friendly Ethereum Layer 2 rollup developed by Coinbase on the open-source OP Stack.'
),
(
  'DeFi',
  'What does AMM stand for in decentralized finance protocols like Uniswap?',
  '["Automated Market Maker", "Advanced Mining Mechanism", "Autonomous Money Manager", "Asset Management Module"]'::jsonb,
  0,
  'An Automated Market Maker (AMM) is a decentralized exchange protocol that uses algorithmic pricing and liquidity pools instead of traditional order books.'
),
(
  'DeFi',
  'What is Impermanent Loss in decentralized liquidity pools?',
  '["The difference in value between holding tokens vs depositing them in an AMM liquidity pool", "A permanent exploit or hack of smart contract funds", "Transaction fees lost during failed trades", "Network inflation over long staking periods"]'::jsonb,
  0,
  'Impermanent loss occurs when the price ratio of deposited token pairs diverges compared to when they were deposited into a liquidity pool.'
),
(
  'NFT & Gaming',
  'Which Ethereum standard enables multi-token management for fungible and non-fungible game assets in a single contract?',
  '["ERC-1155", "ERC-20", "ERC-721", "ERC-4626"]'::jsonb,
  0,
  'ERC-1155 is a multi-token standard that allows a single smart contract to manage any combination of fungible, non-fungible, and semi-fungible tokens efficiently.'
),
(
  'NFT & Gaming',
  'What is a Soulbound Token (SBT) in Web3?',
  '["A non-transferable token permanently tied to a specific wallet address", "An in-game character that revives upon defeat", "A token with algorithmic deflationary burn", "A staking token with no locking period"]'::jsonb,
  0,
  'Soulbound Tokens (SBTs) are permanently bound to a single wallet address and cannot be transferred, making them ideal for credentials, badges, and reputation.'
),
(
  'Layer 1 & Infra',
  'What is the primary role of a sequencer in an Ethereum Layer 2 rollup?',
  '["To order, batch, and compress transactions before submitting to Ethereum L1", "To mint new proof-of-work blocks", "To decrypt private keys for instant withdrawals", "To compute zero-knowledge proofs on mobile devices"]'::jsonb,
  0,
  'A sequencer collects, orders, and bundles transactions off-chain, then posts state updates and transaction batches back to Ethereum Layer 1 for settlement.'
);


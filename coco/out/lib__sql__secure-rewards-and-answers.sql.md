# lib/sql/secure-rewards-and-answers.sql
lines:32 exports:
---
-- Closes unlimited token minting (C1) and score farming (C3).
-- Run after widen-reward-claims-amount.sql, in the Supabase SQL Editor.
-- Idempotent: safe to re-run.

-- C1: vouchers keep their deadline and signature so the one open voucher can be
-- handed out again, and a wallet can have only one open token voucher at a time.
ALTER TABLE reward_claims ADD COLUMN IF NOT EXISTS deadline BIGINT;
ALTER TABLE reward_claims ADD COLUMN IF NOT EXISTS signature TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS reward_claims_one_open_token
  ON reward_claims (wallet_address)
  WHERE claim_type = 'token' AND status = 'pending';

-- C1: only the server (secret key) writes claims; public writes let anyone
-- mark claims expired and re-claim, or zero out other wallets' balances.
DROP POLICY IF EXISTS "Allow public insert for reward_claims" ON reward_claims;
DROP POLICY IF EXISTS "Allow public update for reward_claims" ON reward_claims;

-- C3: only the first answer to a question counts.
-- WARNING: this deletes repeat answers (keeping each wallet's first), which lowers
-- the scores of wallets that answered the same question more than once.
DELETE FROM quiz_results a
USING quiz_results b
WHERE a.wallet_address = b.wallet_address
  AND a.question_id = b.question_id
  AND (COALESCE(a.answered_at, 'epoch'), a.id) > (COALESCE(b.answered_at, 'epoch'), b.id);
CREATE UNIQUE INDEX IF NOT EXISTS quiz_results_one_answer_per_question
  ON quiz_results (wallet_address, question_id);

-- C3: answers and explanations are only readable with the secret key.
REVOKE SELECT ON questions FROM anon, authenticated;
GRANT SELECT (id, category, prompt, options, created_by, status, dispute_count, verified_at, created_at)
  ON questions TO anon, authenticated;

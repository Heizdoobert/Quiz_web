# lib/sql/contest-escrow.sql
lines:14 exports:
---
-- Migration for ContestEscrow support in reward_claims.
-- Run in Supabase SQL editor. Idempotent.

ALTER TABLE reward_claims ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES question_lists(id) ON DELETE CASCADE;

ALTER TABLE reward_claims DROP CONSTRAINT IF EXISTS reward_claims_claim_type_check;
ALTER TABLE reward_claims ADD CONSTRAINT reward_claims_claim_type_check
  CHECK (claim_type IN ('token', 'badge', 'contest'));

CREATE UNIQUE INDEX IF NOT EXISTS reward_claims_one_open_contest
  ON reward_claims (wallet_address, list_id)
  WHERE claim_type = 'contest' AND status = 'pending';

ALTER TABLE question_lists ADD COLUMN IF NOT EXISTS max_participants INT NOT NULL DEFAULT 10;

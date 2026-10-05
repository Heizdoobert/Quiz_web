ALTER TABLE question_lists ADD COLUMN IF NOT EXISTS onchain_contest_id TEXT;
ALTER TABLE question_lists ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE question_lists ADD COLUMN IF NOT EXISTS funding_tx_hash TEXT;
ALTER TABLE question_lists ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE question_lists ADD COLUMN IF NOT EXISTS refund_tx_hash TEXT;

ALTER TABLE question_lists DROP CONSTRAINT IF EXISTS question_lists_status_check;
ALTER TABLE question_lists ADD CONSTRAINT question_lists_status_check 
  CHECK (status IN ('draft', 'submitted', 'approved', 'live', 'completed', 'expired', 'refunded', 'rejected'));

ALTER TABLE list_entries ADD COLUMN IF NOT EXISTS claim_tx_hash TEXT;

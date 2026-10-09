BEGIN;

-- 1. Drop the bridge triggers and function
DROP TRIGGER IF EXISTS questions_bridge_account ON questions;
DROP TRIGGER IF EXISTS quiz_results_bridge_account ON quiz_results;
DROP TRIGGER IF EXISTS groups_bridge_account ON groups;
DROP TRIGGER IF EXISTS group_members_bridge_account ON group_members;
DROP TRIGGER IF EXISTS question_lists_bridge_account ON question_lists;
DROP TRIGGER IF EXISTS question_list_confirmations_bridge_account ON question_list_confirmations;
DROP TRIGGER IF EXISTS list_entries_bridge_account ON list_entries;
DROP TRIGGER IF EXISTS reward_claims_bridge_account ON reward_claims;
DROP TRIGGER IF EXISTS question_disputes_bridge_account ON question_disputes;

DROP FUNCTION IF EXISTS bridge_wallet_account();

-- 2. Drop the crypto-related functions
DROP FUNCTION IF EXISTS sweep_to_treasury();
DROP FUNCTION IF EXISTS get_treasury_entitled_count();

-- 3. Drop crypto-related tables
DROP TABLE IF EXISTS reward_claims;

-- 4. Drop wallet-related columns from users
ALTER TABLE users DROP COLUMN IF EXISTS wallet_address CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS treasury_swept_count CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS wallet_linked_at CASCADE;

-- 5. Drop redundant legacy wallet columns from other tables
ALTER TABLE questions DROP COLUMN IF EXISTS created_by CASCADE;
ALTER TABLE quiz_results DROP COLUMN IF EXISTS wallet_address CASCADE;
ALTER TABLE groups DROP COLUMN IF EXISTS owner_wallet CASCADE;
ALTER TABLE group_members DROP COLUMN IF EXISTS wallet_address CASCADE;
ALTER TABLE question_lists DROP COLUMN IF EXISTS owner_wallet CASCADE;
ALTER TABLE question_list_confirmations DROP COLUMN IF EXISTS confirmer_wallet CASCADE;
ALTER TABLE list_entries DROP COLUMN IF EXISTS wallet_address CASCADE;
ALTER TABLE list_entries DROP COLUMN IF EXISTS claim_tx_hash CASCADE;
ALTER TABLE question_disputes DROP COLUMN IF EXISTS reporter_wallet CASCADE;


-- 6. Drop reward columns from question_lists
ALTER TABLE question_lists DROP COLUMN IF EXISTS reward_pool_tokens CASCADE;
ALTER TABLE question_lists DROP COLUMN IF EXISTS reward_amount CASCADE;

-- 7. Drop reward columns from list_entries
ALTER TABLE list_entries DROP COLUMN IF EXISTS reward_amount CASCADE;

ALTER TABLE question_lists DROP COLUMN IF EXISTS onchain_contest_id CASCADE;


COMMIT;

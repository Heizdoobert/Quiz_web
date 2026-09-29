\set ON_ERROR_STOP 1
-- A and B have users rows; C appears only in tables without a users foreign key,
-- once in upper case.
INSERT INTO users (wallet_address, display_name) VALUES ('0x' || repeat('a', 40), 'A'), ('0x' || repeat('b', 40), 'B');
INSERT INTO questions (category, prompt, options, correct_index, created_by)
VALUES ('Test', 'Q by A', '["a","b","c","d"]', 0, '0x' || repeat('a', 40));

CREATE TEMP TABLE seedq AS
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n FROM questions WHERE created_by IS NULL;

INSERT INTO quiz_results (wallet_address, question_id, answer_index, is_correct)
SELECT '0x' || repeat('a', 40), id, 0, true FROM seedq WHERE n = 1
UNION ALL SELECT '0x' || repeat('a', 40), id, 1, false FROM seedq WHERE n = 2
UNION ALL SELECT '0x' || repeat('b', 40), id, 0, true FROM seedq WHERE n = 1;

INSERT INTO groups (name, owner_wallet) VALUES ('G', '0x' || repeat('a', 40));
INSERT INTO group_members (group_id, wallet_address)
SELECT id, '0x' || repeat('a', 40) FROM groups UNION ALL SELECT id, '0x' || repeat('b', 40) FROM groups;

INSERT INTO question_lists (owner_wallet, title) VALUES ('0x' || repeat('b', 40), 'L');
INSERT INTO list_entries (list_id, wallet_address, status)
SELECT id, '0x' || repeat('c', 40), 'completed' FROM question_lists
UNION ALL SELECT id, '0x' || repeat('a', 40), 'reviewer' FROM question_lists;
INSERT INTO question_list_confirmations (list_id, confirmer_wallet)
SELECT id, '0x' || repeat('a', 40) FROM question_lists UNION ALL SELECT id, '0x' || repeat('c', 40) FROM question_lists;

INSERT INTO reward_claims (wallet_address, claim_type, amount, nonce, status)
VALUES ('0x' || repeat('a', 40), 'token', 100, 'n1', 'pending');
INSERT INTO reward_claims (wallet_address, claim_type, list_id, amount, nonce, status)
SELECT '0x' || repeat('C', 40), 'contest', id, 5, 'n2', 'claimed' FROM question_lists;

INSERT INTO question_disputes (question_id, reporter_wallet, reason)
SELECT id, '0x' || repeat('b', 40), 'wrong' FROM seedq WHERE n = 2
UNION ALL SELECT id, '0x' || repeat('c', 40), 'typo' FROM seedq WHERE n = 3;

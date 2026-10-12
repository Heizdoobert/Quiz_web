\set ON_ERROR_STOP 1
-- Answers for the drop harness, loaded after accounts.sql (a fresh database has no seed
-- questions, so 10-seed.sql's answers come out empty). A and B answer the way pre-accounts
-- code did, by wallet only, and the bridge fills in the account. E signed up by email:
-- no wallet, so everything it owns is keyed by account id only.
DO $$
DECLARE
  a TEXT := '0x' || repeat('a', 40);
  b TEXT := '0x' || repeat('b', 40);
  e UUID;
  q1 UUID;
  q2 UUID;
  q3 UUID;
BEGIN
  INSERT INTO questions (category, prompt, options, correct_index, status)
  VALUES ('Test', 'Core 1', '["a","b"]', 0, 'verified') RETURNING id INTO q1;
  INSERT INTO questions (category, prompt, options, correct_index, status)
  VALUES ('Test', 'Core 2', '["a","b"]', 0, 'verified') RETURNING id INTO q2;
  INSERT INTO questions (category, prompt, options, correct_index, status)
  VALUES ('Test', 'Core 3', '["a","b"]', 0, 'verified') RETURNING id INTO q3;
  INSERT INTO quiz_results (wallet_address, question_id, answer_index, is_correct)
  VALUES (a, q1, 0, true), (a, q2, 1, false), (b, q1, 0, true);

  INSERT INTO auth.users (email) VALUES ('e@example.com') RETURNING id INTO e;
  INSERT INTO users (auth_user_id, display_name) VALUES (e, 'E') RETURNING id INTO e;
  INSERT INTO questions (category, prompt, options, correct_index, created_by_user, status)
  VALUES ('Test', 'Q by E', '["a","b"]', 0, e, 'verified');
  INSERT INTO quiz_results (user_id, question_id, answer_index, is_correct)
  VALUES (e, q1, 0, true), (e, q3, 0, true);
  INSERT INTO group_members (group_id, user_id) SELECT id, e FROM groups;
  INSERT INTO question_disputes (question_id, reporter_user, reason) VALUES (q2, e, 'unclear');
END $$;

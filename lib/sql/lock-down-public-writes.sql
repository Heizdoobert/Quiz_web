-- Server-only writes for questions, disputes and groups, and no public read of
-- individual answers. Run after secure-rewards-and-answers.sql and after
-- re-running stats-functions.sql (which makes the stats functions SECURITY
-- DEFINER, so leaderboards keep working once quiz_results is unreadable).
-- Idempotent: safe to re-run in the Supabase SQL Editor.

-- Questions: added by the server for the signed-in wallet, with length caps and a daily limit.
DROP POLICY IF EXISTS "Allow public insert for questions" ON questions;

-- Disputes: filed by the server for signed-in wallets that answered the question.
DROP POLICY IF EXISTS "Allow public insert for question_disputes" ON question_disputes;

-- Groups: created, joined and left only as the signed-in wallet.
-- The public delete policy let anyone remove anyone from any group.
DROP POLICY IF EXISTS "Allow public insert for groups" ON groups;
DROP POLICY IF EXISTS "Allow public insert for group_members" ON group_members;
DROP POLICY IF EXISTS "Allow public delete for group_members" ON group_members;

-- Answers: a row's answer_index plus is_correct gives away the correct option.
-- Stats and leaderboards read through the SECURITY DEFINER functions instead.
DROP POLICY IF EXISTS "Allow public read for quiz_results" ON quiz_results;

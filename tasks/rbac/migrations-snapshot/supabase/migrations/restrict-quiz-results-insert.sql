-- Only the server (secret key, which bypasses RLS) may record answers.
-- Rewards are paid per correct row, so a public insert policy lets anyone forge them.
-- Idempotent: safe to re-run in the Supabase SQL Editor.
DROP POLICY IF EXISTS "Allow public insert for quiz_results" ON quiz_results;

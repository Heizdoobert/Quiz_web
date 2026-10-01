# lib/sql/retire-sample-questions.sql
lines:48 exports:
---
-- Retires the 14 built-in sample questions (lib/schema.sql's former seed block) by
-- marking them 'rejected', which removes them from the public-question rule
-- (status = 'verified' AND list_id IS NULL). Matched by exact prompt and
-- created_by IS NULL so a player-authored question with a coincidentally
-- similar prompt is never touched.
--
-- Never deletes: quiz_results.question_id is ON DELETE CASCADE, so deleting these
-- rows would erase every player's recorded answers and lower their scores.
--
-- Run on a Supabase branch first, then production. Safe to re-run.
BEGIN;

CREATE TEMP TABLE pg_temp.sample_prompts (prompt TEXT) ON COMMIT DROP;
INSERT INTO pg_temp.sample_prompts (prompt) VALUES
  ('Which consensus mechanism did Ethereum transition to during The Merge in September 2022?'),
  ('What is the primary function of an EIP-712 structured data signature?'),
  ('In Next.js App Router, which file convention is used to render an error boundary fallback UI for a route segment?'),
  ('What does CSS property "backface-visibility: hidden" do during a 3D rotation transform?'),
  ('What is the average time complexity of searching an element in a balanced Binary Search Tree (BST)?'),
  ('Which Ethereum token standard defines non-fungible tokens (NFTs)?'),
  ('Which React hook should be used to synchronize with an external store with tearing prevention in React 18 & 19?'),
  ('What year was the Git version control system created by Linus Torvalds?'),
  ('What is Base in the Ethereum ecosystem?'),
  ('What does AMM stand for in decentralized finance protocols like Uniswap?'),
  ('What is Impermanent Loss in decentralized liquidity pools?'),
  ('Which Ethereum standard enables multi-token management for fungible and non-fungible game assets in a single contract?'),
  ('What is a Soulbound Token (SBT) in Web3?'),
  ('What is the primary role of a sequencer in an Ethereum Layer 2 rollup?');

UPDATE questions
SET status = 'rejected'
WHERE created_by IS NULL
  AND prompt IN (SELECT prompt FROM pg_temp.sample_prompts);

DO $$
DECLARE
  retired_count INT;
BEGIN
  SELECT count(*) INTO retired_count
  FROM questions q

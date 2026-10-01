# lib/sql/widen-reward-claims-amount.sql
lines:4 exports:
---
-- Token amounts are in wei: one correct answer is 1e19, which overflows BIGINT
-- (max ~9.22e18), so every pending token claim failed to record.
-- NUMERIC(78,0) holds any uint256. Idempotent: safe to re-run in the Supabase SQL Editor.
ALTER TABLE reward_claims ALTER COLUMN amount TYPE NUMERIC(78,0);

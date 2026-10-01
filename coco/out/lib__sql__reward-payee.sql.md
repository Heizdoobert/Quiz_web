# lib/sql/reward-payee.sql
lines:53 exports:
---
-- Phase 5: Rewards - Payee rule and treasury sweep
-- Safe and idempotent to run on a Supabase branch or production.

BEGIN;

-- 1. Add treasury_swept_count to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS treasury_swept_count INT NOT NULL DEFAULT 0;

-- 2. sweep_to_treasury()
-- Sweeps correct answers older than 180 days from accounts without a wallet.
-- Idempotent: running twice changes nothing. Never lowers counts.
CREATE OR REPLACE FUNCTION sweep_to_treasury() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff TIMESTAMPTZ := now() - INTERVAL '180 days';
BEGIN
  UPDATE users u
  SET treasury_swept_count = GREATEST(u.treasury_swept_count, coalesce(sub.swept_cnt, 0))
  FROM (
    SELECT qr.user_id, count(*)::int AS swept_cnt
    FROM quiz_results qr
    WHERE qr.is_correct = true
      AND qr.answered_at < cutoff
    GROUP BY qr.user_id
  ) sub
  WHERE u.id = sub.user_id
    AND u.wallet_address IS NULL
    AND sub.swept_cnt > u.treasury_swept_count;
END;
$$;

-- 3. get_treasury_entitled_count()
-- Returns sum of all treasury_swept_count across users.
CREATE OR REPLACE FUNCTION get_treasury_entitled_count() RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE

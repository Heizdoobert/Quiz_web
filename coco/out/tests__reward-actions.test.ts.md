# tests/reward-actions.test.ts
lines:288 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTokenVoucher, generateBadgeVoucher, confirmRewardClaim } from '../lib/actions/reward-actions';
import { getSessionAccount } from '../lib/services/session';
import { statsForAccount } from '../lib/utils/stats';
import { getGlobalLeaderboard } from '../lib/actions/leaderboard-actions';
import { supabase } from '../lib/supabase/supabase';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';
import { getSignerAccount, isVoucherUsed, isContestVoucherUsed } from '../lib/utils/chain';

const WALLET = '0x' + 'a'.repeat(40);
const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000f1';
const ZERO_STATS = { score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 };

vi.mock('../lib/services/session', () => ({ getSessionAccount: vi.fn() }));
vi.mock('../lib/utils/stats', () => ({ statsForAccount: vi.fn() }));
vi.mock('../lib/actions/leaderboard-actions', () => ({ getGlobalLeaderboard: vi.fn() }));
vi.mock('../lib/utils/chain', () => ({
  REWARD_CHAIN_ID: 84532,
  isVoucherUsed: vi.fn(),
  isContestVoucherUsed: vi.fn(),
  getSignerAccount: vi.fn(),
  newNonce: vi.fn(() => BigInt(1)),
  getContestId: vi.fn(() => '0xcontest'),
}));
vi.mock('../lib/supabase/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('../lib/supabase/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));

// A chain that answers a plain select (via `.then`, once awaited) with `selectResult`,
// a `.maybeSingle()` with `maybeSingleResult`, an `.insert()` with `insertResult`, and
// switches its `.then` answer to `updateSelectResult` once `.update()` was called on it
// (reward_claims writes end in `.update().eq().eq().select('id')`).
function chain(opts: {
  selectResult?: { data: unknown; error: unknown };
  maybeSingleResult?: { data: unknown; error: unknown };
  insertResult?: { error: unknown };
  updateSelectResult?: { data: unknown; error: unknown };
} = {}) {
  const selectResult = opts.selectResult ?? { data: [], error: null };
  const maybeSingleResult = opts.maybeSingleResult ?? { data: null, error: null };
  const insertResult = opts.insertResult ?? { error: null };

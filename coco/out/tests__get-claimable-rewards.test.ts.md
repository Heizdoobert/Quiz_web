# tests/get-claimable-rewards.test.ts
lines:97 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClaimableRewards } from '../lib/actions/reward-actions';
import { getSessionAccount } from '../lib/session';
import { statsForAccount } from '../lib/stats';
import { getGlobalLeaderboard } from '../lib/actions/leaderboard-actions';
import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabase-admin';

const WALLET = '0x' + 'a'.repeat(40);
const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000f1';
const ZERO_STATS = { score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 };

vi.mock('../lib/session', () => ({ getSessionAccount: vi.fn() }));
vi.mock('../lib/stats', () => ({ statsForAccount: vi.fn() }));
vi.mock('../lib/actions/leaderboard-actions', () => ({ getGlobalLeaderboard: vi.fn() }));
vi.mock('../lib/chain', () => ({
  REWARD_CHAIN_ID: 84532,
  isVoucherUsed: vi.fn(),
  isContestVoucherUsed: vi.fn(),
  getSignerAccount: vi.fn(),
  newNonce: vi.fn(),
  getContestId: vi.fn(),
}));
vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('../lib/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));

// No pending vouchers to settle, and no already-claimed rows: an empty result for every query.
function emptyChain() {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'maybeSingle', 'single', 'order', 'range']) chain[m] = () => chain;
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
  return chain;
}

describe('getClaimableRewards', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (getGlobalLeaderboard as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => emptyChain());
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(() => emptyChain());

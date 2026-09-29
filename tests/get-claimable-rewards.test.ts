import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClaimableRewards } from '../lib/actions/reward-actions';
import { accountIdForWallet } from '../lib/users';
import { statsForAccount } from '../lib/stats';
import { getGlobalLeaderboard } from '../lib/actions/leaderboard-actions';
import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabase-admin';

const WALLET = '0x' + 'a'.repeat(40);
const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000f1';
const ZERO_STATS = { score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 };

vi.mock('../lib/users', () => ({ accountIdForWallet: vi.fn() }));
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
  for (const m of ['select', 'eq']) chain[m] = () => chain;
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
  return chain;
}

describe('getClaimableRewards', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (getGlobalLeaderboard as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => emptyChain());
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(() => emptyChain());
  });

  it('resolves the wallet to an account and totals its stats as earned tokens', async () => {
    (accountIdForWallet as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT_ID);
    (statsForAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ ...ZERO_STATS, score: 3 });

    const rewards = await getClaimableRewards(WALLET);

    expect(accountIdForWallet).toHaveBeenCalledWith(WALLET);
    expect(statsForAccount).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(rewards.totalEarned).toBe((BigInt(30) * BigInt(10) ** BigInt(18)).toString());
    expect(rewards.claimableTokens).toBe(rewards.totalEarned);
  });

  it('claims nothing for a wallet with no account yet, without reading stats', async () => {
    (accountIdForWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const rewards = await getClaimableRewards(WALLET);

    expect(statsForAccount).not.toHaveBeenCalled();
    expect(rewards.totalEarned).toBe('0');
    expect(rewards.claimableTokens).toBe('0');
  });
});

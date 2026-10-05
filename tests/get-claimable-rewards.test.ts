import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClaimableRewards } from '../lib/actions/reward-actions';
import { getSessionAccount } from '../lib/services/session';
import { statsForAccount } from '../lib/utils/stats';
import { getGlobalLeaderboard } from '../lib/actions/leaderboard-actions';
import { supabase } from '../lib/supabase/supabase';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';

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
  newNonce: vi.fn(),
  getContestId: vi.fn(),
}));
vi.mock('../lib/supabase/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('../lib/supabase/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));

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
  });

  it('totals the session account stats as earned tokens', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID, wallet: WALLET });
    (statsForAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ ...ZERO_STATS, score: 3 });

    const rewards = await getClaimableRewards();

    expect(statsForAccount).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(rewards.totalEarned).toBe((BigInt(30) * BigInt(10) ** BigInt(18)).toString());
    expect(rewards.claimableTokens).toBe(rewards.totalEarned);
  });

  it('claims nothing without a session, without reading stats', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const rewards = await getClaimableRewards();

    expect(statsForAccount).not.toHaveBeenCalled();
    expect(rewards.totalEarned).toBe('0');
    expect(rewards.claimableTokens).toBe('0');
  });

  it('totals stats for a signed-in account with no wallet, without settling on-chain vouchers', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID, wallet: null });
    (statsForAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ ...ZERO_STATS, score: 2 });

    const rewards = await getClaimableRewards();

    expect(statsForAccount).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(rewards.totalEarned).toBe((BigInt(20) * BigInt(10) ** BigInt(18)).toString());
  });

  it('grants the leaderboard badge when the account id matches a top-3 row', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID, wallet: WALLET });
    (statsForAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ZERO_STATS);
    (getGlobalLeaderboard as ReturnType<typeof vi.fn>).mockResolvedValue([
      { user_id: ACCOUNT_ID, wallet_address: WALLET, display_name: 'Me', score: 9, accuracy: 90, rank: 1 },
    ]);

    const rewards = await getClaimableRewards();

    expect(rewards.eligibleBadges).toContain(0);
  });

  it('does not grant the leaderboard badge for a different account id', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID, wallet: WALLET });
    (statsForAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ZERO_STATS);
    (getGlobalLeaderboard as ReturnType<typeof vi.fn>).mockResolvedValue([
      { user_id: 'someone-else', wallet_address: WALLET, display_name: 'Not me', score: 9, accuracy: 90, rank: 1 },
    ]);

    const rewards = await getClaimableRewards();

    expect(rewards.eligibleBadges).not.toContain(0);
  });
});

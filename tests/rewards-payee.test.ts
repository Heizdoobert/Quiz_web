import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getClaimableRewards,
  generateTokenVoucher,
  generateBadgeVoucher,
} from '../lib/actions/reward-actions';
import { getSessionAccount } from '../lib/services/session';
import { statsForAccount } from '../lib/utils/stats';
import { getGlobalLeaderboard } from '../lib/actions/leaderboard-actions';
import { supabase } from '../lib/supabase/supabase';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';
import { getSignerAccount, isVoucherUsed } from '../lib/services/chain';

vi.mock('../lib/services/session', () => ({
  getSessionAccount: vi.fn(),
}));

vi.mock('../lib/utils/stats', () => ({
  statsForAccount: vi.fn(),
}));

vi.mock('../lib/actions/leaderboard-actions', () => ({
  getGlobalLeaderboard: vi.fn(),
}));

vi.mock('../lib/services/chain', () => ({
  REWARD_CHAIN_ID: 84532,
  isVoucherUsed: vi.fn(),
  isContestVoucherUsed: vi.fn(),
  getSignerAccount: vi.fn(),
  newNonce: vi.fn().mockReturnValue('123456789'),
  getContestId: vi.fn(),
}));

vi.mock('../lib/supabase/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../lib/supabase/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const TOKENS_PER_CORRECT = BigInt(10) * BigInt(10) ** BigInt(18);

function mockTable(data: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['select', 'eq', 'order', 'range', 'limit', 'maybeSingle', 'single', 'insert', 'update'];
  for (const m of methods) {
    chain[m] = vi.fn().mockImplementation(() => {
      if (m === 'maybeSingle' || m === 'single') {
        const item = Array.isArray(data) ? data[0] ?? null : data;
        return Promise.resolve({ data: item, error: null });
      }
      return chain;
    });
  }
  (chain as unknown as { then: unknown }).then = (resolve: (val: unknown) => unknown) => {
    return resolve({
      data: Array.isArray(data) ? data : (data ? [data] : []),
      error: null,
    });
  };
  return chain;
}

describe('Reward Payee Rule & Treasury Sweep (Task 22)', () => {
  const originalEnv = process.env.TREASURY_WALLET_ADDRESS;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TREASURY_WALLET_ADDRESS;

    (getGlobalLeaderboard as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (isVoucherUsed as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.TREASURY_WALLET_ADDRESS = originalEnv;
    } else {
      delete process.env.TREASURY_WALLET_ADDRESS;
    }
  });

  describe('Account without a wallet', () => {
    it('returns 0 claimable tokens and correct heldTokens, and blocks vouchers with WALLET_REQUIRED', async () => {
      (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'no-wallet-user',
        wallet: null,
      });

      (statsForAccount as ReturnType<typeof vi.fn>).mockResolvedValue({
        score: 5,
        totalAnswered: 5,
        bestStreak: 2,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'reward_claims') return mockTable([]);
        return mockTable([]);
      });

      const now = new Date();
      (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'users') return mockTable({ treasury_swept_count: 0 });
        if (table === 'quiz_results') return mockTable({ answered_at: now.toISOString() });
        return mockTable([]);
      });

      const rewards = await getClaimableRewards();
      expect(rewards.claimableTokens).toBe('0');
      expect(rewards.heldTokens).toBe((BigInt(5) * TOKENS_PER_CORRECT).toString());
      expect(rewards.sweepsAt).toBeDefined();

      const tokenVoucherRes = await generateTokenVoucher();
      expect(tokenVoucherRes).toEqual({
        error: 'Add a wallet to claim rewards.',
        code: 'WALLET_REQUIRED',
      });

      const badgeVoucherRes = await generateBadgeVoucher(0);
      expect(badgeVoucherRes).toEqual({
        error: 'Add a wallet to claim rewards.',
        code: 'WALLET_REQUIRED',
      });
    });
  });

  describe('Account with a wallet (standard payee rule)', () => {
    it('calculates claimable = 10 * (correct - treasury_swept_count) - claimed', async () => {
      const wallet = '0x1111111111111111111111111111111111111111';
      (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'wallet-user',
        wallet,
      });

      // 15 correct answers, but 5 were swept by treasury before wallet was added
      (statsForAccount as ReturnType<typeof vi.fn>).mockResolvedValue({
        score: 15,
        totalAnswered: 20,
        bestStreak: 5,
      });

      // 20 tokens (2 correct answers) already claimed
      const alreadyClaimedWei = (BigInt(2) * TOKENS_PER_CORRECT).toString();
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'reward_claims') return mockTable([{ amount: alreadyClaimedWei }]);
        return mockTable([]);
      });

      (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'users') return mockTable({ treasury_swept_count: 5 });
        if (table === 'reward_claims') return mockTable([]); // no pending claims
        return mockTable([]);
      });

      const rewards = await getClaimableRewards();

      // Effective score = 15 - 5 = 10 correct answers.
      // Total earned = 10 * 10 = 100 QUIZ
      // Total claimed = 20 QUIZ
      // Claimable = 80 QUIZ
      const expectedClaimable = BigInt(8) * TOKENS_PER_CORRECT;
      expect(rewards.claimableTokens).toBe(expectedClaimable.toString());
      expect(rewards.heldTokens).toBeUndefined();

      // Test voucher generation signs with recipient = account.wallet
      const mockSigner = {
        signTypedData: vi.fn().mockResolvedValue('0xmocksignature'),
      };
      (getSignerAccount as ReturnType<typeof vi.fn>).mockReturnValue(mockSigner);

      const voucherRes = await generateTokenVoucher();
      expect('recipient' in voucherRes).toBe(true);
      if ('recipient' in voucherRes) {
        expect(voucherRes.recipient).toBe(wallet);
        expect(voucherRes.amount).toBe(expectedClaimable.toString());
      }
    });
  });

  describe('Treasury account and sweep', () => {
    const treasuryWallet = '0x9999999999999999999999999999999999999999';

    it('triggers sweep_to_treasury and includes treasury pool for the treasury wallet', async () => {
      process.env.TREASURY_WALLET_ADDRESS = treasuryWallet;

      (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'treasury-account-id',
        wallet: treasuryWallet,
      });

      // Treasury account itself answered 1 question
      (statsForAccount as ReturnType<typeof vi.fn>).mockResolvedValue({
        score: 1,
        totalAnswered: 1,
        bestStreak: 1,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'reward_claims') return mockTable([]);
        return mockTable([]);
      });

      (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'users') return mockTable({ treasury_swept_count: 0 });
        if (table === 'reward_claims') return mockTable([]);
        return mockTable([]);
      });

      (supabaseAdmin!.rpc as ReturnType<typeof vi.fn>).mockImplementation((fn: string) => {
        if (fn === 'sweep_to_treasury') return Promise.resolve({ data: null, error: null });
        if (fn === 'get_treasury_entitled_count') return Promise.resolve({ data: 40, error: null }); // 40 swept answers = 400 QUIZ
        return Promise.resolve({ data: null, error: null });
      });

      const rewards = await getClaimableRewards();

      // RPC sweep_to_treasury was called
      expect(supabaseAdmin!.rpc).toHaveBeenCalledWith('sweep_to_treasury');
      expect(supabaseAdmin!.rpc).toHaveBeenCalledWith('get_treasury_entitled_count');

      // Total earned = 1 own answer + 40 pool answers = 41 answers = 410 QUIZ
      const expectedTotal = BigInt(41) * TOKENS_PER_CORRECT;
      expect(rewards.totalEarned).toBe(expectedTotal.toString());
      expect(rewards.claimableTokens).toBe(expectedTotal.toString());
    });

    it('does not trigger sweep or add pool when TREASURY_WALLET_ADDRESS is unset', async () => {
      delete process.env.TREASURY_WALLET_ADDRESS;

      (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'some-user',
        wallet: treasuryWallet,
      });

      (statsForAccount as ReturnType<typeof vi.fn>).mockResolvedValue({
        score: 2,
        totalAnswered: 2,
        bestStreak: 2,
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'reward_claims') return mockTable([]);
        return mockTable([]);
      });

      (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
        if (table === 'users') return mockTable({ treasury_swept_count: 0 });
        if (table === 'reward_claims') return mockTable([]);
        return mockTable([]);
      });

      const rewards = await getClaimableRewards();

      // RPC sweep_to_treasury was NOT called
      expect(supabaseAdmin!.rpc).not.toHaveBeenCalled();

      // Only own score = 2 * 10 = 20 QUIZ
      const expected = BigInt(2) * TOKENS_PER_CORRECT;
      expect(rewards.totalEarned).toBe(expected.toString());
      expect(rewards.claimableTokens).toBe(expected.toString());
    });
  });
});

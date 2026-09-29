import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTokenVoucher, generateBadgeVoucher, confirmRewardClaim } from '../lib/actions/reward-actions';
import { getSessionAccount } from '../lib/session';
import { statsForAccount } from '../lib/stats';
import { getGlobalLeaderboard } from '../lib/actions/leaderboard-actions';
import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabase-admin';
import { getSignerAccount, isVoucherUsed, isContestVoucherUsed } from '../lib/chain';

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
  newNonce: vi.fn(() => BigInt(1)),
  getContestId: vi.fn(() => '0xcontest'),
}));
vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('../lib/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));

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
  const updateSelectResult = opts.updateSelectResult ?? { data: [{ id: 'row1' }], error: null };
  let updated = false;

  const c: Record<string, unknown> = {};
  c.select = () => c;
  c.eq = () => c;
  c.update = () => {
    updated = true;
    return c;
  };
  c.maybeSingle = () => Promise.resolve(maybeSingleResult);
  c.insert = () => Promise.resolve(insertResult);
  c.then = (resolve: (v: unknown) => unknown) => resolve(updated ? updateSelectResult : selectResult);
  return c;
}

describe('generateTokenVoucher', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (getGlobalLeaderboard as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => chain());
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(() => chain());
  });

  it('refuses without a session', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await generateTokenVoucher();

    expect(result).toEqual({ error: 'Sign in first.' });
  });

  it('returns WALLET_REQUIRED for a session account with no wallet', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID, wallet: null });

    const result = await generateTokenVoucher();

    expect(result).toEqual({ error: 'Add a wallet to claim rewards.', code: 'WALLET_REQUIRED' });
  });

  it('signs a voucher for account.wallet and records it keyed by user_id', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID, wallet: WALLET });
    (statsForAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ ...ZERO_STATS, score: 5 });
    const signTypedData = vi.fn().mockResolvedValue('0xsignature');
    (getSignerAccount as ReturnType<typeof vi.fn>).mockReturnValue({ signTypedData });

    const insertCalls: Array<Record<string, unknown>> = [];
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const c = chain();
      const realInsert = c.insert as (payload: Record<string, unknown>) => Promise<unknown>;
      c.insert = (payload: Record<string, unknown>) => {
        insertCalls.push(payload);
        return realInsert(payload);
      };
      return c;
    });

    const result = await generateTokenVoucher();

    expect(signTypedData).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.objectContaining({ recipient: WALLET }) })
    );
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({ user_id: ACCOUNT_ID, claim_type: 'token', status: 'pending' });
    expect(insertCalls[0]).not.toHaveProperty('wallet_address');
    expect(result).toMatchObject({ recipient: WALLET, signature: '0xsignature' });
  });

  it('hands back an already-open voucher instead of signing a second one', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID, wallet: WALLET });
    (getSignerAccount as ReturnType<typeof vi.fn>).mockReturnValue({ signTypedData: vi.fn() });
    const pending = { id: 'c1', nonce: '42', amount: '100', deadline: '9999999999', signature: '0xold' };
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      chain({ selectResult: { data: [pending], error: null } })
    );
    (isVoucherUsed as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const result = await generateTokenVoucher();

    expect(result).toMatchObject({ recipient: WALLET, nonce: '42', signature: '0xold' });
    expect((getSignerAccount as ReturnType<typeof vi.fn>).mock.results[0]?.value.signTypedData).not.toHaveBeenCalled();
  });
});

describe('generateBadgeVoucher', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => chain());
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(() => chain());
  });

  it('refuses without a session', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await generateBadgeVoucher(1);

    expect(result).toEqual({ error: 'Sign in first.' });
  });

  it('returns WALLET_REQUIRED for a session account with no wallet', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID, wallet: null });

    const result = await generateBadgeVoucher(1);

    expect(result).toEqual({ error: 'Add a wallet to claim rewards.', code: 'WALLET_REQUIRED' });
  });

  it('signs an eligible badge for account.wallet and records it keyed by user_id', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID, wallet: WALLET });
    (statsForAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ ...ZERO_STATS, bestStreak: 10 });
    (getGlobalLeaderboard as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const signTypedData = vi.fn().mockResolvedValue('0xbadgesig');
    (getSignerAccount as ReturnType<typeof vi.fn>).mockReturnValue({ signTypedData });

    const insertCalls: Array<Record<string, unknown>> = [];
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const c = chain();
      const realInsert = c.insert as (payload: Record<string, unknown>) => Promise<unknown>;
      c.insert = (payload: Record<string, unknown>) => {
        insertCalls.push(payload);
        return realInsert(payload);
      };
      return c;
    });

    const result = await generateBadgeVoucher(1);

    expect(insertCalls[0]).toMatchObject({ user_id: ACCOUNT_ID, claim_type: 'badge', badge_type: 1 });
    expect(result).toMatchObject({ recipient: WALLET, badgeType: 1, signature: '0xbadgesig' });
  });

  it('refuses an ineligible badge', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID, wallet: WALLET });
    (getSignerAccount as ReturnType<typeof vi.fn>).mockReturnValue({ signTypedData: vi.fn() });
    (statsForAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ZERO_STATS);
    (getGlobalLeaderboard as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await generateBadgeVoucher(1);

    expect(result).toEqual({ error: 'Badge not eligible or already claimed' });
  });
});

describe('confirmRewardClaim', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('refuses without a session', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    expect(await confirmRewardClaim('42', '0xtx')).toEqual({ success: false });
  });

  it('refuses for a session account with no wallet', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID, wallet: null });

    expect(await confirmRewardClaim('42', '0xtx')).toEqual({ success: false });
  });

  it('confirms a token claim once its nonce is spent on-chain, keyed by user_id', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID, wallet: WALLET });
    (isVoucherUsed as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const eqCalls: unknown[][] = [];
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const c = chain({ maybeSingleResult: { data: { id: 'c1', claim_type: 'token', list_id: null }, error: null } });
      const realEq = c.eq as (col: string, val: unknown) => unknown;
      c.eq = (col: string, val: unknown) => {
        eqCalls.push([col, val]);
        return realEq(col, val);
      };
      return c;
    });

    const result = await confirmRewardClaim('42', '0xtx');

    expect(eqCalls).toContainEqual(['user_id', ACCOUNT_ID]);
    expect(result).toEqual({ success: true });
  });

  it('refuses when the chain has not recorded the claim as spent', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID, wallet: WALLET });
    (isVoucherUsed as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      chain({ maybeSingleResult: { data: { id: 'c1', claim_type: 'token', list_id: null }, error: null } })
    );

    const result = await confirmRewardClaim('42', '0xtx');

    expect(result).toEqual({ success: false });
  });

  it('confirms a contest claim against the escrow contract', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID, wallet: WALLET });
    (isContestVoucherUsed as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      chain({
        maybeSingleResult: { data: { id: 'c1', claim_type: 'contest', list_id: 'list-1' }, error: null },
      })
    );

    const result = await confirmRewardClaim('42', '0xtx');

    expect(result).toEqual({ success: true });
  });
});

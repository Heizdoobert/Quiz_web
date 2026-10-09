import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyTypedData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { claimListReward } from '../lib/actions/question-list-actions';
import { getContestId } from '../lib/services/contest';
import { CONTEST_ESCROW_ADDRESS } from '../lib/contracts/addresses';
import { REWARD_CHAIN_ID } from '../lib/services/chain';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';
import { getSessionAccount } from '../lib/services/session';

const SIGNER = privateKeyToAccount('0x1111111111111111111111111111111111111111111111111111111111111111');
const NONCE = BigInt(12345);

type OnChain = { creator: string; totalPool: bigint; remainingPool: bigint; createdAt: bigint; expiresAt: bigint; active: boolean };
const chain = vi.hoisted(() => ({
  onChain: null as unknown,
  voucherUsed: false,
}));

vi.mock('../lib/supabase/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock('../lib/supabase/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('../lib/services/session', () => ({ getSessionAccount: vi.fn() }));
// Real REWARD_CHAIN_ID, CONTEST_ESCROW_ADDRESS and getContestId; only the on-chain reads and the
// nonce are stubbed. The signer is a real viem account so the signature can be verified.
vi.mock('../lib/services/chain', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/services/chain')>()),
  getSignerAccount: () => SIGNER,
  newNonce: () => NONCE,
  getContestOnChain: async () => chain.onChain,
  isContestVoucherUsed: async () => chain.voucherUsed,
}));

const WALLET = '0x' + 'a'.repeat(40);
const OWNER = '0x' + 'ab'.repeat(20);
const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000f1';
const LIST_ID = '00000000-0000-4000-8000-000000000001';
const REWARD = '10000000000000000000';

const nowSec = () => Math.floor(Date.now() / 1000);
const liveContest = (over: Partial<OnChain> = {}): OnChain => ({
  creator: OWNER,
  totalPool: BigInt('1000000000000000000000'),
  remainingPool: BigInt('1000000000000000000000'),
  createdAt: BigInt(nowSec() - 3600),
  expiresAt: BigInt(nowSec() + 86400),
  active: true,
  ...over,
});

type Table = { row?: unknown; rows?: unknown[]; insertError?: unknown };

// maybeSingle() resolves `row`; awaiting a select chain resolves `rows`.
function mockTables(tables: Record<string, Table>) {
  const inserts: Record<string, unknown[]> = {};
  const updates: Record<string, unknown[]> = {};
  (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((name: string) => {
    const t = tables[name] ?? {};
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'neq', 'in', 'order', 'limit']) q[m] = () => q;
    q.maybeSingle = async () => ({ data: t.row ?? null, error: null });
    q.insert = async (row: unknown) => {
      (inserts[name] ??= []).push(row);
      return { error: t.insertError ?? null };
    };
    q.update = (val: unknown) => {
      (updates[name] ??= []).push(val);
      return q;
    };
    q.then = (resolve: (v: unknown) => unknown) => resolve({ data: t.rows ?? [], error: null });
    return q;
  });
  return { inserts, updates };
}

const completedEntry = { status: 'completed', reward_amount: REWARD };
const liveList = { owner_wallet: OWNER, status: 'live' };

beforeEach(() => {
  vi.mocked(getSessionAccount).mockResolvedValue({ id: ACCOUNT_ID, wallet: WALLET } as never);
  chain.onChain = liveContest();
  chain.voucherUsed = false;
});

describe('getContestId', () => {
  const lowerId = '00000000-0000-4000-8000-000000000001';

  it('hashes "<listId>:<owner>" to the known bytes32 vector', () => {
    // keccak256 of the UTF-8 string "00000000-0000-4000-8000-000000000001:0xabab...ab" (derived once with viem).
    expect(getContestId(lowerId, OWNER)).toBe('0x7087911fbde5ca480f90b497d27931d4062c1b82304512d6c4a43fb39ba3df74');
  });

  it('hashes just the list id when no owner is given', () => {
    expect(getContestId(lowerId)).toBe('0x27df9e4f396b049a38fecd6237c650c5df3f372785585cd7ced3fae81d61e5cd');
  });

  it('lowercases both the list id and the wallet before hashing', () => {
    expect(getContestId('ABCDEF00-0000-4000-8000-000000000001', '0x' + 'AB'.repeat(20))).toBe(
      getContestId('abcdef00-0000-4000-8000-000000000001', '0x' + 'ab'.repeat(20)),
    );
    expect(getContestId(lowerId.toUpperCase(), OWNER)).toBe(getContestId(lowerId, OWNER));
  });

  it('gives a different id for a different owner', () => {
    expect(getContestId(lowerId, WALLET)).not.toBe(getContestId(lowerId, OWNER));
  });
});

describe('claimListReward branches', () => {
  it('returns "Contest entry not found." when the account has no entry', async () => {
    const { inserts } = mockTables({ list_entries: {}, question_lists: { row: liveList } });
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'Contest entry not found.' });
    expect(inserts.reward_claims).toBeUndefined();
  });

  it('returns "Contest not found." when the list is missing', async () => {
    const { inserts } = mockTables({ list_entries: { row: completedEntry }, question_lists: {} });
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'Contest not found.' });
    expect(inserts.reward_claims).toBeUndefined();
  });

  it('refuses when the on-chain pool is smaller than the reward', async () => {
    chain.onChain = liveContest({ remainingPool: BigInt(REWARD) - BigInt(1) });
    const { inserts } = mockTables({ list_entries: { row: completedEntry }, question_lists: { row: liveList } });
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'Contest reward pool has been exhausted or closed.' });
    expect(inserts.reward_claims).toBeUndefined();
  });

  it('refuses when the contest is no longer active on-chain', async () => {
    chain.onChain = liveContest({ active: false });
    const { inserts } = mockTables({ list_entries: { row: completedEntry }, question_lists: { row: liveList } });
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'Contest reward pool has been exhausted or closed.' });
    expect(inserts.reward_claims).toBeUndefined();
  });

  it('refuses when the contest has expired on-chain', async () => {
    chain.onChain = liveContest({ expiresAt: BigInt(nowSec() - 1) });
    const { inserts } = mockTables({ list_entries: { row: completedEntry }, question_lists: { row: liveList } });
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'Contest has expired.' });
    expect(inserts.reward_claims).toBeUndefined();
  });

  it('returns the stored unexpired pending voucher and signs no new one', async () => {
    const deadline = nowSec() + 1800;
    const { inserts } = mockTables({
      list_entries: { row: completedEntry },
      question_lists: { row: liveList },
      reward_claims: { rows: [{ id: 'c1', nonce: '5', amount: REWARD, deadline, signature: '0x' + 'e'.repeat(130) }] },
    });
    expect(await claimListReward(LIST_ID)).toEqual({
      recipient: WALLET,
      amount: REWARD,
      nonce: '5',
      deadline: String(deadline),
      signature: '0x' + 'e'.repeat(130),
      contractAddress: CONTEST_ESCROW_ADDRESS,
      contestId: getContestId(LIST_ID, OWNER),
    });
    expect(inserts.reward_claims).toBeUndefined();
  });

  it('marks a pending voucher already redeemed on-chain as claimed and refuses', async () => {
    chain.voucherUsed = true;
    const { inserts, updates } = mockTables({
      list_entries: { row: completedEntry },
      question_lists: { row: liveList },
      reward_claims: {
        rows: [{ id: 'c1', nonce: '5', amount: REWARD, deadline: nowSec() + 1800, signature: '0x' + 'e'.repeat(130) }],
      },
    });
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'Reward has already been claimed.' });
    expect(updates.reward_claims).toEqual([{ status: 'claimed' }]);
    expect(updates.list_entries).toEqual([{ status: 'claimed' }]);
    expect(inserts.reward_claims).toBeUndefined();
  });

  it('returns the stored voucher when a concurrent claim wins the unique-violation race', async () => {
    const stored = { id: 'c9', nonce: '99', amount: REWARD, deadline: nowSec() + 1200, signature: '0x' + 'd'.repeat(130) };
    mockTables({
      list_entries: { row: completedEntry },
      question_lists: { row: liveList },
      reward_claims: { row: stored, insertError: { code: '23505' } },
    });
    expect(await claimListReward(LIST_ID)).toMatchObject({
      recipient: WALLET,
      amount: REWARD,
      nonce: '99',
      deadline: String(stored.deadline),
      signature: stored.signature,
    });
  });

  it('fails with "Failed to record reward voucher." on any other insert error', async () => {
    mockTables({
      list_entries: { row: completedEntry },
      question_lists: { row: liveList },
      reward_claims: { insertError: { code: '23503' } },
    });
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'Failed to record reward voucher.' });
  });
});

describe('claimListReward voucher signature', () => {
  const types = {
    ClaimContestReward: [
      { name: 'contestId', type: 'bytes32' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  } as const;

  function verify(voucher: { contestId?: `0x${string}`; amount: string; nonce: string; deadline: string; signature: string }) {
    return verifyTypedData({
      address: SIGNER.address,
      domain: { name: 'ContestEscrow', version: '1', chainId: REWARD_CHAIN_ID, verifyingContract: CONTEST_ESCROW_ADDRESS },
      types,
      primaryType: 'ClaimContestReward',
      message: {
        contestId: voucher.contestId!,
        recipient: WALLET as `0x${string}`,
        amount: BigInt(voucher.amount),
        nonce: BigInt(voucher.nonce),
        deadline: BigInt(voucher.deadline),
      },
      signature: voucher.signature as `0x${string}`,
    });
  }

  it('returns a voucher whose signature recovers to the signer over the contest escrow domain', async () => {
    const before = nowSec();
    mockTables({ list_entries: { row: completedEntry }, question_lists: { row: liveList } });
    const res = (await claimListReward(LIST_ID)) as Awaited<ReturnType<typeof claimListReward>> & {
      deadline: string; nonce: string; amount: string; signature: string; contestId: `0x${string}`;
    };

    expect(res).toMatchObject({
      recipient: WALLET,
      amount: REWARD,
      nonce: NONCE.toString(),
      contractAddress: CONTEST_ESCROW_ADDRESS,
      contestId: getContestId(LIST_ID, OWNER),
    });
    expect(Number(res.deadline)).toBeGreaterThanOrEqual(before + 3600);
    expect(Number(res.deadline)).toBeLessThanOrEqual(nowSec() + 3600);
    expect(await verify(res)).toBe(true);
  });

  it('does not verify when the amount is altered after signing', async () => {
    mockTables({ list_entries: { row: completedEntry }, question_lists: { row: liveList } });
    const res = (await claimListReward(LIST_ID)) as { contestId: `0x${string}`; amount: string; nonce: string; deadline: string; signature: string };
    expect(await verify({ ...res, amount: '20000000000000000000' })).toBe(false);
  });

  it('caps the signed deadline at the on-chain contest expiry', async () => {
    const expiresAt = nowSec() + 600;
    chain.onChain = liveContest({ expiresAt: BigInt(expiresAt) });
    mockTables({ list_entries: { row: completedEntry }, question_lists: { row: liveList } });
    const res = (await claimListReward(LIST_ID)) as { contestId: `0x${string}`; amount: string; nonce: string; deadline: string; signature: string };
    expect(res.deadline).toBe(String(expiresAt));
    expect(await verify(res)).toBe(true);
  });
});

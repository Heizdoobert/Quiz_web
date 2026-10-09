import { describe, it, expect, vi, beforeEach } from 'vitest';

const readContract = vi.fn();
vi.mock('viem', async (importOriginal) => ({
  ...(await importOriginal<typeof import('viem')>()),
  createPublicClient: vi.fn(() => ({ readContract })),
}));

import {
  getContestOnChain,
  isContestFundedOnChain,
  isContestVoucherUsed,
  isVoucherUsed,
  publicClientFor,
  getSignerAccount,
  newNonce,
} from '../lib/utils/chain';

const CONTEST = ('0x' + 'ab'.repeat(32)) as `0x${string}`;
const CREATOR = '0x' + 'c'.repeat(40);
const WALLET = '0x' + 'a'.repeat(40);
// ContestEscrow.contests(): creator, totalPool, remainingPool, createdAt, expiresAt, active
const tuple = (over: Partial<{ creator: string; total: bigint; active: boolean }> = {}) => [
  over.creator ?? CREATOR,
  over.total ?? BigInt(1000),
  BigInt(400),
  BigInt(10),
  BigInt(99),
  over.active ?? true,
];

beforeEach(() => {
  readContract.mockReset();
});

describe('getContestOnChain', () => {
  it('maps the contests() tuple to named fields', async () => {
    readContract.mockResolvedValue(tuple());
    expect(await getContestOnChain(CONTEST)).toEqual({
      creator: CREATOR,
      totalPool: BigInt(1000),
      remainingPool: BigInt(400),
      createdAt: BigInt(10),
      expiresAt: BigInt(99),
      active: true,
    });
    expect(readContract.mock.calls[0][0]).toMatchObject({ functionName: 'contests', args: [CONTEST] });
  });

  it('returns null when the read fails, so callers can fail closed', async () => {
    readContract.mockImplementation(async () => { throw new Error('rpc down'); });
    expect(await getContestOnChain(CONTEST)).toBeNull();
  });
});

describe('isContestFundedOnChain', () => {
  it('is true for an active contest from the right creator with a large enough pool', async () => {
    readContract.mockResolvedValue(tuple());
    expect(await isContestFundedOnChain(CONTEST, CREATOR.toUpperCase().replace('0X', '0x'), BigInt(1000))).toBe(true);
  });

  it.each([
    ['inactive', tuple({ active: false }), CREATOR, BigInt(1)],
    ['a different creator', tuple(), WALLET, BigInt(1)],
    ['a pool below the minimum', tuple({ total: BigInt(5) }), CREATOR, BigInt(6)],
  ])('is false for %s', async (_name, result, creator, min) => {
    readContract.mockResolvedValue(result);
    expect(await isContestFundedOnChain(CONTEST, creator, min)).toBe(false);
  });

  it('is false when the read fails', async () => {
    readContract.mockImplementation(async () => { throw new Error('rpc down'); });
    expect(await isContestFundedOnChain(CONTEST, CREATOR, BigInt(1))).toBe(false);
  });
});

describe('voucher nonce checks', () => {
  it('isContestVoucherUsed reports the on-chain flag', async () => {
    readContract.mockResolvedValueOnce(true);
    expect(await isContestVoucherUsed(CONTEST, WALLET, '7')).toBe(true);
    expect(readContract.mock.calls[0][0]).toMatchObject({ functionName: 'isNonceUsed', args: [CONTEST, WALLET, BigInt(7)] });
    readContract.mockResolvedValueOnce(false);
    expect(await isContestVoucherUsed(CONTEST, WALLET, '8')).toBe(false);
  });

  it('isContestVoucherUsed throws when the read fails, so callers cannot mistake it for "unused"', async () => {
    readContract.mockImplementationOnce(async () => { throw new Error('rpc down'); });
    await expect(isContestVoucherUsed(CONTEST, WALLET, '7')).rejects.toThrow('rpc down');
  });

  it('isVoucherUsed reads usedNonces from the token or the badge contract', async () => {
    readContract.mockResolvedValue(true);
    expect(await isVoucherUsed('token', WALLET, '3')).toBe(true);
    expect(await isVoucherUsed('badge', WALLET, '3')).toBe(true);
    const [token, badge] = readContract.mock.calls.map((c) => c[0].address);
    expect(token).toBe(process.env.NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS);
    expect(badge).toBe(process.env.NEXT_PUBLIC_QUIZ_BADGE_ADDRESS);
  });
});

describe('client, signer and nonce helpers', () => {
  it('publicClientFor returns null for a chain the app does not offer', () => {
    expect(publicClientFor(999999)).toBeNull();
    expect(publicClientFor(84532)).not.toBeNull();
  });

  it('getSignerAccount is null without a real key and an account with one', () => {
    const saved = process.env.REWARD_SIGNER_PRIVATE_KEY;
    delete process.env.REWARD_SIGNER_PRIVATE_KEY;
    expect(getSignerAccount()).toBeNull();
    process.env.REWARD_SIGNER_PRIVATE_KEY = '0x_your_signer_private_key';
    expect(getSignerAccount()).toBeNull();
    process.env.REWARD_SIGNER_PRIVATE_KEY = '0x' + '11'.repeat(32);
    expect(getSignerAccount()?.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    if (saved === undefined) delete process.env.REWARD_SIGNER_PRIVATE_KEY;
    else process.env.REWARD_SIGNER_PRIVATE_KEY = saved;
  });

  it('newNonce returns a fresh bigint each time', () => {
    const a = newNonce();
    expect(typeof a).toBe('bigint');
    expect(newNonce()).not.toBe(a);
  });
});

# tests/chain.test.ts
lines:124 exports:
---
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
} from '../lib/services/chain';

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

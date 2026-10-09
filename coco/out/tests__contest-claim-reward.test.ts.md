# tests/contest-claim-reward.test.ts
lines:263 exports:
---
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

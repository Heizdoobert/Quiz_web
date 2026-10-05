# tests/ecosystem-contest-actions.test.ts
lines:375 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMyContestEntries,
  getClaimableContests,
  recordContestRefund,
  syncContestStatus,
  getLiveLists,
  startListAttempt,
} from '../lib/actions/question-list-actions';
import { supabase } from '../lib/supabase/supabase';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';
import { getSessionAccount } from '../lib/services/session';

let mockOnChainContest: {
  creator: string;
  totalPool: bigint;
  remainingPool: bigint;
  createdAt: bigint;
  expiresAt: bigint;
  active: boolean;
} | null = null;

vi.mock('../lib/supabase/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock('../lib/supabase/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('../lib/services/session', () => ({ getSessionAccount: vi.fn() }));
vi.mock('../lib/utils/chain', () => ({
  REWARD_CHAIN_ID: 84532,
  CONTEST_ESCROW_ADDRESS: '0x' + 'c'.repeat(40),
  getContestId: (listId: string, creator?: string) =>
    ('0x' + (listId + (creator || '')).replace(/[^a-f0-9]/gi, '').padEnd(64, '0').slice(0, 64)),
  newNonce: () => BigInt(7),
  getSignerAccount: () => ({ signTypedData: async () => ('0x' + 's'.repeat(130)) }),
  isContestVoucherUsed: async () => false,
  isContestFundedOnChain: async () => true,
  getContestOnChain: async () => mockOnChainContest,
}));

const WALLET = '0x' + 'a'.repeat(40);
const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000f1';
const ACCOUNT = { id: ACCOUNT_ID, wallet: WALLET };

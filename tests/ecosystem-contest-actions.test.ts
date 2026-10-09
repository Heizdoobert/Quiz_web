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
vi.mock('../lib/services/chain', () => ({
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
const LIST_ID = '00000000-0000-4000-8000-000000000001';

type TableStubs = Record<
  string,
  { row?: unknown; rows?: unknown[]; insertError?: unknown; count?: number; queryError?: unknown }
>;

function mockDb(tables: TableStubs) {
  const updates: Record<string, unknown[]> = {};
  const handler = (table: string) => {
    const t = tables[table] ?? {};
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'neq', 'in', 'order', 'limit', 'gte']) {
      chain[m] = () => chain;
    }
    chain.single = async () => ({ data: t.row ?? null, error: t.row ? null : { code: 'PGRST116' } });
    chain.maybeSingle = async () => ({ data: t.row ?? null, error: null });
    chain.insert = async () => ({ error: t.insertError ?? null });
    chain.update = (val: unknown) => {
      (updates[table] ??= []).push(val);
      return chain;
    };
    chain.then = (resolve: (val: unknown) => unknown) =>
      resolve({
        data: t.queryError ? null : t.rows ?? (t.row ? [t.row] : []),
        error: t.queryError ?? null,
        count: t.count ?? null,
      });
    return chain;
  };
  (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(handler);
  (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(handler);
  return { updates };
}

describe('getMyContestEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when account is not signed in', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getMyContestEntries();
    expect(res).toEqual([]);
  });

  it('returns user entries when signed in', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const mockEntries = [
      { id: 'entry-1', list_id: LIST_ID, user_id: ACCOUNT_ID, status: 'completed' },
    ];
    mockDb({ list_entries: { rows: mockEntries } });
    const res = await getMyContestEntries();
    expect(res).toEqual(mockEntries);
  });

  it('handles query error gracefully', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockDb({ list_entries: { queryError: { message: 'DB down' } } });
    const res = await getMyContestEntries();
    expect(res).toEqual([]);
  });
});

describe('getClaimableContests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when account is not signed in', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getClaimableContests();
    expect(res).toEqual([]);
  });

  it('returns empty array when user has no completed entries', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockDb({ list_entries: { rows: [] } });
    const res = await getClaimableContests();
    expect(res).toEqual([]);
  });

  it('returns claimable contests when user has completed entries', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const mockLists = [
      { id: LIST_ID, title: 'Crypto 101', status: 'live' },
    ];
    mockDb({
      list_entries: { rows: [{ list_id: LIST_ID }] },
      question_lists: { rows: mockLists },
      questions: { count: 5 },
      list_confirmations: { count: 3 },
    });
    const res = await getClaimableContests();
    expect(res.length).toBe(1);
    expect(res[0].id).toBe(LIST_ID);
    expect(res[0].questionCount).toBe(5);
  });
});

describe('recordContestRefund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuses invalid uuid', async () => {
    const res = await recordContestRefund('not-a-uuid', '0xtx');
    expect(res).toEqual({ success: false, error: 'Invalid request' });
  });

  it('refuses without signed-in account', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await recordContestRefund(LIST_ID, '0xtx');
    expect(res).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('refuses if account is not the contest owner', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockDb({ question_lists: { row: { owner_user: 'different-user' } } });
    const res = await recordContestRefund(LIST_ID, '0xtx');
    expect(res).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('records contest refund when caller is owner', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const { updates } = mockDb({ question_lists: { row: { owner_user: ACCOUNT_ID } } });
    const res = await recordContestRefund(LIST_ID, '0xtx');
    expect(res).toEqual({ success: true });
    expect(updates.question_lists?.[0]).toMatchObject({
      status: 'refunded',
      refund_tx_hash: '0xtx',
    });
  });
});

describe('syncContestStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnChainContest = null;
  });

  it('ignores invalid uuid', async () => {
    await syncContestStatus('invalid');
    expect(supabaseAdmin!.from).not.toHaveBeenCalled();
  });

  it('returns early if contest is not in live status', async () => {
    mockDb({ question_lists: { row: { status: 'draft' } } });
    await syncContestStatus(LIST_ID);
    expect(supabaseAdmin!.from).toHaveBeenCalledWith('question_lists');
  });

  it('marks contest completed when participant count reaches max', async () => {
    const { updates } = mockDb({
      question_lists: { row: { status: 'live', max_participants: 5 } },
      list_entries: { count: 5 },
    });
    await syncContestStatus(LIST_ID);
    expect(updates.question_lists?.[0]).toEqual({ status: 'completed' });
  });

  it('marks contest completed when on-chain pool is empty', async () => {
    mockOnChainContest = {
      creator: WALLET,
      totalPool: BigInt('100000000000000000000'),
      remainingPool: BigInt(0),
      createdAt: BigInt(100),
      expiresAt: BigInt(100000),
      active: false,
    };
    const { updates } = mockDb({
      question_lists: { row: { status: 'live', max_participants: 10, onchain_contest_id: '0x123' } },
      list_entries: { count: 2 },
    });
    await syncContestStatus(LIST_ID);
    expect(updates.question_lists?.[0]).toEqual({ status: 'completed' });
  });

  it('marks contest refunded when inactive with remaining balance', async () => {
    mockOnChainContest = {
      creator: WALLET,
      totalPool: BigInt('100000000000000000000'),
      remainingPool: BigInt('50000000000000000000'),
      createdAt: BigInt(100),
      expiresAt: BigInt(100000),
      active: false,
    };
    const { updates } = mockDb({
      question_lists: { row: { status: 'live', max_participants: 10, onchain_contest_id: '0x123' } },
      list_entries: { count: 2 },
    });
    await syncContestStatus(LIST_ID);
    expect(updates.question_lists?.[0]).toEqual({ status: 'refunded' });
  });

  it('marks contest expired when active but expiresAt is in the past', async () => {
    mockOnChainContest = {
      creator: WALLET,
      totalPool: BigInt('100000000000000000000'),
      remainingPool: BigInt('50000000000000000000'),
      createdAt: BigInt(100),
      expiresAt: BigInt(Math.floor(Date.now() / 1000) - 100),
      active: true,
    };
    const { updates } = mockDb({
      question_lists: { row: { status: 'live', max_participants: 10, onchain_contest_id: '0x123' } },
      list_entries: { count: 2 },
    });
    await syncContestStatus(LIST_ID);
    expect(updates.question_lists?.[0]).toEqual({ status: 'expired' });
  });
});

describe('getLiveLists expiry filter', () => {
  it('filters expired lists and attaches meta for active ones', async () => {
    const expiredList = {
      id: '00000000-0000-4000-8000-00000000000a',
      title: 'Expired List',
      status: 'live',
      expires_at: new Date(Date.now() - 3600000).toISOString(),
    };
    const activeList = {
      id: '00000000-0000-4000-8000-00000000000b',
      title: 'Active List',
      status: 'live',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };
    mockDb({
      question_lists: { rows: [expiredList, activeList] },
      questions: { count: 5 },
      list_confirmations: { count: 3 },
    });
    const res = await getLiveLists();
    expect(res.length).toBe(1);
    expect(res[0].id).toBe(activeList.id);
  });
});

describe('startListAttempt ecosystem branches', () => {
  it('returns previous result if entry was already completed or claimed', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockDb({
      question_lists: { row: { id: LIST_ID, status: 'completed', owner_user: 'creator-user' } },
      list_entries: {
        row: { status: 'completed', correct_count: 5, reward_amount: '5000000000000000000' },
      },
    });
    const res = await startListAttempt(LIST_ID);
    expect(res.success).toBe(true);
    expect(res.result).toEqual({
      correctCount: 5,
      rewardAmount: '5000000000000000000',
      claimed: false,
    });
  });

  it('refuses if on-chain contest has no remaining pool', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockOnChainContest = {
      creator: WALLET,
      totalPool: BigInt('100000000000000000000'),
      remainingPool: BigInt(0),
      createdAt: BigInt(100),
      expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600),
      active: true,
    };
    mockDb({
      question_lists: {
        row: {
          id: LIST_ID,
          status: 'live',
          owner_user: 'creator-user',
          max_participants: 10,
          onchain_contest_id: '0x123',
        },
      },
      list_entries: { row: null, count: 0 },
    });
    const res = await startListAttempt(LIST_ID);
    expect(res.success).toBe(false);
    expect(res.error).toBe('This contest has no remaining reward pool.');
  });

  it('handles empty questions list cleanly without throwing', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockOnChainContest = {
      creator: WALLET,
      totalPool: BigInt('100000000000000000000'),
      remainingPool: BigInt('100000000000000000000'),
      createdAt: BigInt(100),
      expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600),
      active: true,
    };
    mockDb({
      question_lists: {
        row: {
          id: LIST_ID,
          status: 'live',
          owner_user: 'creator-user',
          max_participants: 10,
          onchain_contest_id: '0x123',
        },
      },
      list_entries: { row: null, count: 0 },
      questions: { rows: [] },
    });
    const res = await startListAttempt(LIST_ID);
    expect(res.success).toBe(true);
    expect(res.questions).toEqual([]);
    expect(res.answeredQuestionIds).toEqual([]);
  });
});

describe('attachListMeta reward math', () => {
  it('calculates perQuestionReward dividing pool by max_participants and questionCount', async () => {
    const list = {
      id: LIST_ID,
      title: 'Reward List',
      status: 'live',
      reward_pool_tokens: '100000000000000000000', // 100 tokens
      max_participants: 10,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };
    mockDb({
      question_lists: { rows: [list] },
      questions: { count: 5 },
      question_list_confirmations: { rows: [] },
    });
    const res = await getLiveLists();
    expect(res).toHaveLength(1);
    // 100 tokens / 10 participants / 5 questions = 2 tokens = 2000000000000000000
    expect(res[0].perQuestionReward).toBe('2000000000000000000');
  });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitAnswer } from '../lib/actions/quiz-actions';
import {
  createList,
  confirmList,
  startContest,
  startListAttempt,
  completeListAttempt,
  claimListReward,
} from '../lib/actions/question-list-actions';
import { supabaseAdmin } from '../lib/supabase-admin';
import { getSessionWallet } from '../lib/wallet-session';
import { validateQuestionInput } from '../lib/validation';

let mockIsContestFunded = true;

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock('../lib/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('../lib/wallet-session', () => ({ getSessionWallet: vi.fn() }));
vi.mock('../lib/chain', () => ({
  REWARD_CHAIN_ID: 84532,
  CONTEST_ESCROW_ADDRESS: '0x' + 'c'.repeat(40),
  getContestId: (listId: string, creator?: string) =>
    ('0x' + (listId + (creator || '')).replace(/[^a-f0-9]/gi, '').padEnd(64, '0').slice(0, 64)),
  newNonce: () => BigInt(7),
  getSignerAccount: () => ({ signTypedData: async () => ('0x' + 's'.repeat(130)) }),
  isContestVoucherUsed: async () => false,
  isContestFundedOnChain: async () => mockIsContestFunded,
  getContestOnChain: async () => null,
}));

const WALLET = '0x' + 'a'.repeat(40);
const LIST_ID = '00000000-0000-4000-8000-000000000001';
const Q_ID = '00000000-0000-4000-8000-000000000002';

// A chainable query stub: every builder method returns the chain, and the terminal
// calls (single, maybeSingle, insert, await) resolve to what the test gives per table.
function mockTables(
  tables: Record<string, { row?: unknown; rows?: unknown[]; insertError?: unknown; count?: number }>
) {
  const inserts: Record<string, unknown[]> = {};
  (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
    const t = tables[table] ?? {};
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'neq', 'in', 'order', 'limit']) chain[m] = () => chain;
    chain.single = async () => ({ data: t.row ?? null, error: t.row ? null : { code: 'PGRST116' } });
    chain.maybeSingle = async () => ({ data: t.row ?? null, error: null });
    chain.insert = async (row: unknown) => {
      (inserts[table] ??= []).push(row);
      return { error: t.insertError ?? null };
    };
    chain.update = () => chain;
    chain.then = (resolve: (val: unknown) => unknown) =>
      resolve({
        data: t.rows ?? (t.row ? [t.row] : []),
        error: null,
        count: t.count ?? (t.rows ? t.rows.length : (t.row ? 1 : 0)),
      });
    return chain;
  });
  return inserts;
}

describe('submitAnswer guards', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reveals nothing for a contest question without an in-progress entry', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET);
    const inserts = mockTables({
      questions: { row: { correct_index: 2, explanation: 'secret', status: 'pending', list_id: LIST_ID } },
      list_entries: { row: { status: 'reviewer' } },
    });
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 2 });
    expect(res).toEqual({ isCorrect: false, correctIndex: 0, explanation: null, recorded: false });
    expect(inserts.quiz_results).toBeUndefined();
  });

  it('records a contest answer for a wallet playing that contest', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET);
    const inserts = mockTables({
      questions: { row: { correct_index: 2, explanation: 'why', status: 'pending', list_id: LIST_ID, created_by: '0xowner' } },
      list_entries: { row: { status: 'in_progress' } },
    });
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 2 });
    expect(res.isCorrect).toBe(true);
    expect(res.recorded).toBe(true);
    expect(inserts.quiz_results).toHaveLength(1);
  });

  it('reveals nothing for a pending question outside any list', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET);
    mockTables({ questions: { row: { correct_index: 1, explanation: 'secret', status: 'pending', list_id: null } } });
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(res.explanation).toBeNull();
    expect(res.recorded).toBe(false);
  });

  it('does not score a wallet on a question it wrote', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET);
    const inserts = mockTables({
      questions: { row: { correct_index: 1, explanation: 'why', status: 'verified', list_id: null, created_by: WALLET } },
    });
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(res.isCorrect).toBe(true);
    expect(res.recorded).toBe(false);
    expect(inserts.quiz_results).toBeUndefined();
  });
});

describe('question list guards', () => {
  beforeEach(() => vi.resetAllMocks());

  it('refuses every write without a signed-in wallet, before touching the database', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect((await createList({ title: 'A valid title' })).success).toBe(false);
    expect((await confirmList(LIST_ID)).success).toBe(false);
    expect((await startListAttempt(LIST_ID)).success).toBe(false);
    expect(supabaseAdmin!.from).not.toHaveBeenCalled();
  });

  it('refuses claimListReward without a signed-in wallet', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'Sign in with your wallet first.' });
  });

  it('refuses claimListReward for invalid uuid', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET);
    expect(await claimListReward('not-a-valid-uuid')).toEqual({ error: 'Invalid contest ID.' });
  });

  it('refuses claimListReward if contest entry is not completed', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET);
    mockTables({
      list_entries: { row: { status: 'in_progress', reward_amount: '10000000000000000000' } },
    });
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'Contest attempt has not been completed.' });
  });

  it('refuses claimListReward if already claimed', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET);
    mockTables({
      list_entries: { row: { status: 'claimed', reward_amount: '10000000000000000000' } },
    });
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'Reward has already been claimed.' });
  });

  it('refuses claimListReward if zero rewards earned', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET);
    mockTables({
      list_entries: { row: { status: 'completed', reward_amount: '0' } },
    });
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'No rewards earned for this contest.' });
  });

  it('issues an EIP-712 contest voucher for a completed entry', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET);
    const inserts = mockTables({
      question_lists: { row: { owner_wallet: '0xowner', status: 'live' } },
      list_entries: { row: { status: 'completed', reward_amount: '10000000000000000000' } },
    });
    const res = await claimListReward(LIST_ID);
    expect(res).toMatchObject({ recipient: WALLET, amount: '10000000000000000000' });
    expect((res as { contestId?: string }).contestId).toBeDefined();
    expect((res as { signature?: string }).signature).toMatch(/^0x/);
    expect(inserts.reward_claims).toHaveLength(1);
  });

  it('refuses startContest if contest is not funded on-chain', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET);
    mockIsContestFunded = false;
    mockTables({
      question_lists: { row: { owner_wallet: WALLET, status: 'approved' } },
    });
    const res = await startContest(LIST_ID, 100);
    expect(res).toEqual({ success: false, error: 'Contest pool has not been funded on-chain.' });
  });

  it('allows startContest when contest is verified funded on-chain', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET);
    mockIsContestFunded = true;
    mockTables({
      question_lists: { row: { owner_wallet: WALLET, status: 'approved' } },
    });
    const res = await startContest(LIST_ID, 100);
    expect(res.success).toBe(true);
  });

  it('refuses startListAttempt when max participants cap is reached', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET);
    mockTables({
      question_lists: { row: { owner_wallet: '0xother', status: 'live', max_participants: 5 } },
      list_entries: { count: 5 },
    });
    const res = await startListAttempt(LIST_ID);
    expect(res).toEqual({ success: false, error: 'This contest has reached its participant limit.' });
  });

  it('completeListAttempt divides pool by max_participants to prevent pool drain', async () => {
    (getSessionWallet as ReturnType<typeof vi.fn>).mockResolvedValue(WALLET);
    const poolTokens = (BigInt(100) * BigInt(10) ** BigInt(18)).toString();
    mockTables({
      question_lists: { row: { reward_pool_tokens: poolTokens, max_participants: 10 } },
      questions: { rows: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q4' }, { id: 'q5' }] },
      quiz_results: { rows: [{ is_correct: true }, { is_correct: true }, { is_correct: true }] },
      list_entries: { row: { list_id: LIST_ID } },
    });
    const res = await completeListAttempt(LIST_ID);
    expect(res.success).toBe(true);
    expect(res.correctCount).toBe(3);
    const expectedReward = (BigInt(6) * BigInt(10) ** BigInt(18)).toString();
    expect(res.rewardAmount).toBe(expectedReward);
  });
});

describe('validateQuestionInput', () => {
  const base = { prompt: 'A valid question prompt?', options: ['a', 'b', 'c', 'd'], explanation: 'An explanation that is long enough.' };

  it('rejects a fractional or out-of-range correct index', () => {
    expect(validateQuestionInput({ ...base, correctIndex: 1.5 }).valid).toBe(false);
    expect(validateQuestionInput({ ...base, correctIndex: 4 }).valid).toBe(false);
    expect(validateQuestionInput({ ...base, correctIndex: 3 }).valid).toBe(true);
  });

  it('rejects over-length fields', () => {
    expect(validateQuestionInput({ ...base, correctIndex: 0, prompt: 'x'.repeat(301) }).valid).toBe(false);
    expect(validateQuestionInput({ ...base, correctIndex: 0, options: ['y'.repeat(121), 'b', 'c', 'd'] }).valid).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitAnswer, getAnswerHistory } from '../lib/actions/quiz-actions';
import { createQuestion, disputeQuestion, get5050EliminatedIndices } from '../lib/actions/question-actions';
import {
  createList,
  updateList,
  confirmList,
  startContest,
  startListAttempt,
  completeListAttempt,
  claimListReward,
  getMyLists,
  getListsPendingReview,
  getListDetail,
} from '../lib/actions/question-list-actions';
import { supabase } from '../lib/supabase/supabase';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';
import { getSessionAccount } from '../lib/services/session';
import { validateQuestionInput } from '../lib/utils/validation';
import { REQUIRED_CONFIRMATIONS } from '../lib/constants/list-constants';

let mockIsContestFunded = true;

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
  isContestFundedOnChain: async () => mockIsContestFunded,
  getContestOnChain: async () =>
    mockIsContestFunded
      ? {
          creator: WALLET,
          totalPool: BigInt('1000000000000000000000000'),
          remainingPool: BigInt('1000000000000000000000000'),
          createdAt: BigInt(Math.floor(Date.now() / 1000) - 3600),
          expiresAt: BigInt(Math.floor(Date.now() / 1000) + 86400),
          active: true,
        }
      : null,
}));

const WALLET = '0x' + 'a'.repeat(40);
const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000f1';
const ACCOUNT = { id: ACCOUNT_ID, wallet: WALLET };
const EMAIL_ACCOUNT_ID = '00000000-0000-4000-8000-0000000000e1';
const EMAIL_ACCOUNT = { id: EMAIL_ACCOUNT_ID, wallet: null };
const OTHER_ACCOUNT_ID = '00000000-0000-4000-8000-0000000000f2';
const LIST_ID = '00000000-0000-4000-8000-000000000001';
const Q_ID = '00000000-0000-4000-8000-000000000002';

type TableStubs = Record<
  string,
  { row?: unknown; rows?: unknown[]; insertError?: unknown; count?: number; queryError?: unknown }
>;

// A chainable query stub: every builder method returns the chain, and the terminal
// calls (single, maybeSingle, insert, await) resolve to what the test gives per table.
function stubFrom(fromMock: ReturnType<typeof vi.fn>, tables: TableStubs) {
  const inserts: Record<string, unknown[]> & { _updates?: Record<string, unknown[]> } = {};
  const updates: Record<string, unknown[]> = {};
  inserts._updates = updates;
  fromMock.mockImplementation((table: string) => {
    const t = tables[table] ?? {};
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'neq', 'in', 'order', 'limit', 'gte']) chain[m] = () => chain;
    chain.single = async () => ({ data: t.row ?? null, error: t.row ? null : { code: 'PGRST116' } });
    chain.maybeSingle = async () => ({ data: t.row ?? null, error: null });
    chain.insert = async (row: unknown) => {
      (inserts[table] ??= []).push(row);
      return { error: t.insertError ?? null };
    };
    chain.upsert = async (row: unknown) => {
      (inserts[table] ??= []).push(row);
      return { error: null };
    };
    chain.update = (val: unknown) => {
      (updates[table] ??= []).push(val);
      return chain;
    };
    chain.then = (resolve: (val: unknown) => unknown) =>
      resolve({
        data: t.queryError ? null : t.rows ?? (t.row ? [t.row] : []),
        error: t.queryError ?? null,
        count: t.count ?? (t.rows ? t.rows.length : (t.row ? 1 : 0)),
      });
    return chain;
  });
  return inserts;
}

function mockTables(tables: TableStubs) {
  return stubFrom(supabaseAdmin!.from as ReturnType<typeof vi.fn>, tables);
}

// getMyLists, getListsPendingReview and getListDetail read through the public client.
function mockPublicTables(tables: TableStubs) {
  return stubFrom(supabase.from as ReturnType<typeof vi.fn>, tables);
}

describe('submitAnswer guards', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reveals nothing when the question does not exist', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({});
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 0 });
    expect(res).toEqual({ isCorrect: false, correctIndex: 0, explanation: null, recorded: false, notSavedReason: 'error' });
  });

  it('reports a generic error instead of already-answered on any other insert failure', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      questions: { row: { correct_index: 1, explanation: 'why', status: 'verified', list_id: null, created_by: '0xowner' } },
      quiz_results: { insertError: { code: '500', message: 'db unavailable' } },
    });
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(res.recorded).toBe(false);
    expect(res.notSavedReason).toBe('error');
  });

  it('fails closed when the exchange throws partway through', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('session lookup blew up'));
    mockTables({
      questions: { row: { correct_index: 1, explanation: 'why', status: 'verified', list_id: null, created_by: '0xowner' } },
    });
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(res).toEqual({ isCorrect: false, correctIndex: 0, explanation: null, recorded: false, notSavedReason: 'error' });
  });

  it('reveals nothing for a contest question without an in-progress entry', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const inserts = mockTables({
      questions: { row: { correct_index: 2, explanation: 'secret', status: 'pending', list_id: LIST_ID } },
      list_entries: { row: { status: 'reviewer' } },
    });
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 2 });
    expect(res).toEqual({ isCorrect: false, correctIndex: 0, explanation: null, recorded: false, notSavedReason: 'error' });
    expect(inserts.quiz_results).toBeUndefined();
  });

  it('records a contest answer for an account playing that contest', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
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
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({ questions: { row: { correct_index: 1, explanation: 'secret', status: 'pending', list_id: null } } });
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(res.explanation).toBeNull();
    expect(res.recorded).toBe(false);
    expect(res.notSavedReason).toBe('error');
  });

  it('does not score an account on a question it wrote', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const inserts = mockTables({
      questions: {
        row: { correct_index: 1, explanation: 'why', status: 'verified', list_id: null, created_by_user: ACCOUNT_ID },
      },
    });
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(res.isCorrect).toBe(true);
    expect(res.recorded).toBe(false);
    expect(res.notSavedReason).toBe('own-question');
    expect(inserts.quiz_results).toBeUndefined();
  });

  it('does not count a guest answer, but still shows the result', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const inserts = mockTables({
      questions: { row: { correct_index: 1, explanation: 'why', status: 'verified', list_id: null, created_by: '0xowner' } },
    });
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(res.isCorrect).toBe(true);
    expect(res.recorded).toBe(false);
    expect(res.notSavedReason).toBe('signed-out');
    expect(inserts.quiz_results).toBeUndefined();
  });

  it('reports already-answered instead of a generic error on a repeat insert', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      questions: { row: { correct_index: 1, explanation: 'why', status: 'verified', list_id: null, created_by: '0xowner' } },
      quiz_results: { insertError: { code: '23505', message: 'duplicate key' } },
    });
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(res.recorded).toBe(false);
    expect(res.notSavedReason).toBe('already-answered');
  });
});

describe('getAnswerHistory', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns the session account\'s saved answers, newest first', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      quiz_results: {
        rows: [
          { question_id: Q_ID, is_correct: true, questions: { prompt: 'What is Base?' } },
        ],
      },
    });
    const history = await getAnswerHistory();
    expect(history).toEqual([{ questionId: Q_ID, prompt: 'What is Base?', isCorrect: true }]);
  });

  it('returns nothing with no session', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const history = await getAnswerHistory();
    expect(history).toEqual([]);
    expect(supabaseAdmin!.from).not.toHaveBeenCalled();
  });

  it('returns nothing when the query itself errors', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({ quiz_results: { queryError: { message: 'db unavailable' } } });
    const history = await getAnswerHistory();
    expect(history).toEqual([]);
  });

  it('fails closed when the lookup throws', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    const history = await getAnswerHistory();
    expect(history).toEqual([]);
  });
});

describe('question list guards', () => {
  beforeEach(() => vi.resetAllMocks());

  it('refuses every write without a signed-in account, before touching the database', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect((await createList({ title: 'A valid title' })).success).toBe(false);
    expect((await confirmList(LIST_ID)).success).toBe(false);
    expect((await startListAttempt(LIST_ID)).success).toBe(false);
    expect(supabaseAdmin!.from).not.toHaveBeenCalled();
  });

  it('confirms a list the account does not own and reports approval once the threshold is met', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const inserts = mockTables({
      question_lists: { row: { owner_user: OTHER_ACCOUNT_ID, status: 'submitted' } },
      list_entries: {},
      question_list_confirmations: { count: REQUIRED_CONFIRMATIONS },
    });
    const res = await confirmList(LIST_ID);
    expect(res).toEqual({ success: true, approved: true });
    expect(inserts.question_list_confirmations![0]).toMatchObject({
      list_id: LIST_ID,
      confirmer_user: ACCOUNT_ID,
      confirmer_wallet: WALLET,
    });
  });

  it('refuses to confirm a list the account owns itself', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({ question_lists: { row: { owner_user: ACCOUNT_ID, status: 'submitted' } } });
    const res = await confirmList(LIST_ID);
    expect(res).toEqual({ success: false, error: 'You cannot confirm your own list.' });
  });

  it('refuses updateList for a list owned by a different account', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({ question_lists: { row: { id: LIST_ID, owner_user: OTHER_ACCOUNT_ID, status: 'draft' } } });
    const res = await updateList(LIST_ID, { title: 'A new valid title' });
    expect(res).toEqual({ success: false, error: 'Only the owner can modify this list.' });
  });

  it('refuses startContest for a list owned by a different account', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({ question_lists: { row: { owner_user: OTHER_ACCOUNT_ID, status: 'approved' } } });
    const res = await startContest(LIST_ID, 100);
    expect(res).toEqual({ success: false, error: 'Only the owner can start this contest.' });
  });

  it('refuses startListAttempt for the account\'s own contest', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({ question_lists: { row: { status: 'live', owner_user: ACCOUNT_ID, max_participants: 10 } } });
    const res = await startListAttempt(LIST_ID);
    expect(res).toEqual({ success: false, error: 'You cannot play your own contest.' });
  });

  it('refuses claimListReward without a signed-in account', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'Sign in to manage your lists.' });
  });

  it('refuses claimListReward for an account with no wallet', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(EMAIL_ACCOUNT);
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'Add a wallet to your account to play contests.' });
  });

  it('refuses claimListReward for invalid uuid', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    expect(await claimListReward('not-a-valid-uuid')).toEqual({ error: 'Invalid contest ID.' });
  });

  it('refuses claimListReward if contest entry is not completed', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      list_entries: { row: { status: 'in_progress', reward_amount: '10000000000000000000' } },
    });
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'Contest attempt has not been completed.' });
  });

  it('refuses claimListReward if already claimed', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      list_entries: { row: { status: 'claimed', reward_amount: '10000000000000000000' } },
    });
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'Reward has already been claimed.' });
  });

  it('refuses claimListReward if zero rewards earned', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      list_entries: { row: { status: 'completed', reward_amount: '0' } },
    });
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'No rewards earned for this contest.' });
  });

  it('issues an EIP-712 contest voucher for a completed entry', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const inserts = mockTables({
      question_lists: { row: { owner_wallet: '0xowner', status: 'live' } },
      list_entries: { row: { status: 'completed', reward_amount: '10000000000000000000' } },
    });
    const res = await claimListReward(LIST_ID);
    expect(res).toMatchObject({ recipient: WALLET, amount: '10000000000000000000' });
    expect((res as { contestId?: string }).contestId).toBeDefined();
    expect((res as { signature?: string }).signature).toMatch(/^0x/);
    expect(inserts.reward_claims![0]).toMatchObject({ user_id: ACCOUNT_ID, wallet_address: WALLET });
  });

  it('uses list.onchain_contest_id when owner_wallet is null during claimListReward', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      question_lists: { row: { owner_wallet: null, onchain_contest_id: '0xsavedcontestid', status: 'live' } },
      list_entries: { row: { status: 'completed', reward_amount: '10000000000000000000' } },
    });
    const res = await claimListReward(LIST_ID);
    expect(res).toMatchObject({
      recipient: WALLET,
      contestId: '0xsavedcontestid',
      amount: '10000000000000000000',
    });
  });

  it('refuses startContest if contest is not funded on-chain', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockIsContestFunded = false;
    mockTables({
      question_lists: { row: { owner_user: ACCOUNT_ID, status: 'approved' } },
    });
    const res = await startContest(LIST_ID, 100);
    expect(res).toEqual({ success: false, error: 'Contest pool has not been funded on-chain.' });
  });

  it('allows startContest when contest is verified funded on-chain and updates owner_wallet', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockIsContestFunded = true;
    const inserts = mockTables({
      question_lists: { row: { owner_user: ACCOUNT_ID, status: 'approved' } },
    });
    const res = await startContest(LIST_ID, 100);
    expect(res.success).toBe(true);
    expect(inserts._updates?.question_lists?.[0]).toMatchObject({
      status: 'live',
      owner_wallet: WALLET,
    });
  });

  it('refuses startContest for an account with no wallet', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(EMAIL_ACCOUNT);
    const res = await startContest(LIST_ID, 100);
    expect(res).toEqual({
      success: false,
      error: 'Add a wallet to your account to play contests.',
      code: 'WALLET_REQUIRED',
    });
  });

  it('refuses startListAttempt for an account with no wallet', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(EMAIL_ACCOUNT);
    const res = await startListAttempt(LIST_ID);
    expect(res).toEqual({
      success: false,
      error: 'Add a wallet to your account to play contests.',
      code: 'WALLET_REQUIRED',
    });
  });

  it('refuses startListAttempt when max participants cap is reached', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      question_lists: { row: { owner_user: OTHER_ACCOUNT_ID, status: 'live', max_participants: 5 } },
      list_entries: { count: 5 },
    });
    const res = await startListAttempt(LIST_ID);
    expect(res).toEqual({ success: false, error: 'This contest has reached its participant limit.' });
  });

  it('completeListAttempt divides pool by max_participants to prevent pool drain', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
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

describe('question list reads', () => {
  beforeEach(() => vi.resetAllMocks());

  it('getMyLists returns nothing without a session', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await getMyLists()).toEqual([]);
  });

  it("getMyLists returns the signed-in account's own lists", async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockPublicTables({
      question_lists: { rows: [{ id: LIST_ID, title: 'Mine', reward_pool_tokens: '0' }] },
      question_list_confirmations: { rows: [] },
    });
    mockTables({ questions: { count: 2 } });
    const lists = await getMyLists();
    expect(lists).toMatchObject([{ id: LIST_ID, questionCount: 2 }]);
  });

  it('getListsPendingReview returns nothing without a session', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await getListsPendingReview()).toEqual([]);
  });

  it("getListsPendingReview marks lists the account already confirmed", async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockPublicTables({
      question_lists: { rows: [{ id: LIST_ID, title: 'Other', reward_pool_tokens: '0' }] },
      question_list_confirmations: { rows: [{ confirmer_user: ACCOUNT_ID }] },
    });
    mockTables({ questions: { count: 3 } });
    const lists = await getListsPendingReview();
    expect(lists).toMatchObject([{ id: LIST_ID, hasConfirmed: true }]);
  });

  it('getListDetail returns full questions for the owner', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockPublicTables({
      question_lists: { row: { id: LIST_ID, owner_user: ACCOUNT_ID, status: 'draft', reward_pool_tokens: '0' } },
      question_list_confirmations: { rows: [] },
    });
    mockTables({ questions: { rows: [{ id: 'q1', prompt: 'p', correct_index: 0 }], count: 1 } });
    const detail = await getListDetail(LIST_ID);
    expect(detail?.list.id).toBe(LIST_ID);
    expect(detail?.questions).toHaveLength(1);
  });
});

describe('createQuestion guards', () => {
  beforeEach(() => vi.resetAllMocks());
  const params = {
    prompt: 'A valid question prompt?',
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 0,
    explanation: 'An explanation that is long enough.',
  };

  it('refuses without a signed-in account, before touching the database', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await createQuestion(params);
    expect(res.success).toBe(false);
    expect(supabaseAdmin!.from).not.toHaveBeenCalled();
  });

  it('creates a question for an email account with no wallet, keyed by account id', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(EMAIL_ACCOUNT);
    const inserts = mockTables({ questions: { count: 0 } });
    const res = await createQuestion(params);
    expect(res.success).toBe(true);
    expect(inserts.questions![0]).toMatchObject({ created_by_user: EMAIL_ACCOUNT_ID, created_by: null });
  });

  it('enforces the 5-per-day cap by account id', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({ questions: { count: 5 } });
    const res = await createQuestion(params);
    expect(res).toEqual({ success: false, error: { code: 'RATE_LIMITED', message: 'You can add up to 5 questions per day.' } });
  });
});

describe('disputeQuestion guards', () => {
  beforeEach(() => vi.resetAllMocks());

  it('refuses without a signed-in account, before touching the database', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await disputeQuestion({ questionId: Q_ID, reason: 'incorrect_answer' });
    expect(res.success).toBe(false);
    expect(supabaseAdmin!.from).not.toHaveBeenCalled();
  });

  it('refuses to report a question the account never answered', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({ quiz_results: {} });
    const res = await disputeQuestion({ questionId: Q_ID, reason: 'incorrect_answer' });
    expect(res).toEqual({ success: false, error: { code: 'UNAUTHORIZED', message: 'Answer this question before reporting it.' } });
  });

  it('records a dispute keyed by account id and quarantines at the threshold', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const inserts = mockTables({
      quiz_results: { row: { id: 'r1' } },
      question_disputes: { count: 3 },
    });
    const res = await disputeQuestion({ questionId: Q_ID, reason: 'incorrect_answer' });
    expect(res).toEqual({ success: true, data: { quarantined: true } });
    expect(inserts.question_disputes![0]).toMatchObject({
      question_id: Q_ID,
      reporter_user: ACCOUNT_ID,
      reporter_wallet: WALLET,
    });
  });

  it('reports an already-reported error instead of a generic one on a duplicate insert', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      quiz_results: { row: { id: 'r1' } },
      question_disputes: { insertError: { code: '23505' } },
    });
    const res = await disputeQuestion({ questionId: Q_ID, reason: 'incorrect_answer' });
    expect(res).toEqual({ success: false, error: { code: 'CONFLICT', message: 'You have already reported this question.' } });
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

describe('get5050EliminatedIndices', () => {
  it('returns two distinct wrong indices without eliminating the correct index', async () => {
    mockTables({ questions: { row: { correct_index: 2 } } });
    const eliminated = await get5050EliminatedIndices('q-test-123');
    expect(eliminated).toHaveLength(2);
    expect(eliminated).not.toContain(2);
    expect(eliminated[0]).toBeLessThan(eliminated[1]);
  });

  it('is deterministic for the same question ID', async () => {
    mockTables({ questions: { row: { correct_index: 0 } } });
    const run1 = await get5050EliminatedIndices('q-deterministic');
    const run2 = await get5050EliminatedIndices('q-deterministic');
    expect(run1).toEqual(run2);
  });

  it('returns empty array when question is not found or correct_index is invalid', async () => {
    mockTables({ questions: { row: null } });
    expect(await get5050EliminatedIndices('q-not-found')).toEqual([]);

    mockTables({ questions: { row: { correct_index: 99 } } });
    expect(await get5050EliminatedIndices('q-invalid-index')).toEqual([]);
  });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitAnswer, getAnswerHistory } from '../lib/actions/quiz-actions';
import { createQuestion, disputeQuestion, get5050EliminatedIndices } from '../lib/actions/question-actions';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';
import { getSessionAccount } from '../lib/services/session';
import { validateQuestionInput } from '../lib/utils/validation';

let mockAnswerLimitHit = false;
const answerLimitCalls: unknown[][] = [];

vi.mock('../lib/supabase/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('../lib/services/session', () => ({ getSessionAccount: vi.fn() }));
vi.mock('../lib/services/rate-limit', () => ({
  allowAttemptFromIp: async (...args: unknown[]) => {
    answerLimitCalls.push(args);
    return !mockAnswerLimitHit;
  },
}));

const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000f1';
const ACCOUNT = { id: ACCOUNT_ID };
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

describe('submitAnswer guards', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAnswerLimitHit = false;
    answerLimitCalls.length = 0;
  });

  it('reveals nothing once the caller is over the per-IP answer limit, signed in or not', async () => {
    mockAnswerLimitHit = true;
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    mockTables({
      questions: { row: { correct_index: 1, explanation: 'why', status: 'verified' } },
    });
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(res).toEqual({ isCorrect: false, correctIndex: 0, explanation: null, recorded: false, notSavedReason: 'rate-limited' });
    expect(supabaseAdmin!.from).not.toHaveBeenCalled();
    expect(answerLimitCalls).toEqual([['submit-answer-ip', 120, 3600]]);
  });

  it('rejects a malformed question id before the limiter or the database', async () => {
    const res = await submitAnswer({ questionId: 'not-a-uuid', answerIndex: 1 });
    expect(res.notSavedReason).toBe('error');
    expect(supabaseAdmin!.from).not.toHaveBeenCalled();
    expect(answerLimitCalls).toEqual([]);
  });

  it('reveals nothing when the question does not exist', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({});
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 0 });
    expect(res).toEqual({ isCorrect: false, correctIndex: 0, explanation: null, recorded: false, notSavedReason: 'error' });
  });

  it('reports a generic error instead of already-answered on any other insert failure', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      questions: { row: { correct_index: 1, explanation: 'why', status: 'verified' } },
      quiz_results: { insertError: { code: '500', message: 'db unavailable' } },
    });
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(res.recorded).toBe(false);
    expect(res.notSavedReason).toBe('error');
  });

  it('fails closed when the exchange throws partway through', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('session lookup blew up'));
    mockTables({
      questions: { row: { correct_index: 1, explanation: 'why', status: 'verified' } },
    });
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(res).toEqual({ isCorrect: false, correctIndex: 0, explanation: null, recorded: false, notSavedReason: 'error' });
  });

  it('reveals nothing for a question that is not verified', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({ questions: { row: { correct_index: 1, explanation: 'secret', status: 'pending' } } });
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(res.explanation).toBeNull();
    expect(res.recorded).toBe(false);
    expect(res.notSavedReason).toBe('error');
  });

  it('does not score an account on a question it wrote', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const inserts = mockTables({
      questions: {
        row: { correct_index: 1, explanation: 'why', status: 'verified', created_by_user: ACCOUNT_ID },
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
      questions: { row: { correct_index: 1, explanation: 'why', status: 'verified' } },
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
      questions: { row: { correct_index: 1, explanation: 'why', status: 'verified' } },
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

  it('creates a question keyed by account id', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const inserts = mockTables({ questions: { count: 0 } });
    const res = await createQuestion(params);
    expect(res.success).toBe(true);
    expect(inserts.questions![0]).toMatchObject({ created_by_user: ACCOUNT_ID });
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
  const verified = (correct_index: number) => ({ correct_index, status: 'verified' });

  it('returns two distinct wrong indices without eliminating the correct index', async () => {
    mockTables({ questions: { row: verified(2) } });
    const eliminated = await get5050EliminatedIndices(Q_ID);
    expect(eliminated).toHaveLength(2);
    expect(eliminated).not.toContain(2);
    expect(eliminated[0]).toBeLessThan(eliminated[1]);
  });

  it('is deterministic for the same question ID', async () => {
    mockTables({ questions: { row: verified(0) } });
    const run1 = await get5050EliminatedIndices(Q_ID);
    const run2 = await get5050EliminatedIndices(Q_ID);
    expect(run1).toEqual(run2);
  });

  it('returns empty array when question is not found or correct_index is invalid', async () => {
    mockTables({ questions: { row: null } });
    expect(await get5050EliminatedIndices(Q_ID)).toEqual([]);

    mockTables({ questions: { row: verified(99) } });
    expect(await get5050EliminatedIndices(Q_ID)).toEqual([]);
  });

  it.each([
    ['a pending question', { correct_index: 1, status: 'pending' }],
    ['a quarantined question', { correct_index: 1, status: 'quarantined' }],
  ])('reveals nothing for %s', async (_name, row) => {
    mockTables({ questions: { row } });
    expect(await get5050EliminatedIndices(Q_ID)).toEqual([]);
  });

  it('answers a malformed id without touching the database', async () => {
    mockTables({ questions: { row: verified(2) } });
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockClear();
    expect(await get5050EliminatedIndices('not-a-uuid')).toEqual([]);
    expect(supabaseAdmin!.from).not.toHaveBeenCalled();
  });
});

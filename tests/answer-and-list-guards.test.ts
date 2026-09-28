import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitAnswer } from '../lib/actions/quiz-actions';
import { createList, confirmList, startListAttempt, claimListReward } from '../lib/actions/question-list-actions';
import { supabaseAdmin } from '../lib/supabase-admin';
import { getSessionWallet } from '../lib/wallet-session';
import { validateQuestionInput } from '../lib/validation';

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock('../lib/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('../lib/wallet-session', () => ({ getSessionWallet: vi.fn() }));

const WALLET = '0x' + 'a'.repeat(40);
const LIST_ID = '00000000-0000-4000-8000-000000000001';
const Q_ID = '00000000-0000-4000-8000-000000000002';

// A chainable query stub: every builder method returns the chain, and the terminal
// calls (single, maybeSingle, insert) resolve to what the test gives per table.
function mockTables(tables: Record<string, { row?: unknown; insertError?: unknown }>) {
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

  it('keeps contest payouts paused', async () => {
    expect(await claimListReward(LIST_ID)).toEqual({ error: 'Contest payouts are paused.' });
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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  rateQuestion,
  addComment,
  deleteComment,
  getQuestionDiscussion,
  getSuggestionsForAuthor,
  resolveSuggestion,
} from '../lib/actions/community-actions';
import { supabaseAdmin } from '../lib/supabase-admin';
import { getSessionAccount } from '../lib/session';

vi.mock('../lib/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock('../lib/session', () => ({ getSessionAccount: vi.fn() }));

const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000a1';
const ACCOUNT = { id: ACCOUNT_ID, wallet: null };
const AUTHOR_ID = '00000000-0000-4000-8000-0000000000a2';
const Q_ID = '00000000-0000-4000-8000-000000000001';
const COMMENT_ID = '00000000-0000-4000-8000-000000000002';

type TableStubs = Record<
  string,
  { row?: unknown; rows?: unknown[]; insertError?: unknown; updateError?: unknown; count?: number; queryError?: unknown }
>;

// Chainable query stub, same convention as tests/answer-and-list-guards.test.ts: every
// builder method returns the chain, and the terminal calls resolve to what the test
// gives per table. Extended with is/range/delete for the tables this module queries.
function mockTables(tables: TableStubs) {
  const inserts: Record<string, unknown[]> = {};
  const calls: Record<string, { method: string; args: unknown[] }[]> = {};
  (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
    const t = tables[table] ?? {};
    const tableCalls = (calls[table] ??= []);
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'neq', 'in', 'order', 'limit', 'gte', 'is', 'range']) {
      chain[m] = (...args: unknown[]) => {
        tableCalls.push({ method: m, args });
        return chain;
      };
    }
    chain.single = async () => ({ data: t.row ?? null, error: t.row ? null : { code: 'PGRST116' } });
    chain.maybeSingle = async () => ({ data: t.row ?? null, error: null });
    chain.insert = async (row: unknown) => {
      (inserts[table] ??= []).push(row);
      return { error: t.insertError ?? null };
    };
    chain.upsert = async (row: unknown) => {
      (inserts[table] ??= []).push(row);
      return { error: t.insertError ?? null };
    };
    chain.update = (...args: unknown[]) => {
      tableCalls.push({ method: 'update', args });
      return chain;
    };
    chain.delete = () => {
      tableCalls.push({ method: 'delete', args: [] });
      return chain;
    };
    chain.then = (resolve: (val: unknown) => unknown) =>
      resolve({
        data: t.queryError ? null : (t.rows ?? (t.row ? [t.row] : [])),
        error: t.queryError ?? t.updateError ?? null,
        count: t.count ?? (t.rows ? t.rows.length : t.row ? 1 : 0),
      });
    return chain;
  });
  return { inserts, calls };
}

describe('rateQuestion', () => {
  beforeEach(() => vi.resetAllMocks());

  it('refuses a guest before touching the database', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await rateQuestion(Q_ID, 5)).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    expect(supabaseAdmin!.from).not.toHaveBeenCalled();
  });

  it('rejects rating 0, 6 and 2.5', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    expect(await rateQuestion(Q_ID, 0)).toEqual({ ok: false, code: 'INVALID' });
    expect(await rateQuestion(Q_ID, 6)).toEqual({ ok: false, code: 'INVALID' });
    expect(await rateQuestion(Q_ID, 2.5)).toEqual({ ok: false, code: 'INVALID' });
  });

  it('refuses a question that is missing or not public (contest questions included)', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({ questions: {} });
    expect(await rateQuestion(Q_ID, 4)).toEqual({ ok: false, code: 'NOT_ALLOWED' });
  });

  it('refuses a question the account never answered', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      questions: { row: { created_by_user: AUTHOR_ID } },
      quiz_results: {},
    });
    expect(await rateQuestion(Q_ID, 4)).toEqual({ ok: false, code: 'NOT_ANSWERED' });
  });

  it('refuses the author rating their own question', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      questions: { row: { created_by_user: ACCOUNT_ID } },
      quiz_results: { row: { id: 'r1' } },
    });
    expect(await rateQuestion(Q_ID, 4)).toEqual({ ok: false, code: 'NOT_ALLOWED' });
  });

  it('upserts a rating for an answered, non-author question', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const { inserts } = mockTables({
      questions: { row: { created_by_user: AUTHOR_ID } },
      quiz_results: { row: { id: 'r1' } },
    });
    expect(await rateQuestion(Q_ID, 4)).toEqual({ ok: true });
    expect(inserts.question_ratings![0]).toMatchObject({ question_id: Q_ID, user_id: ACCOUNT_ID, rating: 4 });
  });
});

describe('addComment', () => {
  beforeEach(() => vi.resetAllMocks());

  it('refuses a guest before touching the database', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await addComment(Q_ID, 'nice question', 'comment')).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    expect(supabaseAdmin!.from).not.toHaveBeenCalled();
  });

  it('rejects an empty body and a 501-character body', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    expect(await addComment(Q_ID, '   ', 'comment')).toEqual({ ok: false, code: 'INVALID' });
    expect(await addComment(Q_ID, 'x'.repeat(501), 'comment')).toEqual({ ok: false, code: 'INVALID' });
  });

  it('refuses a question the account never answered', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      questions: { row: { created_by_user: AUTHOR_ID } },
      quiz_results: {},
    });
    expect(await addComment(Q_ID, 'nice question', 'comment')).toEqual({ ok: false, code: 'NOT_ANSWERED' });
  });

  it('refuses a suggestion sent to your own question, but allows commenting on it', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      questions: { row: { created_by_user: ACCOUNT_ID } },
      quiz_results: { row: { id: 'r1' } },
      question_comments: { count: 0 },
    });
    expect(await addComment(Q_ID, 'fix option C', 'suggestion')).toEqual({ ok: false, code: 'NOT_ALLOWED' });
    expect(await addComment(Q_ID, 'nice question', 'comment')).toEqual({ ok: true });
  });

  it('refuses the 21st comment or suggestion of the day', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      questions: { row: { created_by_user: AUTHOR_ID } },
      quiz_results: { row: { id: 'r1' } },
      question_comments: { count: 20 },
    });
    expect(await addComment(Q_ID, 'one more', 'comment')).toEqual({ ok: false, code: 'RATE_LIMITED' });
  });

  it('inserts a comment for an answered, non-author question under the daily cap', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const { inserts } = mockTables({
      questions: { row: { created_by_user: AUTHOR_ID } },
      quiz_results: { row: { id: 'r1' } },
      question_comments: { count: 19 },
    });
    expect(await addComment(Q_ID, 'nice question', 'comment')).toEqual({ ok: true });
    expect(inserts.question_comments![0]).toMatchObject({
      question_id: Q_ID,
      user_id: ACCOUNT_ID,
      kind: 'comment',
      body: 'nice question',
    });
  });
});

describe('deleteComment', () => {
  beforeEach(() => vi.resetAllMocks());

  it('refuses a guest before touching the database', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await deleteComment(COMMENT_ID)).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    expect(supabaseAdmin!.from).not.toHaveBeenCalled();
  });

  it("refuses someone else's comment", async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({ question_comments: { row: { id: COMMENT_ID, user_id: AUTHOR_ID } } });
    expect(await deleteComment(COMMENT_ID)).toEqual({ ok: false, code: 'NOT_ALLOWED' });
  });

  it('deletes your own comment', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const { calls } = mockTables({ question_comments: { row: { id: COMMENT_ID, user_id: ACCOUNT_ID } } });
    expect(await deleteComment(COMMENT_ID)).toEqual({ ok: true });
    expect(calls.question_comments!.some((c) => c.method === 'delete')).toBe(true);
  });
});

describe('getQuestionDiscussion', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reads comments only, never suggestions', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (supabaseAdmin!.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [{ average: 4.5, count: 2 }], error: null });
    const { calls } = mockTables({
      question_comments: {
        rows: [
          {
            id: 'c1',
            body: 'nice one',
            created_at: '2026-09-29T00:00:00Z',
            user_id: AUTHOR_ID,
            users: { display_name: 'Ada' },
          },
        ],
      },
    });
    const result = await getQuestionDiscussion(Q_ID);
    expect(calls.question_comments!.some((c) => c.method === 'eq' && c.args[0] === 'kind' && c.args[1] === 'comment')).toBe(
      true
    );
    expect(result.rating).toEqual({ average: 4.5, count: 2 });
    expect(result.myRating).toBeNull();
    expect(result.comments).toEqual([
      { id: 'c1', body: 'nice one', authorName: 'Ada', createdAt: '2026-09-29T00:00:00Z', mine: false },
    ]);
  });

  it("marks the signed-in account's own comment and reads its rating", async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    (supabaseAdmin!.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [{ average: null, count: 0 }], error: null });
    mockTables({
      question_ratings: { row: { rating: 3 } },
      question_comments: {
        rows: [
          {
            id: 'c1',
            body: 'mine',
            created_at: '2026-09-29T00:00:00Z',
            user_id: ACCOUNT_ID,
            users: { display_name: 'Me' },
          },
        ],
      },
    });
    const result = await getQuestionDiscussion(Q_ID);
    expect(result.myRating).toBe(3);
    expect(result.comments[0].mine).toBe(true);
  });
});

describe('getSuggestionsForAuthor', () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns [] for another account's id, without touching the database", async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    expect(await getSuggestionsForAuthor(AUTHOR_ID)).toEqual([]);
    expect(supabaseAdmin!.from).not.toHaveBeenCalled();
  });

  it('returns suggestions on the signed-in account\'s own questions with the prompt attached', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      questions: { rows: [{ id: Q_ID, prompt: 'What is gas?' }] },
      question_comments: {
        rows: [
          {
            id: 'c1',
            question_id: Q_ID,
            body: 'option C is also correct',
            created_at: '2026-09-29T00:00:00Z',
            resolved_at: null,
            users: { display_name: 'Ada' },
          },
        ],
      },
    });
    const result = await getSuggestionsForAuthor(ACCOUNT_ID);
    expect(result).toEqual([
      {
        id: 'c1',
        questionId: Q_ID,
        questionPrompt: 'What is gas?',
        body: 'option C is also correct',
        senderName: 'Ada',
        createdAt: '2026-09-29T00:00:00Z',
        resolvedAt: null,
      },
    ]);
  });

  it('returns [] without a question_comments lookup when the account has no questions', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const { calls } = mockTables({ questions: { rows: [] } });
    expect(await getSuggestionsForAuthor(ACCOUNT_ID)).toEqual([]);
    expect(calls.question_comments).toBeUndefined();
  });
});

describe('resolveSuggestion', () => {
  beforeEach(() => vi.resetAllMocks());

  it('refuses anyone but the question author', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    mockTables({
      question_comments: { row: { id: COMMENT_ID, question_id: Q_ID, kind: 'suggestion' } },
      questions: { row: { created_by_user: AUTHOR_ID } },
    });
    expect(await resolveSuggestion(COMMENT_ID)).toEqual({ ok: false, code: 'NOT_ALLOWED' });
  });

  it('resolves as the question author', async () => {
    (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(ACCOUNT);
    const { calls } = mockTables({
      question_comments: { row: { id: COMMENT_ID, question_id: Q_ID, kind: 'suggestion' } },
      questions: { row: { created_by_user: ACCOUNT_ID } },
    });
    expect(await resolveSuggestion(COMMENT_ID)).toEqual({ ok: true });
    expect(calls.question_comments!.some((c) => c.method === 'update')).toBe(true);
  });
});

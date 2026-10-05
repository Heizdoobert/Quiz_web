import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  rateQuestion,
  addComment,
  deleteComment,
  getQuestionDiscussion,
  getSuggestionsForAuthor,
  resolveSuggestion,
} from '../lib/actions/community-actions';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';
import { supabase } from '../lib/supabase/supabase';
import { getSessionAccount } from '../lib/services/session';

vi.mock('../lib/services/session', () => ({
  getSessionAccount: vi.fn(),
}));

vi.mock('../lib/supabase/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

vi.mock('../lib/supabase/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

const VALID_QID = '11111111-1111-4111-8111-111111111111';
const VALID_CID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const AUTHOR_ID = '44444444-4444-4444-8444-444444444444';

function mockSession(id = USER_ID) {
  (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    wallet: '0x123',
    display: 'TestUser',
  });
}

function mockGuest() {
  (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue(null);
}

// Chainable mock for supabase / supabaseAdmin
function createTableMock(config: Record<string, unknown>) {
  return (table: string) => {
    const data = config[table] ?? [];
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};

    const methods = [
      'select',
      'insert',
      'update',
      'delete',
      'upsert',
      'eq',
      'is',
      'gte',
      'order',
      'range',
      'limit',
      'single',
      'maybeSingle',
    ];

    for (const m of methods) {
      chain[m] = vi.fn().mockImplementation(() => {
        if (m === 'single' || m === 'maybeSingle') {
          const item = Array.isArray(data) ? data[0] ?? null : data;
          return Promise.resolve({ data: item, error: null });
        }
        return chain;
      });
    }

    // Resolving when awaited
    (chain as unknown as { then: unknown }).then = (resolve: (val: unknown) => unknown) => {
      const isCount = config[`${table}:count`];
      return resolve({
        data: Array.isArray(data) ? data : [data],
        error: null,
        count: isCount ?? (Array.isArray(data) ? data.length : 1),
      });
    };

    return chain;
  };
}

describe('rateQuestion', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSession();
  });

  it('rejects guests with UNAUTHORIZED', async () => {
    mockGuest();
    const res = await rateQuestion(VALID_QID, 5);
    expect(res).toEqual({ ok: false, code: 'UNAUTHORIZED' });
  });

  it('rejects invalid rating values with INVALID', async () => {
    expect(await rateQuestion(VALID_QID, 0)).toEqual({ ok: false, code: 'INVALID' });
    expect(await rateQuestion(VALID_QID, 6)).toEqual({ ok: false, code: 'INVALID' });
    expect(await rateQuestion(VALID_QID, 2.5)).toEqual({ ok: false, code: 'INVALID' });
    expect(await rateQuestion('not-a-uuid', 5)).toEqual({ ok: false, code: 'INVALID' });
  });

  it('rejects non-public or contest questions with NOT_ALLOWED', async () => {
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation(
      createTableMock({
        questions: [{ id: VALID_QID, status: 'verified', list_id: 'some-contest-list', created_by_user: AUTHOR_ID }],
      })
    );

    const res = await rateQuestion(VALID_QID, 5);
    expect(res).toEqual({ ok: false, code: 'NOT_ALLOWED' });
  });

  it('rejects when player has not answered the question with NOT_ANSWERED', async () => {
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'questions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: VALID_QID, status: 'verified', list_id: null, created_by_user: AUTHOR_ID },
            error: null,
          }),
        };
      }
      if (table === 'quiz_results') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {};
    });

    const res = await rateQuestion(VALID_QID, 5);
    expect(res).toEqual({ ok: false, code: 'NOT_ANSWERED' });
  });

  it('rejects when author attempts to rate own question with NOT_ALLOWED', async () => {
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'questions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: VALID_QID, status: 'verified', list_id: null, created_by_user: USER_ID },
            error: null,
          }),
        };
      }
      if (table === 'quiz_results') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'ans1' }, error: null }),
        };
      }
      return {};
    });

    const res = await rateQuestion(VALID_QID, 5);
    expect(res).toEqual({ ok: false, code: 'NOT_ALLOWED' });
  });

  it('allows a valid rating from a player who answered', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'questions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: VALID_QID, status: 'verified', list_id: null, created_by_user: AUTHOR_ID },
            error: null,
          }),
        };
      }
      if (table === 'quiz_results') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'ans1' }, error: null }),
        };
      }
      if (table === 'question_ratings') {
        return { upsert };
      }
      return {};
    });

    const res = await rateQuestion(VALID_QID, 4);
    expect(res).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        question_id: VALID_QID,
        user_id: USER_ID,
        rating: 4,
      })
    );
  });
});

describe('addComment', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSession();
  });

  it('rejects guests with UNAUTHORIZED', async () => {
    mockGuest();
    const res = await addComment(VALID_QID, 'Great question', 'comment');
    expect(res).toEqual({ ok: false, code: 'UNAUTHORIZED' });
  });

  it('rejects empty or over 500-char body with INVALID', async () => {
    expect(await addComment(VALID_QID, '   ', 'comment')).toEqual({ ok: false, code: 'INVALID' });
    expect(await addComment(VALID_QID, 'a'.repeat(501), 'comment')).toEqual({ ok: false, code: 'INVALID' });
  });

  it('rejects 21st comment of the day with RATE_LIMITED', async () => {
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'questions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: VALID_QID, status: 'verified', list_id: null, created_by_user: AUTHOR_ID },
            error: null,
          }),
        };
      }
      if (table === 'quiz_results') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'ans1' }, error: null }),
        };
      }
      if (table === 'question_comments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ count: 20, error: null }),
        };
      }
      return {};
    });

    const res = await addComment(VALID_QID, 'A valid comment', 'comment');
    expect(res).toEqual({ ok: false, code: 'RATE_LIMITED' });
  });

  it('rejects author sending suggestion on own question with NOT_ALLOWED', async () => {
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'questions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: VALID_QID, status: 'verified', list_id: null, created_by_user: USER_ID },
            error: null,
          }),
        };
      }
      if (table === 'quiz_results') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'ans1' }, error: null }),
        };
      }
      return {};
    });

    const res = await addComment(VALID_QID, 'Fix this option', 'suggestion');
    expect(res).toEqual({ ok: false, code: 'NOT_ALLOWED' });
  });

  it('allows author commenting on own question', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'questions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: VALID_QID, status: 'verified', list_id: null, created_by_user: USER_ID },
            error: null,
          }),
        };
      }
      if (table === 'quiz_results') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'ans1' }, error: null }),
        };
      }
      if (table === 'question_comments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ count: 5, error: null }),
          insert,
        };
      }
      return {};
    });

    const res = await addComment(VALID_QID, 'Author note on this question', 'comment');
    expect(res).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        question_id: VALID_QID,
        user_id: USER_ID,
        kind: 'comment',
        body: 'Author note on this question',
      })
    );
  });
});

describe('deleteComment', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSession();
  });

  it('rejects guests with UNAUTHORIZED', async () => {
    mockGuest();
    const res = await deleteComment(VALID_CID);
    expect(res).toEqual({ ok: false, code: 'UNAUTHORIZED' });
  });

  it('refuses deleting someone else comment with NOT_ALLOWED', async () => {
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'question_comments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: VALID_CID, user_id: 'other-user-id' },
            error: null,
          }),
        };
      }
      return {};
    });

    const res = await deleteComment(VALID_CID);
    expect(res).toEqual({ ok: false, code: 'NOT_ALLOWED' });
  });

  it('allows deleting own comment', async () => {
    const deleteFn = vi.fn().mockReturnThis();
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    deleteFn.mockReturnValue({ eq: eqFn });

    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'question_comments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: VALID_CID, user_id: USER_ID },
            error: null,
          }),
          delete: deleteFn,
        };
      }
      return {};
    });

    const res = await deleteComment(VALID_CID);
    expect(res).toEqual({ ok: true });
    expect(deleteFn).toHaveBeenCalled();
  });
});

describe('resolveSuggestion', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSession();
  });

  it('refuses anyone but the question author with NOT_ALLOWED', async () => {
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'question_comments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: VALID_CID,
              kind: 'suggestion',
              questions: { created_by_user: 'not-me-author-id' },
            },
            error: null,
          }),
        };
      }
      return {};
    });

    const res = await resolveSuggestion(VALID_CID);
    expect(res).toEqual({ ok: false, code: 'NOT_ALLOWED' });
  });

  it('allows the question author to resolve suggestion', async () => {
    const update = vi.fn().mockReturnThis();
    const eq = vi.fn().mockResolvedValue({ error: null });
    update.mockReturnValue({ eq });

    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'question_comments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: VALID_CID,
              kind: 'suggestion',
              questions: { created_by_user: USER_ID },
            },
            error: null,
          }),
          update,
        };
      }
      return {};
    });

    const res = await resolveSuggestion(VALID_CID);
    expect(res).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ resolved_at: expect.any(String) }));
  });
});

describe('getQuestionDiscussion', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSession();
  });

  it('never returns suggestions in the comments view', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ average: 4.5, count: 10 }],
      error: null,
    });

    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'question_ratings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { rating: 5 }, error: null }),
        };
      }
      if (table === 'question_comments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'c1',
                body: 'Public comment',
                kind: 'comment',
                created_at: '2026-09-29T00:00:00Z',
                user_id: 'author1',
                users: { display_name: 'Player1' },
              },
            ],
            error: null,
          }),
        };
      }
      return {};
    });

    const res = await getQuestionDiscussion(VALID_QID);
    expect(res.comments).toHaveLength(1);
    expect(res.comments[0].body).toBe('Public comment');
    expect(res.rating).toEqual({ average: 4.5, count: 10 });
    expect(res.myRating).toBe(5);
  });
});

describe('getSuggestionsForAuthor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSession(USER_ID);
  });

  it('returns empty array when requested for another account id', async () => {
    const res = await getSuggestionsForAuthor('different-account-id');
    expect(res).toEqual([]);
  });

  it('returns suggestions for author questions when session matches', async () => {
    (supabaseAdmin!.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'question_comments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'sug1',
                question_id: VALID_QID,
                body: 'Typo in prompt',
                created_at: '2026-09-29T00:00:00Z',
                resolved_at: null,
                questions: { prompt: 'Sample prompt' },
                users: { display_name: 'Helper' },
              },
            ],
            error: null,
          }),
        };
      }
      return {};
    });

    const res = await getSuggestionsForAuthor(USER_ID);
    expect(res).toHaveLength(1);
    expect(res[0].prompt).toBe('Sample prompt');
    expect(res[0].senderName).toBe('Helper');
    expect(res[0].body).toBe('Typo in prompt');
  });
});

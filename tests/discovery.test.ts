import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchQuestions, getTopicQuestions } from '../lib/actions/discovery-actions';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));

// Chainable query stub matching tests/answer-and-list-guards.test.ts: every builder
// method returns the chain, and the chain itself resolves via `then` when awaited.
function stubQuestionsTable(rows: unknown[] | null, error: unknown = null) {
  const calls: { method: string; args: unknown[] }[] = [];
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'is', 'ilike', 'order', 'range']) {
    chain[m] = (...args: unknown[]) => {
      calls.push({ method: m, args });
      return chain;
    };
  }
  chain.then = (resolve: (val: unknown) => unknown) => resolve({ data: error ? null : rows, error });
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return calls;
}

describe('searchQuestions', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns no results and makes no database call for a 1-character query', async () => {
    const result = await searchQuestions('a');

    expect(result).toEqual({ results: [], hasMore: false });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('returns no results and makes no database call for a 101-character query', async () => {
    const result = await searchQuestions('a'.repeat(101));

    expect(result).toEqual({ results: [], hasMore: false });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('trims the query before checking its length', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });

    await searchQuestions('  ok  ');

    expect(supabase.rpc).toHaveBeenCalledWith('search_questions', {
      p_query: 'ok',
      p_limit: 21,
      p_offset: 0,
    });
  });

  it('requests page 2 with the right offset', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });

    await searchQuestions('blockchain', 2);

    expect(supabase.rpc).toHaveBeenCalledWith('search_questions', {
      p_query: 'blockchain',
      p_limit: 21,
      p_offset: 20,
    });
  });

  it('reports hasMore when the database returns one extra row, and trims it off', async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      id: `q${i}`,
      prompt: `Prompt ${i}`,
      category: 'DeFi',
      author_name: 'Player',
      created_at: '2026-09-29T00:00:00Z',
      score: 1,
    }));
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: rows, error: null });

    const result = await searchQuestions('blockchain');

    expect(result.results).toHaveLength(20);
    expect(result.hasMore).toBe(true);
  });

  it('reports hasMore: false when the database returns fewer rows than the page size', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'q1',
          prompt: 'What is a blockchain?',
          category: 'DeFi',
          author_name: 'Player',
          created_at: '2026-09-29T00:00:00Z',
          score: 0.9,
        },
      ],
      error: null,
    });

    const result = await searchQuestions('blockchain');

    expect(result.hasMore).toBe(false);
    expect(result.results).toEqual([
      {
        id: 'q1',
        prompt: 'What is a blockchain?',
        category: 'DeFi',
        authorName: 'Player',
        createdAt: '2026-09-29T00:00:00Z',
        score: 0.9,
      },
    ]);
  });

  it('never includes answer fields in the mapped result', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'q1',
          prompt: 'p',
          category: 'DeFi',
          author_name: 'Player',
          created_at: '2026-09-29T00:00:00Z',
          score: 0.5,
          correct_index: 2,
          explanation: 'should never surface',
          options: ['a', 'b', 'c', 'd'],
        },
      ],
      error: null,
    });

    const result = await searchQuestions('blockchain');

    expect(Object.keys(result.results[0])).toEqual(['id', 'prompt', 'category', 'authorName', 'createdAt', 'score']);
  });

  it('returns no results when the database call errors', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: { message: 'boom' } });

    const result = await searchQuestions('blockchain');

    expect(result).toEqual({ results: [], hasMore: false });
  });
});

describe('getTopicQuestions', () => {
  beforeEach(() => vi.resetAllMocks());

  it('maps rows newest first, falling back to Player when there is no display name', async () => {
    stubQuestionsTable([
      {
        id: 'q1',
        prompt: 'What is a blockchain?',
        category: 'DeFi',
        created_at: '2026-09-29T00:00:00Z',
        users: { display_name: 'Ada' },
      },
      {
        id: 'q2',
        prompt: 'What is gas?',
        category: 'DeFi',
        created_at: '2026-09-28T00:00:00Z',
        users: null,
      },
    ]);

    const result = await getTopicQuestions('DeFi');

    expect(result).toEqual({
      results: [
        { id: 'q1', prompt: 'What is a blockchain?', category: 'DeFi', authorName: 'Ada', createdAt: '2026-09-29T00:00:00Z', score: 0 },
        { id: 'q2', prompt: 'What is gas?', category: 'DeFi', authorName: 'Player', createdAt: '2026-09-28T00:00:00Z', score: 0 },
      ],
      hasMore: false,
    });
  });

  it('escapes the topic for ILIKE and requests the right range for page 2', async () => {
    const calls = stubQuestionsTable([]);

    await getTopicQuestions('50% off_deals', 2);

    const ilikeCall = calls.find((c) => c.method === 'ilike');
    const rangeCall = calls.find((c) => c.method === 'range');
    expect(ilikeCall?.args).toEqual(['category', '50\\% off\\_deals']);
    expect(rangeCall?.args).toEqual([20, 40]);
  });

  it('reports hasMore when the database returns one extra row, and trims it off', async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      id: `q${i}`,
      prompt: `Prompt ${i}`,
      category: 'DeFi',
      created_at: '2026-09-29T00:00:00Z',
      users: { display_name: 'Player' },
    }));
    stubQuestionsTable(rows);

    const result = await getTopicQuestions('DeFi');

    expect(result.results).toHaveLength(20);
    expect(result.hasMore).toBe(true);
  });

  it('returns no results when the database call errors', async () => {
    stubQuestionsTable(null, { message: 'boom' });

    const result = await getTopicQuestions('DeFi');

    expect(result).toEqual({ results: [], hasMore: false });
  });
});

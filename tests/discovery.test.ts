import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchQuestions, getTopicQuestions } from '../lib/actions/discovery-actions';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));

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

  function mockTopicChain(result: { data: unknown[] | null; error: unknown }) {
    const eq = vi.fn();
    const is = vi.fn();
    const ilike = vi.fn();
    const order = vi.fn();
    const range = vi.fn().mockResolvedValue(result);

    const builder: Record<string, ReturnType<typeof vi.fn>> = { eq, is, ilike, order, range };
    eq.mockReturnValue(builder);
    is.mockReturnValue(builder);
    ilike.mockReturnValue(builder);
    order.mockReturnValue(builder);

    const select = vi.fn().mockReturnValue(builder);
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select });
    return { select, eq, is, ilike, order, range };
  }

  it('returns no results and makes no database call for an empty or whitespace topic', async () => {
    const result = await getTopicQuestions('   ');

    expect(result).toEqual({ results: [], hasMore: false });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('trims topic, escapes wildcard characters, and enforces public-question filters', async () => {
    const { eq, is, ilike, order, range } = mockTopicChain({ data: [], error: null });

    await getTopicQuestions('  DeFi%_  ');

    expect(supabase.from).toHaveBeenCalledWith('questions');
    expect(eq).toHaveBeenCalledWith('status', 'verified');
    expect(is).toHaveBeenCalledWith('list_id', null);
    expect(ilike).toHaveBeenCalledWith('category', 'DeFi\\%\\_');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(range).toHaveBeenCalledWith(0, 20);
  });

  it('requests page 2 with the right range offset', async () => {
    const { range } = mockTopicChain({ data: [], error: null });

    await getTopicQuestions('Layer 1s', 2);

    expect(range).toHaveBeenCalledWith(20, 40);
  });

  it('reports hasMore: true and trims off the extra row when 21 rows are returned', async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      id: `q${i}`,
      prompt: `Prompt ${i}`,
      category: 'DeFi',
      created_at: '2026-09-29T00:00:00Z',
      users: { display_name: 'Satoshi' },
    }));
    mockTopicChain({ data: rows, error: null });

    const result = await getTopicQuestions('DeFi');

    expect(result.results).toHaveLength(20);
    expect(result.hasMore).toBe(true);
    expect(result.results[0].authorName).toBe('Satoshi');
  });

  it('reports hasMore: false when fewer than 21 rows are returned and defaults author to Player', async () => {
    mockTopicChain({
      data: [
        {
          id: 'q1',
          prompt: 'What is a DEX?',
          category: 'DeFi',
          created_at: '2026-09-29T00:00:00Z',
          users: null,
        },
      ],
      error: null,
    });

    const result = await getTopicQuestions('DeFi');

    expect(result.hasMore).toBe(false);
    expect(result.results).toEqual([
      {
        id: 'q1',
        prompt: 'What is a DEX?',
        category: 'DeFi',
        authorName: 'Player',
        createdAt: '2026-09-29T00:00:00Z',
      },
    ]);
  });

  it('never surfaces answer fields in the mapped result', async () => {
    mockTopicChain({
      data: [
        {
          id: 'q1',
          prompt: 'Prompt',
          category: 'DeFi',
          created_at: '2026-09-29T00:00:00Z',
          users: { display_name: 'Vitalik' },
          correct_index: 1,
          explanation: 'Secret explanation',
          options: ['A', 'B'],
        },
      ],
      error: null,
    });

    const result = await getTopicQuestions('DeFi');

    expect(Object.keys(result.results[0])).toEqual(['id', 'prompt', 'category', 'authorName', 'createdAt']);
  });

  it('returns no results when the database call errors', async () => {
    mockTopicChain({ data: null, error: { message: 'db error' } });

    const result = await getTopicQuestions('DeFi');

    expect(result).toEqual({ results: [], hasMore: false });
  });
});

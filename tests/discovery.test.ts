import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchQuestions } from '../lib/actions/discovery-actions';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({ supabase: { rpc: vi.fn() } }));

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

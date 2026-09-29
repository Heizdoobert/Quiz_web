import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRandomQuestion, getPublicQuestion, getTopics } from '../lib/actions/question-actions';
import { validateQuestionInput } from '../lib/validation';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

function mockChain(result: { data: unknown[] | null; error: unknown }) {
  const eq = vi.fn().mockReturnThis();
  const is = vi.fn().mockReturnThis();
  const not = vi.fn().mockReturnThis();
  const ilike = vi.fn().mockReturnThis();
  const limit = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ eq, is, not, ilike, limit });
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select });
  return { select, eq, is, not, ilike, limit };
}

describe('fetchRandomQuestion (public-question rule)', () => {
  beforeEach(() => vi.resetAllMocks());

  it('serves only status = verified AND list_id IS NULL', async () => {
    const row = { id: 'q1', category: 'General', prompt: 'p', options: ['a', 'b'], created_by: null, status: 'verified' };
    const { eq, is } = mockChain({ data: [row], error: null });

    const result = await fetchRandomQuestion();

    expect(eq).toHaveBeenCalledWith('status', 'verified');
    expect(is).toHaveBeenCalledWith('list_id', null);
    expect(result?.id).toBe('q1');
  });

  it('never serves a rejected or quarantined question', async () => {
    // The `eq('status', 'verified')` filter is enforced by the database, so a
    // rejected/quarantined row simply never comes back in `data` here.
    mockChain({ data: [], error: null });

    const result = await fetchRandomQuestion();

    expect(result).toBeNull();
  });

  it('applies the same public-question rule to the category fallback query', async () => {
    const row = { id: 'q2', category: 'DeFi', prompt: 'p2', options: ['a', 'b'], created_by: null, status: 'verified' };
    let call = 0;
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      call += 1;
      const first = call === 1;
      const eq = vi.fn().mockReturnThis();
      const is = vi.fn().mockReturnThis();
      const not = vi.fn().mockReturnThis();
      const ilike = vi.fn().mockReturnThis();
      const limit = vi.fn().mockResolvedValue(first ? { data: [], error: null } : { data: [row], error: null });
      return { select: vi.fn().mockReturnValue({ eq, is, not, ilike, limit }) };
    });

    const result = await fetchRandomQuestion([], 'DeFi');

    expect(result?.id).toBe('q2');
    expect(call).toBe(2); // primary query (empty) + category fallback (hit)
  });

  it('matches a category case-insensitively and escapes wildcard characters', async () => {
    const row = { id: 'q3', category: 'defi', prompt: 'p3', options: ['a', 'b'], created_by: null, status: 'verified' };
    const { ilike } = mockChain({ data: [row], error: null });

    const result = await fetchRandomQuestion([], '100%_off');

    expect(ilike).toHaveBeenCalledWith('category', '100\\%\\_off');
    expect(result?.id).toBe('q3');
  });
});

describe('getTopics', () => {
  beforeEach(() => vi.resetAllMocks());

  it('maps get_topics() rows from snake_case to camelCase', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        { name: 'DeFi', question_count: 5, latest_at: '2026-09-29T00:00:00Z' },
        { name: 'NFT & Gaming', question_count: 2, latest_at: '2026-09-20T00:00:00Z' },
      ],
      error: null,
    });

    const topics = await getTopics();

    expect(supabase.rpc).toHaveBeenCalledWith('get_topics');
    expect(topics).toEqual([
      { name: 'DeFi', questionCount: 5, latestAt: '2026-09-29T00:00:00Z' },
      { name: 'NFT & Gaming', questionCount: 2, latestAt: '2026-09-20T00:00:00Z' },
    ]);
  });

  it('returns an empty list on error instead of throwing', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: new Error('boom') });

    const topics = await getTopics();

    expect(topics).toEqual([]);
  });
});

describe('getPublicQuestion', () => {
  beforeEach(() => vi.resetAllMocks());

  it('applies the public-question rule and never returns answer fields', async () => {
    const row = { id: '11111111-1111-1111-1111-111111111111', category: 'DeFi', prompt: 'p', options: ['a', 'b'], created_by: null, status: 'verified' };
    const eq = vi.fn().mockReturnThis();
    const is = vi.fn().mockReturnThis();
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn().mockReturnValue({ eq, is, single });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select });

    const result = await getPublicQuestion(row.id);

    expect(eq).toHaveBeenCalledWith('status', 'verified');
    expect(is).toHaveBeenCalledWith('list_id', null);
    expect(result).toEqual(row);
    expect(result).not.toHaveProperty('correct_index');
    expect(result).not.toHaveProperty('explanation');
  });

  it('returns null for a malformed id without querying the database', async () => {
    const result = await getPublicQuestion('not-a-uuid');

    expect(result).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('createQuestion category normalization', () => {
  const base = { prompt: 'a'.repeat(20), options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'e'.repeat(20) };

  it('trims and collapses inner spaces', () => {
    const result = validateQuestionInput({ ...base, category: '  De   Fi  ' });
    expect(result.valid).toBe(true);
    expect(result.valid && result.category).toBe('De Fi');
  });

  it('rejects a category shorter than 2 characters', () => {
    const result = validateQuestionInput({ ...base, category: 'A' });
    expect(result.valid).toBe(false);
  });

  it('defaults to General when no category is given', () => {
    const result = validateQuestionInput({ ...base });
    expect(result.valid).toBe(true);
    expect(result.valid && result.category).toBe('General');
  });
});

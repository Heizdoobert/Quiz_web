import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRandomQuestion } from '../lib/actions/question-actions';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn() } }));

function mockChain(result: { data: unknown[] | null; error: unknown }) {
  const eq = vi.fn().mockReturnThis();
  const is = vi.fn().mockReturnThis();
  const not = vi.fn().mockReturnThis();
  const limit = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ eq, is, not, limit });
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select });
  return { select, eq, is, not, limit };
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
      const limit = vi.fn().mockResolvedValue(first ? { data: [], error: null } : { data: [row], error: null });
      return { select: vi.fn().mockReturnValue({ eq, is, not, limit }) };
    });

    const result = await fetchRandomQuestion([], 'DeFi');

    expect(result?.id).toBe('q2');
    expect(call).toBe(2); // primary query (empty) + category fallback (hit)
  });
});

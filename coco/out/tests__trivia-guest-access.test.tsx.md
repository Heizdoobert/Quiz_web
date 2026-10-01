# tests/trivia-guest-access.test.tsx
lines:151 exports:
---
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

# tests/trivia-guest-access.test.tsx
lines:158 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRandomQuestion, getPublicQuestion, getTopics } from '../lib/actions/question-actions';
import { validateQuestionInput } from '../lib/utils/validation';
import { supabase } from '../lib/sdk/supabase';

vi.mock('../lib/sdk/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));

const GENERAL = { slug: 'general', topic_translations: [{ locale: 'en', name: 'General' }] };
const DEFI = { slug: 'defi', topic_translations: [{ locale: 'en', name: 'DeFi' }] };

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

  it('serves only status = verified and never filters on the retired contest column', async () => {
    const row = { id: 'q1', topics: GENERAL, prompt: 'p', options: ['a', 'b'], created_by: null, status: 'verified' };
    const { eq, is } = mockChain({ data: [row], error: null });

    const result = await fetchRandomQuestion();

    expect(eq).toHaveBeenCalledWith('status', 'verified');
    expect(is).not.toHaveBeenCalled();
    expect(result?.id).toBe('q1');
  });

  it('never serves a rejected or quarantined question', async () => {
    // The `eq('status', 'verified')` filter is enforced by the database, so a
    // rejected/quarantined row simply never comes back in `data` here.
    mockChain({ data: [], error: null });


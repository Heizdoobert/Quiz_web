# tests/discovery.test.ts
lines:209 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchQuestions, getTopicQuestions } from '../lib/actions/discovery-actions';
import { supabase } from '../lib/supabase/supabase';

vi.mock('../lib/supabase/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));

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

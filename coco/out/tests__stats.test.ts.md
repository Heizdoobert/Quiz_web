# tests/stats.test.ts
lines:60 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { statsForAccount } from '../lib/utils/stats';
import { getUserStats } from '../lib/actions/quiz-actions';
import { supabase } from '../lib/supabase/supabase';
import { getSessionAccount } from '../lib/services/session';

const ACCOUNT_ID = '00000000-0000-4000-8000-0000000000f1';
const ZERO = { score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 };

vi.mock('../lib/supabase/supabase', () => ({ supabase: { rpc: vi.fn() } }));
vi.mock('../lib/services/session', () => ({ getSessionAccount: vi.fn() }));

function mockRpc(result: { data: unknown; error: unknown }) {
  (supabase.rpc as ReturnType<typeof vi.fn>).mockReturnValue({ single: () => Promise.resolve(result) });
}

describe('statsForAccount', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shapes a row into score, streak, best streak and accuracy', async () => {
    mockRpc({ data: { total_answered: 4, correct_count: 3, streak: 2, best_streak: 3 }, error: null });
    const stats = await statsForAccount(ACCOUNT_ID);
    expect(supabase.rpc).toHaveBeenCalledWith('get_user_stats', { p_user: ACCOUNT_ID });
    expect(stats).toEqual({ score: 3, streak: 2, bestStreak: 3, accuracy: 75, totalAnswered: 4 });
  });

  it('returns zeros for an account with no answers', async () => {
    mockRpc({ data: { total_answered: 0, correct_count: 0, streak: 0, best_streak: 0 }, error: null });
    expect(await statsForAccount(ACCOUNT_ID)).toEqual(ZERO);
  });

  it('returns zeros on an rpc error', async () => {
    mockRpc({ data: null, error: { message: 'db unavailable' } });
    expect(await statsForAccount(ACCOUNT_ID)).toEqual(ZERO);
  });

  it('fails closed when the call throws', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('boom');
    });

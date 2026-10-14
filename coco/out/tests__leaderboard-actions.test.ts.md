# tests/leaderboard-actions.test.ts
lines:94 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGlobalLeaderboard, getGroupLeaderboard } from '../lib/actions/leaderboard-actions';
import { supabase } from '../lib/sdk/supabase';
import { logger } from '../lib/logger';

const ACCOUNT_A = '00000000-0000-4000-8000-0000000000a1';
const ACCOUNT_B = '00000000-0000-4000-8000-0000000000b1';
const GROUP_ID = '00000000-0000-4000-8000-0000000000c1';

vi.mock('../lib/sdk/supabase', () => ({ supabase: { rpc: vi.fn() } }));
const { cacheCalls } = vi.hoisted(() => ({ cacheCalls: [] as Array<{ keyParts: string[]; options: { revalidate?: number } }> }));
// unstable_cache needs Next's runtime; here it passes the function through and records how it was set up.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown, keyParts: string[], options: { revalidate?: number }) => {
    cacheCalls.push({ keyParts, options });
    return fn;
  },
}));

describe('getGlobalLeaderboard', () => {
  beforeEach(() => vi.resetAllMocks());

  it('ranks rows by position and passes through the account id and display name', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        { user_id: ACCOUNT_A, display_name: 'Alice', score: 5, accuracy: 90 },
        { user_id: ACCOUNT_B, display_name: 'Player-x', score: 3, accuracy: 60 },
      ],
      error: null,
    });

    const entries = await getGlobalLeaderboard(50);

    expect(supabase.rpc).toHaveBeenCalledWith('get_global_leaderboard', { p_limit: 50, p_offset: 0 });
    expect(entries).toEqual([
      { user_id: ACCOUNT_A, display_name: 'Alice', score: 5, accuracy: 90, rank: 1 },
      { user_id: ACCOUNT_B, display_name: 'Player-x', score: 3, accuracy: 60, rank: 2 },
    ]);
  });


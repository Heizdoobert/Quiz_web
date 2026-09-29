import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGlobalLeaderboard, getGroupLeaderboard } from '../lib/actions/leaderboard-actions';
import { supabase } from '../lib/supabase';

const ACCOUNT_A = '00000000-0000-4000-8000-0000000000a1';
const ACCOUNT_B = '00000000-0000-4000-8000-0000000000b1';
const WALLET_A = '0x' + 'a'.repeat(40);
const GROUP_ID = '00000000-0000-4000-8000-0000000000c1';

vi.mock('../lib/supabase', () => ({ supabase: { rpc: vi.fn() } }));

describe('getGlobalLeaderboard', () => {
  beforeEach(() => vi.resetAllMocks());

  it('ranks rows by position and passes through the account id, wallet and display name', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        { user_id: ACCOUNT_A, display_name: 'Alice', wallet_address: WALLET_A, score: 5, accuracy: 90 },
        { user_id: ACCOUNT_B, display_name: 'Player-x', wallet_address: null, score: 3, accuracy: 60 },
      ],
      error: null,
    });

    const entries = await getGlobalLeaderboard(50);

    expect(supabase.rpc).toHaveBeenCalledWith('get_global_leaderboard', { p_limit: 50 });
    expect(entries).toEqual([
      { user_id: ACCOUNT_A, wallet_address: WALLET_A, display_name: 'Alice', score: 5, accuracy: 90, rank: 1 },
      { user_id: ACCOUNT_B, wallet_address: null, display_name: 'Player-x', score: 3, accuracy: 60, rank: 2 },
    ]);
  });

  it('returns empty on an rpc error', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await getGlobalLeaderboard(50)).toEqual([]);
  });

  it('clamps a limit outside 1-100', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    await getGlobalLeaderboard(500);
    expect(supabase.rpc).toHaveBeenCalledWith('get_global_leaderboard', { p_limit: 100 });
  });
});

describe('getGroupLeaderboard', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rejects a non-uuid group id without calling the database', async () => {
    expect(await getGroupLeaderboard('not-a-uuid', 50)).toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('passes the group id through and ranks the result', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ user_id: ACCOUNT_A, display_name: 'Alice', wallet_address: WALLET_A, score: 1, accuracy: 100 }],
      error: null,
    });

    const entries = await getGroupLeaderboard(GROUP_ID, 50);

    expect(supabase.rpc).toHaveBeenCalledWith('get_group_leaderboard', { p_group_id: GROUP_ID, p_limit: 50 });
    expect(entries[0].rank).toBe(1);
  });
});

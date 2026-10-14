import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({ admin: vi.fn(), pub: { rpc: vi.fn() } }));

import { admin, pub } from '@/lib/db/client';
import { dailyLeaderboard, pickDailyChallenge } from '@/lib/db/daily-challenge';

beforeEach(() => {
  vi.mocked(admin).mockReset();
  vi.mocked(pub.rpc).mockReset();
});

describe('pickDailyChallenge', () => {
  it('calls pick_daily_challenge with the secret key and returns the number inserted', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 10, error: null });
    vi.mocked(admin).mockReturnValue({ rpc } as never);
    await expect(pickDailyChallenge('2026-11-20')).resolves.toBe(10);
    expect(rpc).toHaveBeenCalledWith('pick_daily_challenge', { p_date: '2026-11-20', p_count: 10 });
  });

  it('passes a custom count', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 5, error: null });
    vi.mocked(admin).mockReturnValue({ rpc } as never);
    await pickDailyChallenge('2026-11-20', 5);
    expect(rpc).toHaveBeenCalledWith('pick_daily_challenge', { p_date: '2026-11-20', p_count: 5 });
  });
});

describe('dailyLeaderboard', () => {
  it('reads get_daily_leaderboard with the public key', async () => {
    vi.mocked(pub.rpc).mockResolvedValue({ data: [{ display_name: 'a' }], error: null } as never);
    await expect(dailyLeaderboard('2026-11-20', 50, 0)).resolves.toEqual([{ display_name: 'a' }]);
    expect(pub.rpc).toHaveBeenCalledWith('get_daily_leaderboard', { p_date: '2026-11-20', p_limit: 50, p_offset: 0 });
  });
});

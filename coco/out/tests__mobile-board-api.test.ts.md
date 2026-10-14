# tests/mobile-board-api.test.ts
lines:61 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/mobile/v1/quiz/board/route';
import { NextRequest } from 'next/server';
import * as mobileAuth from '@/lib/services/mobile-auth';
import * as leaderboard from '@/lib/actions/leaderboard-actions';
import * as stats from '@/lib/utils/stats';

vi.mock('@/lib/services/mobile-auth');
vi.mock('@/lib/actions/leaderboard-actions');
vi.mock('@/lib/utils/stats', async (importOriginal) => ({
  ...(await importOriginal<typeof stats>()),
  statsForAccount: vi.fn(),
  historyForAccount: vi.fn(),
}));

const ROW = { user_id: 'u9', display_name: 'ada', score: 9, accuracy: 90, rank: 1 };

describe('Mobile board API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(leaderboard.getGlobalLeaderboard).mockResolvedValue([ROW]);
  });

  it('gives a guest the leaderboard with zero stats and no history', async () => {
    const res = await GET(new NextRequest('http://localhost/api/mobile/v1/quiz/board'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.stats).toEqual(stats.ZERO_STATS);
    expect(json.history).toEqual([]);
    expect(json.leaderboard).toEqual([ROW]);
    expect(stats.statsForAccount).not.toHaveBeenCalled();
  });

  it('rejects a bad or expired token so the app can ask the player to sign in again', async () => {
    vi.mocked(mobileAuth.verifyMobileAuthToken).mockReturnValue(null);

    const res = await GET(
      new NextRequest('http://localhost/api/mobile/v1/quiz/board', { headers: { Authorization: 'Bearer stale' } }),
    );

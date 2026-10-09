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

const ROW = { user_id: 'u9', wallet_address: null, display_name: 'ada', score: 9, accuracy: 90, rank: 1 };

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

  it('treats a bad token as a guest instead of failing the screen', async () => {
    vi.mocked(mobileAuth.verifyMobileAuthToken).mockReturnValue(null);

    const res = await GET(
      new NextRequest('http://localhost/api/mobile/v1/quiz/board', { headers: { Authorization: 'Bearer stale' } }),
    );

    expect(res.status).toBe(200);
    expect((await res.json()).history).toEqual([]);
  });

  it("adds a signed-in player's own stats and history", async () => {
    vi.mocked(mobileAuth.verifyMobileAuthToken).mockReturnValue({ id: 'user1', wallet: null });
    vi.mocked(stats.statsForAccount).mockResolvedValue({ score: 7, streak: 3, bestStreak: 5, accuracy: 70, totalAnswered: 10 });
    vi.mocked(stats.historyForAccount).mockResolvedValue([{ questionId: 'q1', prompt: 'Why?', isCorrect: true }]);

    const res = await GET(
      new NextRequest('http://localhost/api/mobile/v1/quiz/board', { headers: { Authorization: 'Bearer good' } }),
    );
    const json = await res.json();

    expect(stats.statsForAccount).toHaveBeenCalledWith('user1');
    expect(json.stats.score).toBe(7);
    expect(json.history).toHaveLength(1);
  });
});

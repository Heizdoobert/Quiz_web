import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/mobile/v1/profile/quizzes/route';
import { NextRequest } from 'next/server';
import * as mobileAuth from '@/lib/services/mobile-auth';
import * as userQuizzes from '@/lib/services/user-quizzes';

vi.mock('@/lib/services/mobile-auth');
vi.mock('@/lib/services/user-quizzes');

const URL = 'http://localhost/api/mobile/v1/profile/quizzes';
const QUIZ = { id: 'q1', category: 'Science', prompt: 'Why?', options: ['a', 'b'], status: 'approved', created_at: '2026-10-01' };

describe('Mobile profile API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('needs a token', async () => {
    const res = await GET(new NextRequest(URL));
    expect(res.status).toBe(401);
    expect(userQuizzes.quizzesForAccount).not.toHaveBeenCalled();
  });

  it('rejects a bad token', async () => {
    vi.mocked(mobileAuth.verifyMobileAuthToken).mockReturnValue(null);
    const res = await GET(new NextRequest(URL, { headers: { Authorization: 'Bearer stale' } }));
    expect(res.status).toBe(401);
  });

  it("lists the signed-in player's own questions", async () => {
    vi.mocked(mobileAuth.verifyMobileAuthToken).mockReturnValue({ id: 'user1' });
    vi.mocked(userQuizzes.quizzesForAccount).mockResolvedValue({ success: true, quizzes: [QUIZ], count: 1 } as never);

    const res = await GET(new NextRequest(URL, { headers: { Authorization: 'Bearer good' } }));

    expect(userQuizzes.quizzesForAccount).toHaveBeenCalledWith('user1');
    expect(await res.json()).toEqual({ quizzes: [QUIZ] });
  });

  it('reports a failed lookup as a server error', async () => {
    vi.mocked(mobileAuth.verifyMobileAuthToken).mockReturnValue({ id: 'user1' });
    vi.mocked(userQuizzes.quizzesForAccount).mockResolvedValue({ success: false, error: 'Failed to fetch your quizzes.', code: 'FETCH_FAILED' });

    const res = await GET(new NextRequest(URL, { headers: { Authorization: 'Bearer good' } }));
    expect(res.status).toBe(500);
  });
});

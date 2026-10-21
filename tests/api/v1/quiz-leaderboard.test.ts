import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as submitAnswerRoute } from '@/app/api/v1/quiz/answer/route';
import { GET as getHistoryRoute } from '@/app/api/v1/quiz/history/route';
import { GET as getStatsRoute } from '@/app/api/v1/quiz/stats/route';
import { GET as getGlobalLeaderboardRoute } from '@/app/api/v1/leaderboard/route';
import { GET as getGroupLeaderboardRoute } from '@/app/api/v1/leaderboard/group/[id]/route';

import { submitAnswer, getAnswerHistory, getUserStats } from '@/lib/actions/quiz-actions';
import { getGlobalLeaderboard, getGroupLeaderboard } from '@/lib/actions/leaderboard-actions';
import { issueMobileAuthToken } from '@/lib/services/auth/mobile-auth';

vi.mock('@/lib/actions/quiz-actions', () => ({
  submitAnswer: vi.fn(),
  getAnswerHistory: vi.fn(),
  getUserStats: vi.fn(),
}));

vi.mock('@/lib/actions/leaderboard-actions', () => ({
  getGlobalLeaderboard: vi.fn(),
  getGroupLeaderboard: vi.fn(),
}));

function post(url: string, body?: unknown, token?: string, rawBody?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: rawBody !== undefined ? rawBody : JSON.stringify(body),
  });
}

function get(url: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new NextRequest(url, {
    method: 'GET',
    headers,
  });
}

const TEST_SECRET = 'test-secret-key-12345678901234567890';
const TEST_ACCOUNT = { id: '00000000-0000-4000-8000-000000000001', username: 'quiztester' };
let validToken: string;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SECRET_KEY', TEST_SECRET);
  validToken = issueMobileAuthToken(TEST_ACCOUNT)!;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/v1/quiz/answer', () => {
  const samplePayload = {
    questionId: '11111111-1111-4000-8000-111111111111',
    answerIndex: 2,
  };

  const sampleAnswerResult = {
    isCorrect: true,
    correctIndex: 2,
    explanation: 'Correct answer explanation',
    recorded: true,
  };

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await submitAnswerRoute(post('http://localhost/api/v1/quiz/answer', samplePayload));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED when an invalid token is provided', async () => {
    const res = await submitAnswerRoute(
      post('http://localhost/api/v1/quiz/answer', samplePayload, 'invalid-token')
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 VALIDATION_ERROR when request body is invalid JSON', async () => {
    const res = await submitAnswerRoute(
      post('http://localhost/api/v1/quiz/answer', undefined, validToken, '{malformed')
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when questionId is missing or invalid', async () => {
    const res = await submitAnswerRoute(
      post('http://localhost/api/v1/quiz/answer', { answerIndex: 1 }, validToken)
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when answerIndex is missing or not a number', async () => {
    const res = await submitAnswerRoute(
      post(
        'http://localhost/api/v1/quiz/answer',
        { questionId: '11111111-1111-4000-8000-111111111111', answerIndex: 'invalid' },
        validToken
      )
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('successfully submits answer and passes auth account to submitAnswer', async () => {
    vi.mocked(submitAnswer).mockResolvedValue(sampleAnswerResult);

    const res = await submitAnswerRoute(
      post('http://localhost/api/v1/quiz/answer', samplePayload, validToken)
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(sampleAnswerResult);
    expect(submitAnswer).toHaveBeenCalledWith(
      { questionId: samplePayload.questionId, answerIndex: samplePayload.answerIndex },
      expect.objectContaining({ id: TEST_ACCOUNT.id })
    );
  });

  it('returns 500 SERVER_ERROR when submitAnswer throws', async () => {
    vi.mocked(submitAnswer).mockRejectedValue(new Error('DB failure'));

    const res = await submitAnswerRoute(
      post('http://localhost/api/v1/quiz/answer', samplePayload, validToken)
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

describe('GET /api/v1/quiz/history', () => {
  const sampleHistory = [
    { questionId: 'q-1', prompt: 'Question 1', isCorrect: true },
    { questionId: 'q-2', prompt: 'Question 2', isCorrect: false },
  ];

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await getHistoryRoute(get('http://localhost/api/v1/quiz/history'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED when invalid token is provided', async () => {
    const res = await getHistoryRoute(get('http://localhost/api/v1/quiz/history', 'invalid-token'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('successfully returns history, passing auth account to getAnswerHistory', async () => {
    vi.mocked(getAnswerHistory).mockResolvedValue(sampleHistory);

    const res = await getHistoryRoute(get('http://localhost/api/v1/quiz/history', validToken));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(sampleHistory);
    expect(getAnswerHistory).toHaveBeenCalledWith(
      expect.objectContaining({ id: TEST_ACCOUNT.id })
    );
  });

  it('returns 500 SERVER_ERROR when getAnswerHistory throws', async () => {
    vi.mocked(getAnswerHistory).mockRejectedValue(new Error('History query failed'));

    const res = await getHistoryRoute(get('http://localhost/api/v1/quiz/history', validToken));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

describe('GET /api/v1/quiz/stats', () => {
  const sampleStats = {
    score: 15,
    streak: 3,
    bestStreak: 7,
    accuracy: 75,
    totalAnswered: 20,
  };

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await getStatsRoute(get('http://localhost/api/v1/quiz/stats'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED when invalid token is provided', async () => {
    const res = await getStatsRoute(get('http://localhost/api/v1/quiz/stats', 'invalid-token'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('successfully returns stats, passing auth account to getUserStats', async () => {
    vi.mocked(getUserStats).mockResolvedValue(sampleStats);

    const res = await getStatsRoute(get('http://localhost/api/v1/quiz/stats', validToken));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(sampleStats);
    expect(getUserStats).toHaveBeenCalledWith(
      expect.objectContaining({ id: TEST_ACCOUNT.id })
    );
  });

  it('returns 500 SERVER_ERROR when getUserStats throws', async () => {
    vi.mocked(getUserStats).mockRejectedValue(new Error('Stats query failed'));

    const res = await getStatsRoute(get('http://localhost/api/v1/quiz/stats', validToken));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

describe('GET /api/v1/leaderboard', () => {
  const sampleLeaderboard = [
    { user_id: 'u-1', display_name: 'Player 1', score: 100, accuracy: 90, rank: 1 },
    { user_id: 'u-2', display_name: 'Player 2', score: 80, accuracy: 85, rank: 2 },
  ];

  it('is public and returns global leaderboard with default limit 50 and offset 0', async () => {
    vi.mocked(getGlobalLeaderboard).mockResolvedValue(sampleLeaderboard);

    const res = await getGlobalLeaderboardRoute(get('http://localhost/api/v1/leaderboard'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(sampleLeaderboard);
    expect(getGlobalLeaderboard).toHaveBeenCalledWith(50, 0);
  });

  it('parses limit and offset query parameters', async () => {
    vi.mocked(getGlobalLeaderboard).mockResolvedValue(sampleLeaderboard);

    const res = await getGlobalLeaderboardRoute(
      get('http://localhost/api/v1/leaderboard?limit=25&offset=50')
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(getGlobalLeaderboard).toHaveBeenCalledWith(25, 50);
  });

  it('falls back to default limit and offset on invalid query parameters', async () => {
    vi.mocked(getGlobalLeaderboard).mockResolvedValue(sampleLeaderboard);

    const res = await getGlobalLeaderboardRoute(
      get('http://localhost/api/v1/leaderboard?limit=abc&offset=xyz')
    );
    expect(res.status).toBe(200);
    expect(getGlobalLeaderboard).toHaveBeenCalledWith(50, 0);
  });

  it('returns 500 SERVER_ERROR when getGlobalLeaderboard throws', async () => {
    vi.mocked(getGlobalLeaderboard).mockRejectedValue(new Error('Leaderboard failed'));

    const res = await getGlobalLeaderboardRoute(get('http://localhost/api/v1/leaderboard'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

describe('GET /api/v1/leaderboard/group/[id]', () => {
  const groupId = '22222222-2222-4000-8000-222222222222';
  const sampleGroupLeaderboard = [
    { user_id: 'u-1', display_name: 'Member 1', score: 50, accuracy: 80, rank: 1 },
  ];

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await getGroupLeaderboardRoute(
      get(`http://localhost/api/v1/leaderboard/group/${groupId}`),
      { params: Promise.resolve({ id: groupId }) }
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED when invalid token is provided', async () => {
    const res = await getGroupLeaderboardRoute(
      get(`http://localhost/api/v1/leaderboard/group/${groupId}`, 'invalid-token'),
      { params: Promise.resolve({ id: groupId }) }
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 VALIDATION_ERROR when group ID is missing', async () => {
    const res = await getGroupLeaderboardRoute(
      get('http://localhost/api/v1/leaderboard/group/', validToken),
      { params: Promise.resolve({ id: '' }) }
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('successfully returns group leaderboard with defaults', async () => {
    vi.mocked(getGroupLeaderboard).mockResolvedValue(sampleGroupLeaderboard);

    const res = await getGroupLeaderboardRoute(
      get(`http://localhost/api/v1/leaderboard/group/${groupId}`, validToken),
      { params: Promise.resolve({ id: groupId }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(sampleGroupLeaderboard);
    expect(getGroupLeaderboard).toHaveBeenCalledWith(
      groupId,
      50,
      0,
      expect.objectContaining({ id: TEST_ACCOUNT.id })
    );
  });

  it('parses limit and offset query parameters', async () => {
    vi.mocked(getGroupLeaderboard).mockResolvedValue(sampleGroupLeaderboard);

    const res = await getGroupLeaderboardRoute(
      get(`http://localhost/api/v1/leaderboard/group/${groupId}?limit=20&offset=10`, validToken),
      { params: Promise.resolve({ id: groupId }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(getGroupLeaderboard).toHaveBeenCalledWith(
      groupId,
      20,
      10,
      expect.objectContaining({ id: TEST_ACCOUNT.id })
    );
  });

  it('returns 500 SERVER_ERROR when getGroupLeaderboard throws', async () => {
    vi.mocked(getGroupLeaderboard).mockRejectedValue(new Error('Group leaderboard failed'));

    const res = await getGroupLeaderboardRoute(
      get(`http://localhost/api/v1/leaderboard/group/${groupId}`, validToken),
      { params: Promise.resolve({ id: groupId }) }
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

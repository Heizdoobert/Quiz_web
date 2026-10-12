import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

import { GET as getUserGroupsRoute, POST as createGroupRoute } from '@/app/api/v1/groups/route';
import { POST as joinGroupRoute } from '@/app/api/v1/groups/[id]/join/route';
import { POST as leaveGroupRoute } from '@/app/api/v1/groups/[id]/leave/route';
import { POST as rateQuestionRoute } from '@/app/api/v1/questions/[id]/rate/route';
import { POST as addCommentRoute } from '@/app/api/v1/questions/[id]/comment/route';
import { DELETE as deleteCommentRoute } from '@/app/api/v1/comments/[id]/route';
import { POST as resolveSuggestionRoute } from '@/app/api/v1/suggestions/[id]/resolve/route';
import { GET as getDiscussionRoute } from '@/app/api/v1/questions/[id]/discussion/route';
import { GET as getSuggestionsRoute } from '@/app/api/v1/suggestions/route';
import { GET as getUserQuizzesRoute } from '@/app/api/v1/profile/quizzes/route';
import { GET as exportUserDataRoute } from '@/app/api/v1/profile/export/route';
import { GET as getAnalyticsRoute } from '@/app/api/v1/profile/analytics/route';

import { createGroup, joinGroup, leaveGroup, getUserGroups } from '@/lib/actions/group-actions';
import {
  rateQuestion,
  addComment,
  deleteComment,
  resolveSuggestion,
  getQuestionDiscussion,
  getSuggestionsForAuthor,
} from '@/lib/actions/community-actions';
import {
  getUserQuizzes,
  exportUserData,
  getQuestionAnalytics,
} from '@/lib/actions/profile-actions';
import { issueMobileAuthToken } from '@/lib/services/mobile-auth';

vi.mock('@/lib/actions/group-actions', () => ({
  createGroup: vi.fn(),
  joinGroup: vi.fn(),
  leaveGroup: vi.fn(),
  getUserGroups: vi.fn(),
}));

vi.mock('@/lib/actions/community-actions', () => ({
  rateQuestion: vi.fn(),
  addComment: vi.fn(),
  deleteComment: vi.fn(),
  resolveSuggestion: vi.fn(),
  getQuestionDiscussion: vi.fn(),
  getSuggestionsForAuthor: vi.fn(),
}));

vi.mock('@/lib/actions/profile-actions', () => ({
  getUserQuizzes: vi.fn(),
  exportUserData: vi.fn(),
  getQuestionAnalytics: vi.fn(),
}));

function post(url: string, body?: unknown, token?: string, rawBody?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: rawBody !== undefined ? rawBody : (body !== undefined ? JSON.stringify(body) : undefined),
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

function del(url: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new NextRequest(url, {
    method: 'DELETE',
    headers,
  });
}

const TEST_SECRET = 'test-secret-key-12345678901234567890';
const TEST_ACCOUNT = { id: '00000000-0000-4000-8000-000000000001' };
let validToken: string;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SECRET_KEY', TEST_SECRET);
  validToken = issueMobileAuthToken(TEST_ACCOUNT)!;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ==========================================
// 1. Groups: GET & POST /api/v1/groups
// ==========================================
describe('/api/v1/groups', () => {
  const sampleGroups = [
    { id: '11111111-1111-4000-8000-111111111111', name: 'Trivia Masters', description: 'Fun group', created_at: '2026-01-01T00:00:00Z' },
  ];

  describe('GET /api/v1/groups', () => {
    it('returns 401 UNAUTHORIZED when no token is provided', async () => {
      const res = await getUserGroupsRoute(get('http://localhost/api/v1/groups'));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 UNAUTHORIZED when invalid token is provided', async () => {
      const res = await getUserGroupsRoute(get('http://localhost/api/v1/groups', 'invalid-token'));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('returns user groups on success', async () => {
      vi.mocked(getUserGroups).mockResolvedValue(sampleGroups);

      const res = await getUserGroupsRoute(get('http://localhost/api/v1/groups', validToken));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(sampleGroups);
      expect(getUserGroups).toHaveBeenCalledWith(TEST_ACCOUNT);
    });

    it('maps 500 SERVER_ERROR when getUserGroups throws', async () => {
      vi.mocked(getUserGroups).mockRejectedValue(new Error('DB failure'));

      const res = await getUserGroupsRoute(get('http://localhost/api/v1/groups', validToken));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('SERVER_ERROR');
    });
  });

  describe('POST /api/v1/groups', () => {
    it('returns 401 UNAUTHORIZED when no token is provided', async () => {
      const res = await createGroupRoute(post('http://localhost/api/v1/groups', { name: 'My Group' }));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 400 VALIDATION_ERROR when request body is malformed JSON', async () => {
      const res = await createGroupRoute(post('http://localhost/api/v1/groups', undefined, validToken, '{malformed'));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 VALIDATION_ERROR when group name is missing or empty', async () => {
      const res = await createGroupRoute(post('http://localhost/api/v1/groups', { name: '   ' }, validToken));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 409 CONFLICT when group name is already taken', async () => {
      vi.mocked(createGroup).mockResolvedValue({ success: false, error: 'That group name is taken.' });

      const res = await createGroupRoute(post('http://localhost/api/v1/groups', { name: 'Existing Group' }, validToken));
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('CONFLICT');
    });

    it('returns created group on success', async () => {
      vi.mocked(createGroup).mockResolvedValue({ success: true, group: sampleGroups[0] });

      const res = await createGroupRoute(
        post('http://localhost/api/v1/groups', { name: 'Trivia Masters', description: 'Fun group' }, validToken)
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(sampleGroups[0]);
      expect(createGroup).toHaveBeenCalledWith(
        { name: 'Trivia Masters', description: 'Fun group' },
        TEST_ACCOUNT
      );
    });
  });
});

// ==========================================
// 2. Groups: POST /api/v1/groups/[id]/join
// ==========================================
describe('POST /api/v1/groups/[id]/join', () => {
  const groupId = '11111111-1111-4000-8000-111111111111';

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await joinGroupRoute(
      post(`http://localhost/api/v1/groups/${groupId}/join`),
      { params: Promise.resolve({ id: groupId }) }
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 NOT_FOUND when group does not exist', async () => {
    vi.mocked(joinGroup).mockResolvedValue({ success: false, error: 'Group not found.' });

    const res = await joinGroupRoute(
      post(`http://localhost/api/v1/groups/${groupId}/join`, undefined, validToken),
      { params: Promise.resolve({ id: groupId }) }
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('returns 409 CONFLICT when user is already a member', async () => {
    vi.mocked(joinGroup).mockResolvedValue({ success: false, error: 'You are already in this group.' });

    const res = await joinGroupRoute(
      post(`http://localhost/api/v1/groups/${groupId}/join`, undefined, validToken),
      { params: Promise.resolve({ id: groupId }) }
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('CONFLICT');
  });

  it('joins group successfully', async () => {
    vi.mocked(joinGroup).mockResolvedValue({ success: true });

    const res = await joinGroupRoute(
      post(`http://localhost/api/v1/groups/${groupId}/join`, undefined, validToken),
      { params: Promise.resolve({ id: groupId }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(joinGroup).toHaveBeenCalledWith(groupId, TEST_ACCOUNT);
  });
});

// ==========================================
// 3. Groups: POST /api/v1/groups/[id]/leave
// ==========================================
describe('POST /api/v1/groups/[id]/leave', () => {
  const groupId = '11111111-1111-4000-8000-111111111111';

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await leaveGroupRoute(
      post(`http://localhost/api/v1/groups/${groupId}/leave`),
      { params: Promise.resolve({ id: groupId }) }
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 NOT_FOUND when group does not exist', async () => {
    vi.mocked(leaveGroup).mockResolvedValue({ success: false, error: 'Group not found.' });

    const res = await leaveGroupRoute(
      post(`http://localhost/api/v1/groups/${groupId}/leave`, undefined, validToken),
      { params: Promise.resolve({ id: groupId }) }
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('leaves group successfully', async () => {
    vi.mocked(leaveGroup).mockResolvedValue({ success: true });

    const res = await leaveGroupRoute(
      post(`http://localhost/api/v1/groups/${groupId}/leave`, undefined, validToken),
      { params: Promise.resolve({ id: groupId }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(leaveGroup).toHaveBeenCalledWith(groupId, TEST_ACCOUNT);
  });
});

// ==========================================
// 4. Questions: POST /api/v1/questions/[id]/rate
// ==========================================
describe('POST /api/v1/questions/[id]/rate', () => {
  const questionId = '22222222-2222-4000-8000-222222222222';

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await rateQuestionRoute(
      post(`http://localhost/api/v1/questions/${questionId}/rate`, { rating: 5 }),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 VALIDATION_ERROR when rating is invalid (not 1-5 integer)', async () => {
    const res = await rateQuestionRoute(
      post(`http://localhost/api/v1/questions/${questionId}/rate`, { rating: 6 }, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 403 NOT_ALLOWED when user has not answered the question', async () => {
    vi.mocked(rateQuestion).mockResolvedValue({ ok: false, code: 'NOT_ANSWERED' });

    const res = await rateQuestionRoute(
      post(`http://localhost/api/v1/questions/${questionId}/rate`, { rating: 4 }, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_ALLOWED');
  });

  it('returns 403 NOT_ALLOWED when author tries to rate own question', async () => {
    vi.mocked(rateQuestion).mockResolvedValue({ ok: false, code: 'NOT_ALLOWED' });

    const res = await rateQuestionRoute(
      post(`http://localhost/api/v1/questions/${questionId}/rate`, { rating: 5 }, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_ALLOWED');
  });

  it('rates question successfully', async () => {
    vi.mocked(rateQuestion).mockResolvedValue({ ok: true });

    const res = await rateQuestionRoute(
      post(`http://localhost/api/v1/questions/${questionId}/rate`, { rating: 5 }, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(rateQuestion).toHaveBeenCalledWith(questionId, 5, TEST_ACCOUNT);
  });
});

// ==========================================
// 5. Questions: POST /api/v1/questions/[id]/comment
// ==========================================
describe('POST /api/v1/questions/[id]/comment', () => {
  const questionId = '22222222-2222-4000-8000-222222222222';

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await addCommentRoute(
      post(`http://localhost/api/v1/questions/${questionId}/comment`, { body: 'Nice question' }),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 VALIDATION_ERROR when comment body is missing or empty', async () => {
    const res = await addCommentRoute(
      post(`http://localhost/api/v1/questions/${questionId}/comment`, { body: '   ' }, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 429 RATE_LIMITED when user has posted too many comments', async () => {
    vi.mocked(addComment).mockResolvedValue({ ok: false, code: 'RATE_LIMITED' });

    const res = await addCommentRoute(
      post(`http://localhost/api/v1/questions/${questionId}/comment`, { body: 'Spam' }, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('RATE_LIMITED');
  });

  it('returns 403 NOT_ALLOWED when user is not allowed to comment', async () => {
    vi.mocked(addComment).mockResolvedValue({ ok: false, code: 'NOT_ALLOWED' });

    const res = await addCommentRoute(
      post(`http://localhost/api/v1/questions/${questionId}/comment`, { body: 'Feedback' }, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_ALLOWED');
  });

  it('adds comment successfully with default kind comment', async () => {
    vi.mocked(addComment).mockResolvedValue({ ok: true });

    const res = await addCommentRoute(
      post(`http://localhost/api/v1/questions/${questionId}/comment`, { body: 'Great question!' }, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(addComment).toHaveBeenCalledWith(questionId, 'Great question!', 'comment', TEST_ACCOUNT);
  });

  it('adds suggestion successfully when kind is suggestion', async () => {
    vi.mocked(addComment).mockResolvedValue({ ok: true });

    const res = await addCommentRoute(
      post(
        `http://localhost/api/v1/questions/${questionId}/comment`,
        { body: 'Typo in prompt', kind: 'suggestion' },
        validToken
      ),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(addComment).toHaveBeenCalledWith(questionId, 'Typo in prompt', 'suggestion', TEST_ACCOUNT);
  });
});

// ==========================================
// 6. Comments: DELETE /api/v1/comments/[id]
// ==========================================
describe('DELETE /api/v1/comments/[id]', () => {
  const commentId = '33333333-3333-4000-8000-333333333333';

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await deleteCommentRoute(
      del(`http://localhost/api/v1/comments/${commentId}`),
      { params: Promise.resolve({ id: commentId }) }
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 NOT_ALLOWED when user cannot delete this comment', async () => {
    vi.mocked(deleteComment).mockResolvedValue({ ok: false, code: 'NOT_ALLOWED' });

    const res = await deleteCommentRoute(
      del(`http://localhost/api/v1/comments/${commentId}`, validToken),
      { params: Promise.resolve({ id: commentId }) }
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_ALLOWED');
  });

  it('deletes comment successfully', async () => {
    vi.mocked(deleteComment).mockResolvedValue({ ok: true });

    const res = await deleteCommentRoute(
      del(`http://localhost/api/v1/comments/${commentId}`, validToken),
      { params: Promise.resolve({ id: commentId }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(deleteComment).toHaveBeenCalledWith(commentId, TEST_ACCOUNT);
  });
});

// ==========================================
// 7. Suggestions: POST /api/v1/suggestions/[id]/resolve
// ==========================================
describe('POST /api/v1/suggestions/[id]/resolve', () => {
  const suggestionId = '44444444-4444-4000-8000-444444444444';

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await resolveSuggestionRoute(
      post(`http://localhost/api/v1/suggestions/${suggestionId}/resolve`),
      { params: Promise.resolve({ id: suggestionId }) }
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 NOT_ALLOWED when user is not author of the question', async () => {
    vi.mocked(resolveSuggestion).mockResolvedValue({ ok: false, code: 'NOT_ALLOWED' });

    const res = await resolveSuggestionRoute(
      post(`http://localhost/api/v1/suggestions/${suggestionId}/resolve`, undefined, validToken),
      { params: Promise.resolve({ id: suggestionId }) }
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_ALLOWED');
  });

  it('resolves suggestion successfully', async () => {
    vi.mocked(resolveSuggestion).mockResolvedValue({ ok: true });

    const res = await resolveSuggestionRoute(
      post(`http://localhost/api/v1/suggestions/${suggestionId}/resolve`, undefined, validToken),
      { params: Promise.resolve({ id: suggestionId }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(resolveSuggestion).toHaveBeenCalledWith(suggestionId, TEST_ACCOUNT);
  });
});

// ==========================================
// 8. Questions: GET /api/v1/questions/[id]/discussion
// ==========================================
describe('GET /api/v1/questions/[id]/discussion', () => {
  const questionId = '22222222-2222-4000-8000-222222222222';
  const sampleDiscussion = {
    rating: { average: 4.5, count: 12 },
    myRating: 5,
    comments: [
      { id: 'c-1', authorName: 'Alice', body: 'Nice question', createdAt: '2026-01-01T00:00:00Z', isOwn: false, mine: false },
    ],
    hasMore: false,
  };

  it('allows unauthenticated requests and passes undefined authAccount', async () => {
    vi.mocked(getQuestionDiscussion).mockResolvedValue(sampleDiscussion);

    const res = await getDiscussionRoute(
      get(`http://localhost/api/v1/questions/${questionId}/discussion`),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(sampleDiscussion);
    expect(getQuestionDiscussion).toHaveBeenCalledWith(questionId, 1, undefined);
  });

  it('passes authenticated account to support mine/isOwn flag', async () => {
    vi.mocked(getQuestionDiscussion).mockResolvedValue(sampleDiscussion);

    const res = await getDiscussionRoute(
      get(`http://localhost/api/v1/questions/${questionId}/discussion?page=2`, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(sampleDiscussion);
    expect(getQuestionDiscussion).toHaveBeenCalledWith(questionId, 2, TEST_ACCOUNT);
  });
});

// ==========================================
// 9. Suggestions: GET /api/v1/suggestions
// ==========================================
describe('GET /api/v1/suggestions', () => {
  const sampleSuggestions = [
    {
      id: 'sug-1',
      questionId: '22222222-2222-4000-8000-222222222222',
      prompt: 'What is 2+2?',
      questionPrompt: 'What is 2+2?',
      body: 'Add 4 as option',
      senderName: 'Bob',
      createdAt: '2026-01-01T00:00:00Z',
      resolvedAt: null,
    },
  ];

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await getSuggestionsRoute(get('http://localhost/api/v1/suggestions'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns suggestions for author on success', async () => {
    vi.mocked(getSuggestionsForAuthor).mockResolvedValue(sampleSuggestions);

    const res = await getSuggestionsRoute(get('http://localhost/api/v1/suggestions', validToken));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(sampleSuggestions);
    expect(getSuggestionsForAuthor).toHaveBeenCalledWith(TEST_ACCOUNT.id, TEST_ACCOUNT);
  });
});

// ==========================================
// 10. Profile: GET /api/v1/profile/quizzes
// ==========================================
describe('GET /api/v1/profile/quizzes', () => {
  const sampleQuizzesResult = {
    success: true as const,
    quizzes: [
      {
        id: '22222222-2222-4000-8000-222222222222',
        category: 'Science',
        prompt: 'What is H2O?',
        options: ['Water', 'Air', 'Fire', 'Earth'],
        status: 'verified' as const,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    count: 1,
  };

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await getUserQuizzesRoute(get('http://localhost/api/v1/profile/quizzes'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('passes query params (limit, offset, category, status) to getUserQuizzes', async () => {
    vi.mocked(getUserQuizzes).mockResolvedValue(sampleQuizzesResult);

    const res = await getUserQuizzesRoute(
      get('http://localhost/api/v1/profile/quizzes?limit=10&offset=5&category=Science&status=verified', validToken)
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual({
      quizzes: sampleQuizzesResult.quizzes,
      count: sampleQuizzesResult.count,
    });
    expect(getUserQuizzes).toHaveBeenCalledWith(
      {
        limit: 10,
        offset: 5,
        category: 'Science',
        status: 'verified',
      },
      TEST_ACCOUNT
    );
  });

  it('maps error when getUserQuizzes returns failure', async () => {
    vi.mocked(getUserQuizzes).mockResolvedValue({
      success: false,
      error: 'Failed to fetch your quizzes.',
      code: 'FETCH_FAILED',
    });

    const res = await getUserQuizzesRoute(get('http://localhost/api/v1/profile/quizzes', validToken));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('FETCH_FAILED');
  });
});

// ==========================================
// 11. Profile: GET /api/v1/profile/export
// ==========================================
describe('GET /api/v1/profile/export', () => {
  const sampleExportData = {
    accountId: TEST_ACCOUNT.id,
    exportedAt: '2026-01-01T00:00:00Z',
    version: '1.0',
    quizzes: [],
    stats: [],
    isTruncated: false,
  };

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await exportUserDataRoute(get('http://localhost/api/v1/profile/export'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('exports user data on success', async () => {
    vi.mocked(exportUserData).mockResolvedValue({
      success: true,
      data: sampleExportData,
    });

    const res = await exportUserDataRoute(get('http://localhost/api/v1/profile/export', validToken));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(sampleExportData);
    expect(exportUserData).toHaveBeenCalledWith(TEST_ACCOUNT);
  });

  it('maps error when exportUserData returns failure', async () => {
    vi.mocked(exportUserData).mockResolvedValue({
      success: false,
      error: 'Failed to generate secure backup.',
      code: 'EXPORT_FAILED',
    });

    const res = await exportUserDataRoute(get('http://localhost/api/v1/profile/export', validToken));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('EXPORT_FAILED');
  });
});

// ==========================================
// 12. Profile: GET /api/v1/profile/analytics
// ==========================================
describe('GET /api/v1/profile/analytics', () => {
  const sampleAnalytics = [
    { question_id: '22222222-2222-4000-8000-222222222222', prompt: 'What is 2+2?', play_count: 50, accuracy_rate: 0.8 },
  ];

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await getAnalyticsRoute(get('http://localhost/api/v1/profile/analytics'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns analytics on success', async () => {
    vi.mocked(getQuestionAnalytics).mockResolvedValue({
      success: true,
      data: sampleAnalytics,
    });

    const res = await getAnalyticsRoute(get('http://localhost/api/v1/profile/analytics', validToken));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(sampleAnalytics);
    expect(getQuestionAnalytics).toHaveBeenCalledWith(TEST_ACCOUNT);
  });

  it('maps error when getQuestionAnalytics returns failure', async () => {
    vi.mocked(getQuestionAnalytics).mockResolvedValue({
      success: false,
      error: 'Failed to fetch analytics.',
    });

    const res = await getAnalyticsRoute(get('http://localhost/api/v1/profile/analytics', validToken));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

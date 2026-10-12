import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Import the SDK from source so type-check does not depend on a prior build
import {
  QuickQuizClient,
  QuickQuizError,
  AuthResource,
  QuestionsResource,
  QuizResource,
  LeaderboardResource,
  CommunityResource,
  GroupsResource,
  DiscoveryResource,
  ProfileResource,
  type ClientQuestion,
  type AnswerSubmissionResult,
  type AuthResult,
  type AuthSession,
} from '../packages/sdk/src';

import {
  createTokenVerifier,
  getBearerToken,
  withQuickQuizAuth,
  quickQuizAuth,
} from '../packages/sdk/src/server';

// Route handlers under test
import { POST as signupRoute } from '@/app/api/v1/auth/signup/route';
import { POST as signinRoute } from '@/app/api/v1/auth/signin/route';
import { GET as sessionRoute } from '@/app/api/v1/auth/session/route';
import { POST as signoutRoute } from '@/app/api/v1/auth/signout/route';
import { GET as getRandomQuestionRoute } from '@/app/api/v1/questions/random/route';
import { GET as getQuestionCountRoute } from '@/app/api/v1/questions/count/route';
import { GET as getQuestionByIdRoute } from '@/app/api/v1/questions/[id]/route';
import { POST as submitAnswerRoute } from '@/app/api/v1/quiz/answer/route';

// Underlying services mocked for handler execution
import { signUpAccount, signInAccount } from '@/lib/services/credentials';
import { issueMobileAuthToken, verifyMobileAuthToken } from '@/lib/services/mobile-auth';
import { fetchRandomQuestion, getQuestionCount, getPublicQuestion } from '@/lib/actions/question-actions';
import { submitAnswer } from '@/lib/actions/quiz-actions';
import { getSessionInfo } from '@/lib/actions/auth-actions';

vi.mock('@/lib/services/credentials', () => ({
  signUpAccount: vi.fn(),
  signInAccount: vi.fn(),
  signInAccountWithGoogle: vi.fn(),
}));

vi.mock('@/lib/services/mobile-auth', () => ({
  issueMobileAuthToken: vi.fn(),
  verifyMobileAuthToken: vi.fn(),
}));

vi.mock('@/lib/actions/question-actions', () => ({
  fetchRandomQuestion: vi.fn(),
  getQuestionCount: vi.fn(),
  getPublicQuestion: vi.fn(),
  getTopics: vi.fn(),
}));

vi.mock('@/lib/actions/quiz-actions', () => ({
  submitAnswer: vi.fn(),
  getAnswerHistory: vi.fn(),
  getUserStats: vi.fn(),
}));

vi.mock('@/lib/actions/auth-actions', () => ({
  getSessionInfo: vi.fn(),
  requestEmailCode: vi.fn(),
  verifyEmailCode: vi.fn(),
  signOut: vi.fn(),
}));

describe('SDK End-to-End Integration Tests', () => {
  const BASE_URL = 'https://api.quickquiz.app';

  const mockUser = {
    id: 'user-integration-1',
    username: 'testrunner',
  };

  const validJwt = 'valid.jwt.token';

  // Custom fetch function that dispatches directly to Next.js API route handlers
  const routerFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(rawUrl);
    const method = init?.method ?? (typeof input === 'object' && 'method' in input ? (input as Request).method : 'GET') ?? 'GET';

    const headers = new Headers(init?.headers);

    const nextReq = new NextRequest(url.toString(), {
      method,
      headers,
      body: init?.body as BodyInit | undefined,
    });

    const pathname = url.pathname;

    // Route dispatch
    if (pathname === '/v1/auth/signup' && method === 'POST') {
      return signupRoute(nextReq);
    }
    if (pathname === '/v1/auth/signin' && method === 'POST') {
      return signinRoute(nextReq);
    }
    if (pathname === '/v1/auth/session' && method === 'GET') {
      return sessionRoute(nextReq);
    }
    if (pathname === '/v1/auth/signout' && method === 'POST') {
      return signoutRoute(nextReq);
    }
    if (pathname === '/v1/questions/random' && method === 'GET') {
      return getRandomQuestionRoute(nextReq);
    }
    if (pathname === '/v1/questions/count' && method === 'GET') {
      return getQuestionCountRoute();
    }
    if (pathname.startsWith('/v1/questions/') && method === 'GET') {
      const id = decodeURIComponent(pathname.replace('/v1/questions/', ''));
      return getQuestionByIdRoute(nextReq, { params: Promise.resolve({ id }) });
    }
    if (pathname === '/v1/quiz/answer' && method === 'POST') {
      return submitAnswerRoute(nextReq);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'NOT_FOUND', message: `Route not found: ${pathname}` },
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };

  let client: QuickQuizClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QuickQuizClient({
      baseUrl: BASE_URL,
      fetch: routerFetch,
    });
  });

  describe('SDK Client Instantiation & Packaging', () => {
    it('exposes all resource modules and methods from the built bundle', () => {
      expect(client).toBeInstanceOf(QuickQuizClient);
      expect(client.auth).toBeInstanceOf(AuthResource);
      expect(client.questions).toBeInstanceOf(QuestionsResource);
      expect(client.quiz).toBeInstanceOf(QuizResource);
      expect(client.leaderboard).toBeInstanceOf(LeaderboardResource);
      expect(client.community).toBeInstanceOf(CommunityResource);
      expect(client.groups).toBeInstanceOf(GroupsResource);
      expect(client.discovery).toBeInstanceOf(DiscoveryResource);
      expect(client.profile).toBeInstanceOf(ProfileResource);
      expect(client.getToken()).toBeNull();
    });

    it('exposes server sub-bundle exports', () => {
      expect(typeof createTokenVerifier).toBe('function');
      expect(typeof getBearerToken).toBe('function');
      expect(typeof withQuickQuizAuth).toBe('function');
      expect(typeof quickQuizAuth).toBe('function');
    });
  });

  describe('Authentication Flow', () => {
    it('registers user, updates token on client, and returns AuthResult', async () => {
      vi.mocked(signUpAccount).mockResolvedValue({
        ok: true,
        account: mockUser,
      });
      vi.mocked(issueMobileAuthToken).mockReturnValue('new-registered-jwt');

      const result: AuthResult = await client.auth.signUp('testrunner', 'secretpass123');

      expect(signUpAccount).toHaveBeenCalledWith('testrunner', 'secretpass123');
      expect(issueMobileAuthToken).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({
        token: 'new-registered-jwt',
        accountId: mockUser.id,
      });
      expect(client.getToken()).toBe('new-registered-jwt');
    });

    it('signs in user, updates client token, and fetches active session', async () => {
      vi.mocked(signInAccount).mockResolvedValue({
        ok: true,
        account: mockUser,
      });
      vi.mocked(issueMobileAuthToken).mockReturnValue(validJwt);
      vi.mocked(verifyMobileAuthToken).mockReturnValue(mockUser);
      vi.mocked(getSessionInfo).mockResolvedValue(mockUser);

      // Sign in
      const authResult = await client.auth.signIn('testrunner', 'secretpass123');
      expect(authResult.token).toBe(validJwt);
      expect(authResult.accountId).toBe(mockUser.id);
      expect(client.getToken()).toBe(validJwt);

      // Fetch session with the newly acquired token
      const sessionResult: AuthSession = await client.auth.session();
      expect(verifyMobileAuthToken).toHaveBeenCalledWith(validJwt);
      expect(sessionResult).toEqual({
        id: mockUser.id,
        username: mockUser.username,
      });
    });

    it('fails sign-in with invalid credentials and throws QuickQuizError with 401 status', async () => {
      vi.mocked(signInAccount).mockResolvedValue({
        ok: false,
        error: 'Invalid username or password',
      });

      await expect(client.auth.signIn('testrunner', 'wrongpass')).rejects.toThrow(QuickQuizError);

      try {
        await client.auth.signIn('testrunner', 'wrongpass');
        expect.unreachable('Should have thrown QuickQuizError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(QuickQuizError);
        const qe = err as QuickQuizError;
        expect(qe.status).toBe(401);
        expect(qe.code).toBe('UNAUTHORIZED');
        expect(qe.message).toContain('Invalid username or password');
      }
    });

    it('signs out user via POST /v1/auth/signout, returns { ok: true }, and clears token on client', async () => {
      client.setToken(validJwt);
      vi.mocked(verifyMobileAuthToken).mockReturnValue(mockUser);
      expect(client.getToken()).toBe(validJwt);

      const res = await client.auth.signOut();
      expect(verifyMobileAuthToken).toHaveBeenCalledWith(validJwt);
      expect(res).toEqual({ ok: true });
      expect(client.getToken()).toBeNull();
    });
  });

  describe('Questions Resource Flow', () => {
    it('fetches a random question with category and exclude filters', async () => {
      const mockQuestion = {
        id: 'q-42',
        prompt: 'What is the speed of light?',
        options: ['300,000 km/s', '150,000 km/s', '1,000 km/s', 'Infinite'],
        category: 'Physics',
        created_by: 'author-1',
        status: 'verified' as const,
      };

      vi.mocked(fetchRandomQuestion).mockResolvedValue(mockQuestion);

      const question: ClientQuestion | null = await client.questions.random({
        category: 'Physics',
        exclude: ['q-1', 'q-2'],
      });

      expect(fetchRandomQuestion).toHaveBeenCalledWith(['q-1', 'q-2'], 'Physics');
      expect(question).toEqual(mockQuestion);
      expect(question?.id).toBe('q-42');
      expect(question?.prompt).toBe('What is the speed of light?');
    });

    it('fetches total verified question count', async () => {
      vi.mocked(getQuestionCount).mockResolvedValue(128);

      const res = await client.questions.count();
      expect(res).toEqual({ count: 128 });
      expect(getQuestionCount).toHaveBeenCalledTimes(1);
    });

    it('retrieves a question by id', async () => {
      const mockQuestion = {
        id: 'q-99',
        prompt: 'What is the chemical formula for water?',
        options: ['H2O', 'CO2', 'NaCl', 'CH4'],
        category: 'Chemistry',
        created_by: 'author-2',
        status: 'verified' as const,
      };

      vi.mocked(getPublicQuestion).mockResolvedValue(mockQuestion);

      const question = await client.questions.get('q-99');
      expect(getPublicQuestion).toHaveBeenCalledWith('q-99');
      expect(question).toEqual(mockQuestion);
    });

    it('throws QuickQuizError with 404 when question is not found', async () => {
      vi.mocked(getPublicQuestion).mockResolvedValue(null);

      await expect(client.questions.get('missing-id')).rejects.toThrow(QuickQuizError);

      try {
        await client.questions.get('missing-id');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(QuickQuizError);
        const qe = err as QuickQuizError;
        expect(qe.status).toBe(404);
        expect(qe.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('Quiz Answer Submission Flow', () => {
    it('submits answer with authentication token and returns AnswerSubmissionResult', async () => {
      client.setToken(validJwt);
      vi.mocked(verifyMobileAuthToken).mockReturnValue(mockUser);

      const mockSubmission: AnswerSubmissionResult = {
        isCorrect: true,
        correctIndex: 0,
        recorded: true,
        explanation: '300,000 km/s is correct!',
      };

      vi.mocked(submitAnswer).mockResolvedValue(mockSubmission);

      const result: AnswerSubmissionResult = await client.quiz.submitAnswer('q-42', 0);

      expect(verifyMobileAuthToken).toHaveBeenCalledWith(validJwt);
      expect(submitAnswer).toHaveBeenCalledWith(
        { questionId: 'q-42', answerIndex: 0 },
        mockUser
      );
      expect(result).toEqual(mockSubmission);
      expect(result.isCorrect).toBe(true);
      expect(result.correctIndex).toBe(0);
      expect(result.recorded).toBe(true);
    });

    it('rejects answer submission without authentication token with 401 QuickQuizError', async () => {
      client.setToken(null);

      await expect(client.quiz.submitAnswer('q-42', 1)).rejects.toThrow(QuickQuizError);

      try {
        await client.quiz.submitAnswer('q-42', 1);
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(QuickQuizError);
        const qe = err as QuickQuizError;
        expect(qe.status).toBe(401);
        expect(qe.code).toBe('UNAUTHORIZED');
        expect(qe.message).toContain('Authentication token required');
      }
    });

    it('rejects answer submission with invalid token with 401 QuickQuizError', async () => {
      client.setToken('expired.jwt.token');
      vi.mocked(verifyMobileAuthToken).mockReturnValue(null);

      try {
        await client.quiz.submitAnswer('q-42', 1);
        expect.unreachable('Should have failed');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(QuickQuizError);
        const qe = err as QuickQuizError;
        expect(qe.status).toBe(401);
        expect(qe.code).toBe('UNAUTHORIZED');
        expect(qe.message).toContain('Invalid or expired token');
      }
    });
  });

  describe('Error Handling and Network Resilience', () => {
    it('handles 404 for unrouted paths with NOT_FOUND QuickQuizError', async () => {
      try {
        await client.request('/v1/nonexistent/resource');
        expect.unreachable('Should have failed');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(QuickQuizError);
        const qe = err as QuickQuizError;
        expect(qe.status).toBe(404);
        expect(qe.code).toBe('NOT_FOUND');
      }
    });

    it('wraps fetch network errors into QuickQuizError with status 0 and code NETWORK_ERROR', async () => {
      const failingClient = new QuickQuizClient({
        baseUrl: BASE_URL,
        fetch: async () => {
          throw new Error('fetch failed: ECONNREFUSED');
        },
      });

      await expect(failingClient.questions.random()).rejects.toThrow(QuickQuizError);

      try {
        await failingClient.questions.random();
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(QuickQuizError);
        const qe = err as QuickQuizError;
        expect(qe.status).toBe(0);
        expect(qe.code).toBe('NETWORK_ERROR');
        expect(qe.message).toContain('fetch failed: ECONNREFUSED');
      }
    });

    it('handles invalid JSON responses gracefully with status-aware error code', async () => {
      const brokenJsonClient = new QuickQuizClient({
        baseUrl: BASE_URL,
        fetch: async () =>
          new Response('<html>Bad Gateway</html>', {
            status: 502,
            headers: { 'Content-Type': 'text/html' },
          }),
      });

      try {
        await brokenJsonClient.questions.random();
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(QuickQuizError);
        const qe = err as QuickQuizError;
        expect(qe.status).toBe(502);
        expect(qe.code).toBe('SERVER_ERROR');
      }
    });
  });
});

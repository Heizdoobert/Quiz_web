import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createQuestionRoute } from '@/app/api/v1/questions/route';
import { POST as generateQuestionRoute } from '@/app/api/v1/questions/generate/route';
import { POST as disputeQuestionRoute } from '@/app/api/v1/questions/[id]/dispute/route';
import { GET as get5050Route } from '@/app/api/v1/questions/[id]/5050/route';

import {
  createQuestion,
  generateQuestion,
  disputeQuestion,
  get5050EliminatedIndices,
} from '@/lib/actions/question-actions';
import { issueMobileAuthToken } from '@/lib/services/mobile-auth';

vi.mock('@/lib/actions/question-actions', () => ({
  createQuestion: vi.fn(),
  generateQuestion: vi.fn(),
  disputeQuestion: vi.fn(),
  get5050EliminatedIndices: vi.fn(),
}));

function post(url: string, body: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
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
const TEST_ACCOUNT = { id: '00000000-0000-4000-8000-000000000001', username: 'tester' };
let validToken: string;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SECRET_KEY', TEST_SECRET);
  validToken = issueMobileAuthToken(TEST_ACCOUNT)!;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/v1/questions', () => {
  const sampleQuestion = {
    prompt: 'What is the capital of France?',
    options: ['Paris', 'London', 'Berlin', 'Rome'],
    correctIndex: 0,
    category: 'Geography',
    explanation: 'Paris is the capital of France.',
  };

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await createQuestionRoute(post('http://localhost/api/v1/questions', sampleQuestion));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED when an invalid token is provided', async () => {
    const res = await createQuestionRoute(post('http://localhost/api/v1/questions', sampleQuestion, 'invalid-token'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('successfully creates question, passing body and auth account to createQuestion', async () => {
    vi.mocked(createQuestion).mockResolvedValue({ success: true, data: undefined });

    const res = await createQuestionRoute(post('http://localhost/api/v1/questions', sampleQuestion, validToken));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(createQuestion).toHaveBeenCalledWith(sampleQuestion, expect.objectContaining({ id: TEST_ACCOUNT.id }));
  });

  it('maps 400 VALIDATION_ERROR when createQuestion returns validation error', async () => {
    vi.mocked(createQuestion).mockResolvedValue({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Question prompt is required.' },
    });

    const res = await createQuestionRoute(post('http://localhost/api/v1/questions', {}, validToken));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toBe('Question prompt is required.');
  });

  it('maps 429 RATE_LIMITED when createQuestion returns rate limit error', async () => {
    vi.mocked(createQuestion).mockResolvedValue({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'You can add up to 5 questions per day.' },
    });

    const res = await createQuestionRoute(post('http://localhost/api/v1/questions', sampleQuestion, validToken));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('RATE_LIMITED');
  });

  it('maps 500 SERVER_ERROR when createQuestion returns server error', async () => {
    vi.mocked(createQuestion).mockResolvedValue({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to add question.' },
    });

    const res = await createQuestionRoute(post('http://localhost/api/v1/questions', sampleQuestion, validToken));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });

  it('returns 500 SERVER_ERROR when createQuestion throws an unexpected error', async () => {
    vi.mocked(createQuestion).mockRejectedValue(new Error('Database connection failed'));

    const res = await createQuestionRoute(post('http://localhost/api/v1/questions', sampleQuestion, validToken));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

describe('POST /api/v1/questions/generate', () => {
  const sampleGeneratedQuestion = {
    prompt: 'What is the speed of light?',
    options: ['299,792 km/s', '150,000 km/s', '1,000 km/s', 'Infinite'],
    correctIndex: 0,
    explanation: 'Light travels at roughly 300,000 km/s.',
  };

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await generateQuestionRoute(post('http://localhost/api/v1/questions/generate', { topic: 'Physics' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED when an invalid token is provided', async () => {
    const res = await generateQuestionRoute(
      post('http://localhost/api/v1/questions/generate', { topic: 'Physics' }, 'bad-token')
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 VALIDATION_ERROR when topic is missing or invalid', async () => {
    const res1 = await generateQuestionRoute(post('http://localhost/api/v1/questions/generate', {}, validToken));
    expect(res1.status).toBe(400);
    const json1 = await res1.json();
    expect(json1.success).toBe(false);
    expect(json1.error.code).toBe('VALIDATION_ERROR');

    const res2 = await generateQuestionRoute(
      post('http://localhost/api/v1/questions/generate', { topic: '   ' }, validToken)
    );
    expect(res2.status).toBe(400);
    const json2 = await res2.json();
    expect(json2.success).toBe(false);
    expect(json2.error.code).toBe('VALIDATION_ERROR');
  });

  it('successfully generates question, passing topic and auth account to generateQuestion', async () => {
    vi.mocked(generateQuestion).mockResolvedValue({ success: true, data: sampleGeneratedQuestion });

    const res = await generateQuestionRoute(
      post('http://localhost/api/v1/questions/generate', { topic: 'Physics' }, validToken)
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(sampleGeneratedQuestion);
    expect(generateQuestion).toHaveBeenCalledWith('Physics', expect.objectContaining({ id: TEST_ACCOUNT.id }));
  });

  it('maps 429 RATE_LIMITED when generateQuestion returns rate limit', async () => {
    vi.mocked(generateQuestion).mockResolvedValue({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'You have reached the limit of 3 AI generations per day.' },
    });

    const res = await generateQuestionRoute(
      post('http://localhost/api/v1/questions/generate', { topic: 'Physics' }, validToken)
    );
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('RATE_LIMITED');
  });

  it('maps 500 SERVER_ERROR when generateQuestion returns server error', async () => {
    vi.mocked(generateQuestion).mockResolvedValue({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate question.' },
    });

    const res = await generateQuestionRoute(
      post('http://localhost/api/v1/questions/generate', { topic: 'Physics' }, validToken)
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });

  it('returns 500 SERVER_ERROR when generateQuestion throws', async () => {
    vi.mocked(generateQuestion).mockRejectedValue(new Error('AI generation crashed'));

    const res = await generateQuestionRoute(
      post('http://localhost/api/v1/questions/generate', { topic: 'Physics' }, validToken)
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

describe('POST /api/v1/questions/[id]/dispute', () => {
  const questionId = '00000000-0000-4000-8000-000000000002';

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await disputeQuestionRoute(
      post(`http://localhost/api/v1/questions/${questionId}/dispute`, { reason: 'Incorrect option' }),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED when an invalid token is provided', async () => {
    const res = await disputeQuestionRoute(
      post(`http://localhost/api/v1/questions/${questionId}/dispute`, { reason: 'Incorrect option' }, 'bad-token'),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 VALIDATION_ERROR when question id is missing', async () => {
    const res = await disputeQuestionRoute(
      post('http://localhost/api/v1/questions//dispute', { reason: 'Incorrect option' }, validToken),
      { params: Promise.resolve({ id: '' }) }
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('successfully disputes question and returns 200 with result data', async () => {
    vi.mocked(disputeQuestion).mockResolvedValue({ success: true, data: { quarantined: true } });

    const res = await disputeQuestionRoute(
      post(`http://localhost/api/v1/questions/${questionId}/dispute`, { reason: 'Incorrect answer' }, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ quarantined: true });
    expect(disputeQuestion).toHaveBeenCalledWith(
      { questionId, reason: 'Incorrect answer' },
      expect.objectContaining({ id: TEST_ACCOUNT.id })
    );
  });

  it('works when params is an object rather than a Promise', async () => {
    vi.mocked(disputeQuestion).mockResolvedValue({ success: true, data: { quarantined: false } });

    const res = await disputeQuestionRoute(
      post(`http://localhost/api/v1/questions/${questionId}/dispute`, { reason: 'Typo' }, validToken),
      { params: { id: questionId } }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ quarantined: false });
  });

  it('maps 400 VALIDATION_ERROR when disputeQuestion returns validation error', async () => {
    vi.mocked(disputeQuestion).mockResolvedValue({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Question and dispute reason are required.' },
    });

    const res = await disputeQuestionRoute(
      post(`http://localhost/api/v1/questions/${questionId}/dispute`, {}, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('maps 401 UNAUTHORIZED when disputeQuestion returns unauthorized', async () => {
    vi.mocked(disputeQuestion).mockResolvedValue({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Answer this question before reporting it.' },
    });

    const res = await disputeQuestionRoute(
      post(`http://localhost/api/v1/questions/${questionId}/dispute`, { reason: 'Bad option' }, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('maps 409 CONFLICT when disputeQuestion returns conflict', async () => {
    vi.mocked(disputeQuestion).mockResolvedValue({
      success: false,
      error: { code: 'CONFLICT', message: 'You have already reported this question.' },
    });

    const res = await disputeQuestionRoute(
      post(`http://localhost/api/v1/questions/${questionId}/dispute`, { reason: 'Bad option' }, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('CONFLICT');
  });

  it('maps 500 SERVER_ERROR when disputeQuestion returns server error', async () => {
    vi.mocked(disputeQuestion).mockResolvedValue({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to submit dispute.' },
    });

    const res = await disputeQuestionRoute(
      post(`http://localhost/api/v1/questions/${questionId}/dispute`, { reason: 'Bad option' }, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });

  it('returns 500 SERVER_ERROR when disputeQuestion throws an error', async () => {
    vi.mocked(disputeQuestion).mockRejectedValue(new Error('Dispute query error'));

    const res = await disputeQuestionRoute(
      post(`http://localhost/api/v1/questions/${questionId}/dispute`, { reason: 'Bad option' }, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

describe('GET /api/v1/questions/[id]/5050', () => {
  const questionId = '00000000-0000-4000-8000-000000000002';

  it('returns 401 UNAUTHORIZED when no token is provided', async () => {
    const res = await get5050Route(
      get(`http://localhost/api/v1/questions/${questionId}/5050`),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED when an invalid token is provided', async () => {
    const res = await get5050Route(
      get(`http://localhost/api/v1/questions/${questionId}/5050`, 'bad-token'),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 VALIDATION_ERROR when question id is missing', async () => {
    const res = await get5050Route(
      get('http://localhost/api/v1/questions//5050', validToken),
      { params: Promise.resolve({ id: '' }) }
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('successfully retrieves 50/50 eliminated indices and returns 200 with indices', async () => {
    vi.mocked(get5050EliminatedIndices).mockResolvedValue([1, 3]);

    const res = await get5050Route(
      get(`http://localhost/api/v1/questions/${questionId}/5050`, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual([1, 3]);
    expect(get5050EliminatedIndices).toHaveBeenCalledWith(questionId);
  });

  it('works when params is an object rather than a Promise', async () => {
    vi.mocked(get5050EliminatedIndices).mockResolvedValue([0, 2]);

    const res = await get5050Route(
      get(`http://localhost/api/v1/questions/${questionId}/5050`, validToken),
      { params: { id: questionId } }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual([0, 2]);
  });

  it('returns 200 with empty array when no indices eliminated', async () => {
    vi.mocked(get5050EliminatedIndices).mockResolvedValue([]);

    const res = await get5050Route(
      get(`http://localhost/api/v1/questions/${questionId}/5050`, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual([]);
  });

  it('returns 500 SERVER_ERROR when get5050EliminatedIndices throws', async () => {
    vi.mocked(get5050EliminatedIndices).mockRejectedValue(new Error('Calculation failed'));

    const res = await get5050Route(
      get(`http://localhost/api/v1/questions/${questionId}/5050`, validToken),
      { params: Promise.resolve({ id: questionId }) }
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

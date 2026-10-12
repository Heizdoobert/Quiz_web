import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getRandomQuestion } from '@/app/api/v1/questions/random/route';
import { GET as getQuestionCountRoute } from '@/app/api/v1/questions/count/route';
import { GET as getQuestionById } from '@/app/api/v1/questions/[id]/route';
import { GET as getTopicsRoute } from '@/app/api/v1/topics/route';
import { GET as getTopicQuestionsRoute } from '@/app/api/v1/topics/[topic]/questions/route';
import { GET as searchRoute } from '@/app/api/v1/search/route';

import {
  fetchRandomQuestion,
  getQuestionCount,
  getPublicQuestion,
  getTopics,
} from '@/lib/actions/question-actions';
import {
  searchQuestions,
  getTopicQuestions,
} from '@/lib/actions/discovery-actions';

vi.mock('@/lib/actions/question-actions', () => ({
  fetchRandomQuestion: vi.fn(),
  getQuestionCount: vi.fn(),
  getPublicQuestion: vi.fn(),
  getTopics: vi.fn(),
}));

vi.mock('@/lib/actions/discovery-actions', () => ({
  searchQuestions: vi.fn(),
  getTopicQuestions: vi.fn(),
}));

function get(url: string) {
  return new NextRequest(url, { method: 'GET' });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/v1/questions/random', () => {
  it('returns a random question with default parameters', async () => {
    const mockQuestion = {
      id: 'q-1',
      category: 'Science',
      prompt: 'What is H2O?',
      options: ['Water', 'Oxygen', 'Hydrogen', 'Helium'],
      created_by: 'user-1',
      status: 'verified' as const,
    };
    vi.mocked(fetchRandomQuestion).mockResolvedValue(mockQuestion);

    const res = await getRandomQuestion(get('http://localhost/api/v1/questions/random'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockQuestion);
    expect(fetchRandomQuestion).toHaveBeenCalledWith([], undefined);
  });

  it('parses category query parameter', async () => {
    vi.mocked(fetchRandomQuestion).mockResolvedValue(null);

    const res = await getRandomQuestion(get('http://localhost/api/v1/questions/random?category=History'));
    expect(res.status).toBe(200);
    expect(fetchRandomQuestion).toHaveBeenCalledWith([], 'History');
  });

  it('parses comma-separated exclude parameter', async () => {
    vi.mocked(fetchRandomQuestion).mockResolvedValue(null);

    const res = await getRandomQuestion(
      get('http://localhost/api/v1/questions/random?exclude=id-1,id-2,id-3')
    );
    expect(res.status).toBe(200);
    expect(fetchRandomQuestion).toHaveBeenCalledWith(['id-1', 'id-2', 'id-3'], undefined);
  });

  it('parses both category and exclude parameters', async () => {
    vi.mocked(fetchRandomQuestion).mockResolvedValue(null);

    const res = await getRandomQuestion(
      get('http://localhost/api/v1/questions/random?category=Art&exclude=id-1,id-2')
    );
    expect(res.status).toBe(200);
    expect(fetchRandomQuestion).toHaveBeenCalledWith(['id-1', 'id-2'], 'Art');
  });

  it('returns 200 with null data when no question is available', async () => {
    vi.mocked(fetchRandomQuestion).mockResolvedValue(null);

    const res = await getRandomQuestion(get('http://localhost/api/v1/questions/random'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeNull();
  });

  it('returns 500 SERVER_ERROR when fetchRandomQuestion throws', async () => {
    vi.mocked(fetchRandomQuestion).mockRejectedValue(new Error('DB failure'));

    const res = await getRandomQuestion(get('http://localhost/api/v1/questions/random'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

describe('GET /api/v1/questions/count', () => {
  it('returns question count wrapped in apiOk', async () => {
    vi.mocked(getQuestionCount).mockResolvedValue(142);

    const res = await getQuestionCountRoute();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ count: 142 });
    expect(getQuestionCount).toHaveBeenCalledTimes(1);
  });

  it('returns 500 SERVER_ERROR when getQuestionCount throws', async () => {
    vi.mocked(getQuestionCount).mockRejectedValue(new Error('DB error'));

    const res = await getQuestionCountRoute();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

describe('GET /api/v1/questions/[id]', () => {
  const sampleQuestion = {
    id: '11111111-2222-3333-4444-555555555555',
    category: 'Geography',
    prompt: 'What is the capital of France?',
    options: ['Paris', 'London', 'Berlin', 'Madrid'],
    created_by: 'author-1',
    status: 'verified' as const,
  };

  it('returns question when found', async () => {
    vi.mocked(getPublicQuestion).mockResolvedValue(sampleQuestion);

    const res = await getQuestionById(
      get(`http://localhost/api/v1/questions/${sampleQuestion.id}`),
      { params: Promise.resolve({ id: sampleQuestion.id }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(sampleQuestion);
    expect(getPublicQuestion).toHaveBeenCalledWith(sampleQuestion.id);
  });

  it('returns 404 NOT_FOUND when question is not found', async () => {
    vi.mocked(getPublicQuestion).mockResolvedValue(null);

    const res = await getQuestionById(
      get('http://localhost/api/v1/questions/nonexistent-id'),
      { params: Promise.resolve({ id: 'nonexistent-id' }) }
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
    expect(json.error.message).toBe('Question not found');
  });

  it('returns 500 SERVER_ERROR when getPublicQuestion throws', async () => {
    vi.mocked(getPublicQuestion).mockRejectedValue(new Error('Crash'));

    const res = await getQuestionById(
      get('http://localhost/api/v1/questions/some-id'),
      { params: Promise.resolve({ id: 'some-id' }) }
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

describe('GET /api/v1/topics', () => {
  it('returns list of topics', async () => {
    const mockTopics = [
      { name: 'Science', questionCount: 10, latestAt: '2026-10-12T00:00:00Z' },
      { name: 'History', questionCount: 5, latestAt: '2026-10-11T00:00:00Z' },
    ];
    vi.mocked(getTopics).mockResolvedValue(mockTopics);

    const res = await getTopicsRoute();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockTopics);
    expect(getTopics).toHaveBeenCalledTimes(1);
  });

  it('returns 500 SERVER_ERROR when getTopics throws', async () => {
    vi.mocked(getTopics).mockRejectedValue(new Error('Topics DB crash'));

    const res = await getTopicsRoute();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

describe('GET /api/v1/topics/[topic]/questions', () => {
  const sampleResults = {
    results: [
      {
        id: 'q-t1',
        prompt: 'What is DeFi?',
        category: 'Crypto',
        authorName: 'Satoshi',
        createdAt: '2026-10-10T00:00:00Z',
        score: 0,
      },
    ],
    hasMore: false,
  };

  it('returns topic questions with default page 1', async () => {
    vi.mocked(getTopicQuestions).mockResolvedValue(sampleResults);

    const res = await getTopicQuestionsRoute(
      get('http://localhost/api/v1/topics/Crypto/questions'),
      { params: Promise.resolve({ topic: 'Crypto' }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(sampleResults);
    expect(getTopicQuestions).toHaveBeenCalledWith('Crypto', 1);
  });

  it('decodes URL-encoded topic name', async () => {
    vi.mocked(getTopicQuestions).mockResolvedValue(sampleResults);

    const res = await getTopicQuestionsRoute(
      get('http://localhost/api/v1/topics/Computer%20Science/questions'),
      { params: Promise.resolve({ topic: 'Computer%20Science' }) }
    );
    expect(res.status).toBe(200);
    expect(getTopicQuestions).toHaveBeenCalledWith('Computer Science', 1);
  });

  it('parses page query parameter', async () => {
    vi.mocked(getTopicQuestions).mockResolvedValue(sampleResults);

    const res = await getTopicQuestionsRoute(
      get('http://localhost/api/v1/topics/Crypto/questions?page=3'),
      { params: Promise.resolve({ topic: 'Crypto' }) }
    );
    expect(res.status).toBe(200);
    expect(getTopicQuestions).toHaveBeenCalledWith('Crypto', 3);
  });

  it('calculates page from limit and offset query parameters', async () => {
    vi.mocked(getTopicQuestions).mockResolvedValue(sampleResults);

    const res = await getTopicQuestionsRoute(
      get('http://localhost/api/v1/topics/Crypto/questions?limit=10&offset=20'),
      { params: Promise.resolve({ topic: 'Crypto' }) }
    );
    expect(res.status).toBe(200);
    expect(getTopicQuestions).toHaveBeenCalledWith('Crypto', 3);
  });

  it('returns 500 SERVER_ERROR when getTopicQuestions throws', async () => {
    vi.mocked(getTopicQuestions).mockRejectedValue(new Error('Topic questions failure'));

    const res = await getTopicQuestionsRoute(
      get('http://localhost/api/v1/topics/Crypto/questions'),
      { params: Promise.resolve({ topic: 'Crypto' }) }
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

describe('GET /api/v1/search', () => {
  const sampleSearchResults = {
    results: [
      {
        id: 'q-s1',
        prompt: 'Search query match',
        category: 'Science',
        authorName: 'Ada',
        createdAt: '2026-10-10T00:00:00Z',
        score: 10,
      },
    ],
    hasMore: false,
  };

  it('returns search results for query q', async () => {
    vi.mocked(searchQuestions).mockResolvedValue(sampleSearchResults);

    const res = await searchRoute(get('http://localhost/api/v1/search?q=quantum'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(sampleSearchResults);
    expect(searchQuestions).toHaveBeenCalledWith('quantum', 1);
  });

  it('parses page query parameter for search', async () => {
    vi.mocked(searchQuestions).mockResolvedValue(sampleSearchResults);

    const res = await searchRoute(get('http://localhost/api/v1/search?q=quantum&page=2'));
    expect(res.status).toBe(200);
    expect(searchQuestions).toHaveBeenCalledWith('quantum', 2);
  });

  it('calculates page from limit and offset query parameters', async () => {
    vi.mocked(searchQuestions).mockResolvedValue(sampleSearchResults);

    const res = await searchRoute(get('http://localhost/api/v1/search?q=quantum&limit=20&offset=40'));
    expect(res.status).toBe(200);
    expect(searchQuestions).toHaveBeenCalledWith('quantum', 3);
  });

  it('handles empty query without error', async () => {
    vi.mocked(searchQuestions).mockResolvedValue({ results: [], hasMore: false });

    const res = await searchRoute(get('http://localhost/api/v1/search'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ results: [], hasMore: false });
    expect(searchQuestions).toHaveBeenCalledWith('', 1);
  });

  it('returns 500 SERVER_ERROR when searchQuestions throws', async () => {
    vi.mocked(searchQuestions).mockRejectedValue(new Error('Search failed'));

    const res = await searchRoute(get('http://localhost/api/v1/search?q=crash'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SERVER_ERROR');
  });
});

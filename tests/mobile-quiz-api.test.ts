import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/mobile/v1/quiz/sync/route';
import { NextRequest } from 'next/server';
import * as mobileAuth from '@/lib/services/auth/mobile-auth';
import * as quizActions from '@/lib/actions/quiz-actions';

vi.mock('@/lib/services/auth/mobile-auth');
vi.mock('@/lib/actions/quiz-actions');

describe('Mobile Quiz Sync API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects future timestamps', async () => {
    vi.mocked(mobileAuth.verifyMobileAuthToken).mockReturnValue({ id: 'user1' });
    
    // Future timestamp (10 mins in future)
    const futureTime = Date.now() + 10 * 60 * 1000;
    
    const req = new NextRequest('http://localhost/api/mobile/v1/quiz/sync', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify([
        { questionId: 'q1', answerIndex: 1, timestamp: futureTime }
      ])
    });

    const res = await POST(req);
    const json = await res.json();
    
    expect(json.results['q1'].notSavedReason).toBe('error');
    expect(quizActions.submitAnswer).not.toHaveBeenCalled();
  });

  it('accepts valid timestamps and calls submitAnswer', async () => {
    vi.mocked(mobileAuth.verifyMobileAuthToken).mockReturnValue({ id: 'user1' });
    vi.mocked(quizActions.submitAnswer).mockResolvedValue({
      isCorrect: true,
      correctIndex: 1,
      explanation: 'Test',
      recorded: true,
    });
    
    const validTime = Date.now() - 1000;
    
    const req = new NextRequest('http://localhost/api/mobile/v1/quiz/sync', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify([
        { questionId: 'q2', answerIndex: 1, timestamp: validTime }
      ])
    });

    const res = await POST(req);
    const json = await res.json();
    
    expect(json.results['q2'].recorded).toBe(true);
    expect(quizActions.submitAnswer).toHaveBeenCalled();
  });

  it('processes at most 100 queued answers per request and leaves the rest for the next sync', async () => {
    vi.mocked(mobileAuth.verifyMobileAuthToken).mockReturnValue({ id: 'user1' });
    vi.mocked(quizActions.submitAnswer).mockResolvedValue({
      isCorrect: true,
      correctIndex: 1,
      explanation: null,
      recorded: true,
    });

    const items = Array.from({ length: 101 }, (_, n) => ({ questionId: `q${n}`, answerIndex: 1 }));
    const req = new NextRequest('http://localhost/api/mobile/v1/quiz/sync', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify(items),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(quizActions.submitAnswer).toHaveBeenCalledTimes(100);
    expect(Object.keys(json.results)).toHaveLength(100);
    expect(json.results['q100']).toBeUndefined();
  });
});

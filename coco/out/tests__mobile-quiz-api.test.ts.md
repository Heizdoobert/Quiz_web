# tests/mobile-quiz-api.test.ts
lines:90 exports:
---
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

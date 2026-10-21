# tests/submit-answer-achievements.test.ts
lines:51 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/questions', () => ({ questionForAnswer: vi.fn() }));
vi.mock('@/lib/db/results', () => ({ insertResult: vi.fn() }));
vi.mock('@/lib/db/achievements', () => ({ awardAchievements: vi.fn() }));
vi.mock('@/lib/services/session', () => ({ getSessionAccount: vi.fn() }));
vi.mock('@/lib/services/rate-limit', () => ({ allowAttemptFromIp: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { questionForAnswer } from '@/lib/db/questions';
import { insertResult } from '@/lib/db/results';
import { awardAchievements } from '@/lib/db/achievements';
import { getSessionAccount } from '@/lib/services/session';
import { allowAttemptFromIp } from '@/lib/services/rate-limit';
import { logger } from '@/lib/logger';
import { submitAnswer } from '@/lib/actions/quiz-actions';

const Q_ID = '00000000-0000-4000-8000-0000000000d1';
const ACCOUNT = { id: '00000000-0000-4000-8000-0000000000a1' };

beforeEach(() => {
  vi.mocked(questionForAnswer).mockReset().mockResolvedValue({ id: Q_ID, status: 'verified', correct_index: 1, explanation: null, created_by_user: null } as never);
  vi.mocked(insertResult).mockReset();
  vi.mocked(awardAchievements).mockReset().mockResolvedValue([]);
  vi.mocked(getSessionAccount).mockReset().mockResolvedValue(ACCOUNT as never);
  vi.mocked(allowAttemptFromIp).mockReset().mockResolvedValue(true as never);
  vi.mocked(logger.error).mockReset();
});

describe('submitAnswer awards achievements', () => {
  it('awards after a recorded answer', async () => {
    vi.mocked(insertResult).mockResolvedValue('recorded');
    const res = await submitAnswer({ questionId: Q_ID, answerIndex: 1 });
    expect(res.recorded).toBe(true);
    expect(awardAchievements).toHaveBeenCalledWith(ACCOUNT.id);
  });

  it('does not award for a duplicate answer', async () => {
    vi.mocked(insertResult).mockResolvedValue('duplicate');
    await submitAnswer({ questionId: Q_ID, answerIndex: 1 });

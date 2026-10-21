'use server';

import { upsertRating } from '@/lib/db/community';
import { getSessionAccount, type SessionAccount } from '@/lib/services/auth/session';
import { isUuid } from '@/lib/utils/validation';
import { logger } from '@/lib/logger';
import type { CommunityResult } from './types';
import { checkCanDiscuss } from './gate';

export async function rateQuestion(
  questionId: string,
  rating: number,
  authAccount?: SessionAccount
): Promise<CommunityResult> {
  const account = authAccount ?? (await getSessionAccount());
  if (!account) return { ok: false, code: 'UNAUTHORIZED' };
  if (!isUuid(questionId) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, code: 'INVALID' };
  }

  const gate = await checkCanDiscuss(account.id, questionId, { allowAuthor: false });
  if (!gate.ok) return gate;

  try {
    await upsertRating(questionId, account.id, rating);
  } catch (err) {
    logger.error('rateQuestion error:', err);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
}

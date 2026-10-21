import { questionForDiscussion } from '@/lib/db/community';
import { hasRecordedAnswer } from '@/lib/db/results';
import { logger } from '@/lib/logger';
import type { CommunityResult } from './types';

export async function checkCanDiscuss(
  accountId: string,
  questionId: string,
  options: { allowAuthor: boolean }
): Promise<CommunityResult> {
  // 1. The question must be public (status = 'verified')
  let question: Awaited<ReturnType<typeof questionForDiscussion>>;
  try {
    question = await questionForDiscussion(questionId);
  } catch (err) {
    logger.error('checkCanDiscuss question error:', err);
    return { ok: false, code: 'NOT_ALLOWED' };
  }
  if (!question || question.status !== 'verified') {
    return { ok: false, code: 'NOT_ALLOWED' };
  }

  // 2. Author gate
  if (!options.allowAuthor && question.created_by_user === accountId) {
    return { ok: false, code: 'NOT_ALLOWED' };
  }

  // 3. A recorded answer in quiz_results
  try {
    if (!(await hasRecordedAnswer(accountId, questionId))) return { ok: false, code: 'NOT_ANSWERED' };
  } catch (err) {
    logger.error('checkCanDiscuss answer error:', err);
    return { ok: false, code: 'NOT_ANSWERED' };
  }

  return { ok: true };
}

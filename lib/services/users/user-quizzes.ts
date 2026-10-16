import 'server-only';
import { listQuestionsByAuthor } from '@/lib/db/questions';
import { DbError } from '@/lib/db/errors';
import { logger } from '@/lib/logger';
import { ClientQuestion, GetUserQuizzesFilter, GetUserQuizzesResult } from '@/lib/types';

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 500;

// The questions an account wrote, newest first. Callers must have authenticated the account:
// the web profile through its session cookie, the mobile API through its Bearer token. Kept
// out of the 'use server' actions file so a client cannot call it with someone else's id.
export async function quizzesForAccount(
  accountId: string,
  options?: GetUserQuizzesFilter
): Promise<GetUserQuizzesResult> {
  try {
    const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(options?.offset ?? 0, 0);

    // SECURITY: public display fields only (lib/db/questions.ts listQuestionsByAuthor).
    const data = await listQuestionsByAuthor(accountId, {
      category: options?.category,
      status: options?.status,
      offset,
      limit,
    });

    const quizzes = (data as ClientQuestion[]) || [];
    return {
      success: true,
      quizzes,
      count: quizzes.length,
    };
  } catch (error: unknown) {
    logger.error('[quizzesForAccount]', error);
    if (error instanceof DbError) {
      return { success: false, error: 'Failed to fetch your quizzes.', code: 'FETCH_FAILED' };
    }
    return {
      success: false,
      error: 'An unexpected error occurred.',
      code: 'UNKNOWN_ERROR',
    };
  }
}

import 'server-only';
import { supabase } from '@/lib/supabase/supabase';
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

    // SECURITY: Select public display fields only.
    // Exclude correct_index and explanation to prevent answer leakage during quizzes.
    let query = supabase
      .from('questions')
      .select('id, category, prompt, options, status, created_at')
      .eq('created_by_user', accountId);

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return {
        success: false,
        error: 'Failed to fetch your quizzes.',
        code: 'FETCH_FAILED',
      };
    }

    const quizzes = (data as ClientQuestion[]) || [];
    return {
      success: true,
      quizzes,
      count: quizzes.length,
    };
  } catch (error: unknown) {
    logger.error('[quizzesForAccount]', error);
    return {
      success: false,
      error: 'An unexpected error occurred.',
      code: 'UNKNOWN_ERROR',
    };
  }
}

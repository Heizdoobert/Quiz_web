'use server';
import { logger } from "@/lib/logger";

import { questionsForExport } from '@/lib/db/questions';
import { resultsForExport } from '@/lib/db/results';
import { questionAnalytics } from '@/lib/db/rpc';
import { getSessionAccount, clearSessionAccount, type SessionAccount } from '@/lib/services/auth/session';
import { deleteAccount, type DeleteAccountResult } from '@/lib/services/admin/account-deletion';
import { quizzesForAccount } from '@/lib/services/users/user-quizzes';
import {
  Question,
  QuizResult,
  GetUserQuizzesFilter,
  GetUserQuizzesResult,
  ExportUserDataResult,
  UserBackupData,
} from '@/lib/types';

const MAX_EXPORT_QUIZZES = 1000;
const MAX_EXPORT_STATS = 5000;
const BACKUP_SCHEMA_VERSION = '1.0';

export async function getUserQuizzes(
  options?: GetUserQuizzesFilter,
  authAccount?: SessionAccount
): Promise<GetUserQuizzesResult> {
  const account = authAccount ?? (await getSessionAccount());
  if (!account) {
    return {
      success: false,
      error: 'Sign in to see your quizzes.',
      code: 'UNAUTHORIZED',
    };
  }
  return quizzesForAccount(account.id, options);
}

export async function exportUserData(authAccount?: SessionAccount): Promise<ExportUserDataResult> {
  try {
    // The backup holds correct answers and every recorded answer, which the public key
    // can't read, so it's read with the secret key and only for the signed-in account.
    const account = authAccount ?? (await getSessionAccount());
    if (!account) {
      return {
        success: false,
        error: 'Sign in to export your data.',
        code: 'UNAUTHORIZED',
      };
    }
    // Each read keeps its own message; a failure is logged here and reported as EXPORT_FAILED.
    const read = (label: string, p: Promise<unknown[]>) =>
      p.catch((err) => {
        logger.error(`[exportUserData:${label}]`, err);
        return null;
      });
    const [quizRows, statRows] = await Promise.all([
      read('quizzes', questionsForExport(account.id, MAX_EXPORT_QUIZZES)),
      read('stats', resultsForExport(account.id, MAX_EXPORT_STATS)),
    ]);
    if (!quizRows) {
      return { success: false, error: 'Failed to fetch quizzes for export.', code: 'EXPORT_FAILED' };
    }
    if (!statRows) {
      return { success: false, error: 'Failed to fetch stats for export.', code: 'EXPORT_FAILED' };
    }

    const quizzes = quizRows as Question[];
    const stats = statRows as QuizResult[];
    const isTruncated = quizzes.length >= MAX_EXPORT_QUIZZES || stats.length >= MAX_EXPORT_STATS;

    const exportData: UserBackupData = {
      accountId: account.id,
      exportedAt: new Date().toISOString(),
      version: BACKUP_SCHEMA_VERSION,
      quizzes,
      stats,
      isTruncated,
    };

    return {
      success: true,
      data: exportData,
    };
  } catch (error: unknown) {
    logger.error('[exportUserData]', error);
    return {
      success: false,
      error: 'Failed to generate secure backup.',
      code: 'UNKNOWN_ERROR',
    };
  }
}

export interface QuestionAnalytics {
  question_id: string;
  prompt: string;
  play_count: number;
  accuracy_rate: number;
}

export async function getQuestionAnalytics(authAccount?: SessionAccount): Promise<{ success: boolean; data?: QuestionAnalytics[]; error?: string }> {
  try {
    const account = authAccount ?? (await getSessionAccount());
    if (!account) {
      return { success: false, error: 'Sign in to view analytics.' };
    }

    let data: unknown[];
    try {
      data = await questionAnalytics(account.id);
    } catch (err) {
      logger.error('[getQuestionAnalytics:rpc]', err);
      return { success: false, error: 'Failed to fetch analytics.' };
    }
    return { success: true, data: data as QuestionAnalytics[] };
  } catch (error) {
    logger.error('[getQuestionAnalytics]', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export type DeleteMyAccountResult =
  | DeleteAccountResult
  | { success: false; error: string; code: 'UNAUTHORIZED' };

export async function deleteMyAccount(authAccount?: SessionAccount): Promise<DeleteMyAccountResult> {
  const account = authAccount ?? (await getSessionAccount());
  if (!account) {
    return {
      success: false,
      error: 'Sign in to delete your account.',
      code: 'UNAUTHORIZED',
    };
  }
  const result = await deleteAccount(account);
  if (result.success) {
    await clearSessionAccount();
  }
  return result;
}

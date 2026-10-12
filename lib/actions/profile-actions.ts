'use server';
import { logger } from "@/lib/logger";

import { supabase } from '../supabase/supabase';
import { supabaseAdmin } from '../supabase/supabase-admin';
import { getSessionAccount } from '../services/session';
import { quizzesForAccount } from '../services/user-quizzes';
import {
  Question,
  QuizResult,
  GetUserQuizzesFilter,
  GetUserQuizzesResult,
  ExportUserDataResult,
  UserBackupData,
} from '../types';

const MAX_EXPORT_QUIZZES = 1000;
const MAX_EXPORT_STATS = 5000;
const BACKUP_SCHEMA_VERSION = '1.0';

export async function getUserQuizzes(
  options?: GetUserQuizzesFilter
): Promise<GetUserQuizzesResult> {
  const account = await getSessionAccount();
  if (!account) {
    return {
      success: false,
      error: 'Sign in to see your quizzes.',
      code: 'UNAUTHORIZED',
    };
  }
  return quizzesForAccount(account.id, options);
}

export async function exportUserData(): Promise<ExportUserDataResult> {
  try {
    // The backup holds correct answers and every recorded answer, which the public key
    // can't read, so it's read with the secret key and only for the signed-in account.
    const account = await getSessionAccount();
    if (!account) {
      return {
        success: false,
        error: 'Sign in to export your data.',
        code: 'UNAUTHORIZED',
      };
    }
    if (!supabaseAdmin) {
      logger.error('[exportUserData] SUPABASE_SECRET_KEY is not set', new Error('[exportUserData] SUPABASE_SECRET_KEY is not set'));
      return { success: false, error: 'Failed to generate secure backup.', code: 'EXPORT_FAILED' };
    }

    const [quizzesResponse, statsResponse] = await Promise.all([
      supabaseAdmin.from('questions').select('*').eq('created_by_user', account.id).limit(MAX_EXPORT_QUIZZES),
      supabaseAdmin.from('quiz_results').select('*').eq('user_id', account.id).limit(MAX_EXPORT_STATS),
    ]);

    if (quizzesResponse.error) {
      logger.error('[exportUserData:quizzes]', quizzesResponse.error);
      return {
        success: false,
        error: 'Failed to fetch quizzes for export.',
        code: 'EXPORT_FAILED',
      };
    }

    if (statsResponse.error) {
      logger.error('[exportUserData:stats]', statsResponse.error);
      return {
        success: false,
        error: 'Failed to fetch stats for export.',
        code: 'EXPORT_FAILED',
      };
    }

    const quizzes = (quizzesResponse.data as Question[]) || [];
    const stats = (statsResponse.data as QuizResult[]) || [];
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

export async function getQuestionAnalytics(): Promise<{ success: boolean; data?: QuestionAnalytics[]; error?: string }> {
  try {
    const account = await getSessionAccount();
    if (!account) {
      return { success: false, error: 'Sign in to view analytics.' };
    }

    const { data, error } = await supabase.rpc('get_question_analytics', { p_user_id: account.id });

    if (error) {
      logger.error('[getQuestionAnalytics:rpc]', error);
      return { success: false, error: 'Failed to fetch analytics.' };
    }

    return { success: true, data: data as QuestionAnalytics[] };
  } catch (error) {
    logger.error('[getQuestionAnalytics]', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}


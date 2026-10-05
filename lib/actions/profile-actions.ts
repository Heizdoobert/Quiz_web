'use server';

import { supabase } from '../supabase/supabase';
import { supabaseAdmin } from '../supabase/supabase-admin';
import { getSessionAccount } from '../services/session';
import {
  Question,
  ClientQuestion,
  QuizResult,
  GetUserQuizzesFilter,
  GetUserQuizzesResult,
  ExportUserDataResult,
  UserBackupData,
} from '../types';

// Validates that input looks like an Ethereum address (0x + 40 hex chars).
// This is format validation only — it does NOT prove the caller owns this address.
// See SECURITY-TRADE-OFFS.md for the full threat model.
function isValidEthAddress(address: string): boolean {
  return typeof address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(address);
}

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 500;
const MAX_EXPORT_QUIZZES = 1000;
const MAX_EXPORT_STATS = 5000;
const BACKUP_SCHEMA_VERSION = '1.0';

export async function getUserQuizzes(
  walletAddress: string,
  options?: GetUserQuizzesFilter
): Promise<GetUserQuizzesResult> {
  try {
    if (!walletAddress || !isValidEthAddress(walletAddress)) {
      return {
        success: false,
        error: 'A valid wallet address is required.',
        code: 'INVALID_ADDRESS',
      };
    }

    const normalized = walletAddress.toLowerCase();
    const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(options?.offset ?? 0, 0);

    // SECURITY: Select public display fields only.
    // Exclude correct_index and explanation to prevent answer leakage during quizzes.
    let query = supabase
      .from('questions')
      .select('id, category, prompt, options, status, created_at, created_by')
      .eq('created_by', normalized);

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
    console.error('[getUserQuizzes]', error);
    return {
      success: false,
      error: 'An unexpected error occurred.',
      code: 'UNKNOWN_ERROR',
    };
  }
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
      console.error('[exportUserData] SUPABASE_SECRET_KEY is not set');
      return { success: false, error: 'Failed to generate secure backup.', code: 'EXPORT_FAILED' };
    }

    const [quizzesResponse, statsResponse] = await Promise.all([
      supabaseAdmin.from('questions').select('*').eq('created_by_user', account.id).limit(MAX_EXPORT_QUIZZES),
      supabaseAdmin.from('quiz_results').select('*').eq('user_id', account.id).limit(MAX_EXPORT_STATS),
    ]);

    if (quizzesResponse.error) {
      console.error('[exportUserData:quizzes]', quizzesResponse.error);
      return {
        success: false,
        error: 'Failed to fetch quizzes for export.',
        code: 'EXPORT_FAILED',
      };
    }

    if (statsResponse.error) {
      console.error('[exportUserData:stats]', statsResponse.error);
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
      walletAddress: account.wallet ?? '',
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
    console.error('[exportUserData]', error);
    return {
      success: false,
      error: 'Failed to generate secure backup.',
      code: 'UNKNOWN_ERROR',
    };
  }
}

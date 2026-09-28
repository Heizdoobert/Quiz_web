'use server';

import { supabase } from '../supabase';
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
    const message = error instanceof Error
      ? error.message
      : (typeof error === 'object' && error !== null && 'message' in error)
        ? String((error as { message: unknown }).message)
        : 'An unexpected error occurred.';
    return {
      success: false,
      error: message,
      code: 'UNKNOWN_ERROR',
    };
  }
}

export async function exportUserData(walletAddress: string): Promise<ExportUserDataResult> {
  try {
    if (!walletAddress || !isValidEthAddress(walletAddress)) {
      return {
        success: false,
        error: 'A valid wallet address is required for security.',
        code: 'INVALID_ADDRESS',
      };
    }

    const normalized = walletAddress.toLowerCase();

    const [quizzesResponse, statsResponse] = await Promise.all([
      supabase.from('questions').select('*').eq('created_by', normalized).limit(MAX_EXPORT_QUIZZES),
      supabase.from('quiz_results').select('*').eq('wallet_address', normalized).limit(MAX_EXPORT_STATS),
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
      walletAddress: normalized,
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
    const message = error instanceof Error
      ? error.message
      : (typeof error === 'object' && error !== null && 'message' in error)
        ? String((error as { message: unknown }).message)
        : 'Failed to generate secure backup.';
    return {
      success: false,
      error: message,
      code: 'UNKNOWN_ERROR',
    };
  }
}

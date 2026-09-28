'use server';

import { supabase } from '../supabase';
import { Question } from '../types';

// Validates that input looks like an Ethereum address (0x + 40 hex chars).
// This is format validation only — it does NOT prove the caller owns this address.
// See SECURITY-TRADE-OFFS.md for the full threat model.
function isValidEthAddress(address: string): boolean {
  return typeof address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(address);
}

const MAX_QUIZZES = 500;
const MAX_EXPORT_QUIZZES = 1000;
const MAX_EXPORT_STATS = 5000;

export async function getUserQuizzes(walletAddress: string): Promise<{ success: boolean; quizzes?: Question[]; error?: string }> {
  try {
    if (!walletAddress || !isValidEthAddress(walletAddress)) {
      return { success: false, error: 'A valid wallet address is required.' };
    }

    const normalized = walletAddress.toLowerCase();

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('created_by', normalized)
      .order('created_at', { ascending: false })
      .limit(MAX_QUIZZES);

    if (error) {
      return { success: false, error: 'Failed to fetch your quizzes.' };
    }

    return { success: true, quizzes: data as Question[] };
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : (typeof error === 'object' && error !== null && 'message' in error)
        ? String((error as { message: unknown }).message)
        : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function exportUserData(walletAddress: string): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  try {
    if (!walletAddress || !isValidEthAddress(walletAddress)) {
      return { success: false, error: 'A valid wallet address is required for security.' };
    }

    const normalized = walletAddress.toLowerCase();

    const [quizzesResponse, statsResponse] = await Promise.all([
      supabase.from('questions').select('*').eq('created_by', normalized).limit(MAX_EXPORT_QUIZZES),
      supabase.from('quiz_results').select('*').eq('wallet_address', normalized).limit(MAX_EXPORT_STATS),
    ]);

    if (quizzesResponse.error) {
      const msg = typeof quizzesResponse.error === 'object' && 'message' in quizzesResponse.error
        ? String(quizzesResponse.error.message)
        : 'Failed to fetch quizzes for export.';
      return { success: false, error: msg };
    }

    if (statsResponse.error) {
      const msg = typeof statsResponse.error === 'object' && 'message' in statsResponse.error
        ? String(statsResponse.error.message)
        : 'Failed to fetch stats for export.';
      return { success: false, error: msg };
    }

    const exportData = {
      walletAddress: normalized,
      exportedAt: new Date().toISOString(),
      quizzes: quizzesResponse.data || [],
      stats: statsResponse.data || [],
    };

    return { success: true, data: exportData };
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : (typeof error === 'object' && error !== null && 'message' in error)
        ? String((error as { message: unknown }).message)
        : 'Failed to generate secure backup.';
    return { success: false, error: message };
  }
}

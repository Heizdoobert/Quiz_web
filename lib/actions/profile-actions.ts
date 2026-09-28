'use server';

import { supabase } from '../supabase';
import { Question } from '../types';

export async function getUserQuizzes(walletAddress: string): Promise<{ success: boolean; quizzes?: Question[]; error?: string }> {
  try {
    if (!walletAddress) {
      return { success: false, error: 'Wallet address is required.' };
    }

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('created_by', walletAddress)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: 'Failed to fetch your quizzes.' };
    }

    return { success: true, quizzes: data as Question[] };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred.' };
  }
}

export async function exportUserData(walletAddress: string): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  try {
    if (!walletAddress) {
      return { success: false, error: 'Wallet address is required for security.' };
    }

    const [quizzesResponse, statsResponse] = await Promise.all([
      supabase.from('questions').select('*').eq('created_by', walletAddress),
      supabase.from('quiz_results').select('*').eq('wallet_address', walletAddress)
    ]);

    if (quizzesResponse.error) throw quizzesResponse.error;
    
    const exportData = {
      walletAddress,
      exportedAt: new Date().toISOString(),
      quizzes: quizzesResponse.data || [],
      stats: statsResponse.data || [],
    };

    return { success: true, data: exportData };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate secure backup.' };
  }
}

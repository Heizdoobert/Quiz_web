'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { AnswerSubmissionResult, QuizResult, UserStats } from '@/lib/types';

export async function submitAnswer(params: {
  questionId: string;
  answerIndex: number;
  walletAddress: string;
}): Promise<AnswerSubmissionResult> {
  try {
    const rawWallet = params?.walletAddress || '0x0000000000000000000000000000000000000000';
    const normalizedWallet = rawWallet.toLowerCase();
    const { data: qData, error: qError } = await supabase
      .from('questions')
      .select('correct_index, explanation')
      .eq('id', params.questionId)
      .single();

    if (qError || !qData) {
      console.error('Question not found for answer submission:', qError);
      return { isCorrect: false, correctIndex: 0, explanation: null };
    }

    const isCorrect = params.answerIndex === qData.correct_index;

    // Log the result only if a valid wallet is connected (prevents corrupting leaderboard with dummy address)
    if (normalizedWallet && normalizedWallet !== '0x0000000000000000000000000000000000000000') {
      if (!supabaseAdmin) {
        console.error('submitAnswer: SUPABASE_SECRET_KEY is not set, answer not recorded');
      } else {
        const { error: insertError } = await supabaseAdmin.from('quiz_results').insert({
          wallet_address: normalizedWallet,
          question_id: params.questionId,
          answer_index: params.answerIndex,
          is_correct: isCorrect,
        });
        if (insertError) console.error('submitAnswer insert error:', insertError);
      }
    }

    return {
      isCorrect,
      correctIndex: qData.correct_index,
      explanation: qData.explanation,
    };
  } catch (err) {
    console.error('submitAnswer error:', err);
    return { isCorrect: false, correctIndex: 0, explanation: null };
  }
}

export async function getUserStats(walletAddress: string): Promise<UserStats> {
  try {
    if (!walletAddress) {
      return { score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 };
    }
    // Aggregated in Postgres (lib/sql/stats-functions.sql); raw rows are capped at 1000.
    const { data, error } = await supabase
      .rpc('get_user_stats', { p_wallet: walletAddress.toLowerCase() })
      .single<{ total_answered: number; correct_count: number; streak: number; best_streak: number }>();

    if (error) console.error('getUserStats rpc error:', error);
    if (error || !data || data.total_answered === 0) {
      return { score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 };
    }

    return {
      score: data.correct_count,
      streak: data.streak,
      bestStreak: data.best_streak,
      accuracy: Math.round((data.correct_count / data.total_answered) * 100),
      totalAnswered: data.total_answered,
    };
  } catch (err) {
    console.error('getUserStats error:', err);
    return { score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 };
  }
}

export async function getQuestionHistory(
  walletAddress: string,
  limit: number = 10
): Promise<QuizResult[]> {
  try {
    if (!walletAddress) return [];
    const normalized = walletAddress.toLowerCase();
    const { data, error } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('wallet_address', normalized)
      .order('answered_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as QuizResult[];
  } catch (err) {
    console.error('getQuestionHistory error:', err);
    return [];
  }
}

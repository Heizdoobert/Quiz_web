'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionWallet } from '@/lib/wallet-session';
import { AnswerSubmissionResult, UserStats } from '@/lib/types';

export async function submitAnswer(params: {
  questionId: string;
  answerIndex: number;
}): Promise<AnswerSubmissionResult> {
  const failed = { isCorrect: false, correctIndex: 0, explanation: null, recorded: false };
  try {
    // correct_index and explanation are not readable with the public key.
    if (!supabaseAdmin) {
      console.error('submitAnswer: SUPABASE_SECRET_KEY is not set');
      return failed;
    }
    const { data: qData, error: qError } = await supabaseAdmin
      .from('questions')
      .select('correct_index, explanation')
      .eq('id', params.questionId)
      .single();

    if (qError || !qData) {
      console.error('Question not found for answer submission:', qError);
      return failed;
    }

    const isCorrect = params.answerIndex === qData.correct_index;

    // Only a signed-in wallet's answers count; guests still see the result.
    // The first answer to a question is the one that counts (unique per wallet and question).
    const wallet = await getSessionWallet();
    let recorded = false;
    if (wallet) {
      const { error: insertError } = await supabaseAdmin.from('quiz_results').insert({
        wallet_address: wallet,
        question_id: params.questionId,
        answer_index: params.answerIndex,
        is_correct: isCorrect,
      });
      if (insertError && insertError.code !== '23505') console.error('submitAnswer insert error:', insertError);
      recorded = !insertError;
    }

    return {
      isCorrect,
      correctIndex: qData.correct_index,
      explanation: qData.explanation,
      recorded,
    };
  } catch (err) {
    console.error('submitAnswer error:', err);
    return failed;
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

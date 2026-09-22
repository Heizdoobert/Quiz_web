'use server';

import { supabase } from '@/lib/supabase';
import { AnswerSubmissionResult, QuizResult, UserStats } from '@/lib/types';

export async function submitAnswer(params: {
  questionId: string;
  answerIndex: number;
  walletAddress: string;
}): Promise<AnswerSubmissionResult> {
  const normalizedWallet = params.walletAddress.toLowerCase();

  try {
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

    // Log the result
    await supabase.from('quiz_results').insert({
      wallet_address: normalizedWallet,
      question_id: params.questionId,
      answer_index: params.answerIndex,
      is_correct: isCorrect,
    });

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
  const normalized = walletAddress.toLowerCase();
  try {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('is_correct, answered_at')
      .eq('wallet_address', normalized)
      .order('answered_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return { score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 };
    }

    const totalAnswered = data.length;
    const correctCount = data.filter((r) => r.is_correct).length;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    // Calculate current streak (consecutive correct answers from most recent)
    let streak = 0;
    for (const res of data) {
      if (res.is_correct) streak++;
      else break;
    }

    // Calculate best streak (in chronological order)
    const chronological = [...data].reverse();
    let bestStreak = 0;
    let currentRun = 0;
    for (const res of chronological) {
      if (res.is_correct) {
        currentRun++;
        if (currentRun > bestStreak) bestStreak = currentRun;
      } else {
        currentRun = 0;
      }
    }

    return {
      score: correctCount,
      streak,
      bestStreak,
      accuracy,
      totalAnswered,
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
  const normalized = walletAddress.toLowerCase();
  try {
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

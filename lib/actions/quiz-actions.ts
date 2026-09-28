'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionWallet } from '@/lib/wallet-session';
import { AnswerSubmissionResult, UserStats, HistoryItem } from '@/lib/types';

const HISTORY_LIMIT = 20;

// The session wallet's most recent answers, newest first, so history and answeredIds
// survive a reload. Never the wrong wallet's, and never answer_index or correct_index
// (that would reveal the correct option).
export async function getAnswerHistory(walletAddress: string): Promise<HistoryItem[]> {
  try {
    if (!supabaseAdmin) return [];
    const wallet = await getSessionWallet();
    if (!wallet || wallet !== walletAddress.toLowerCase()) return [];

    const { data, error } = await supabaseAdmin
      .from('quiz_results')
      .select('question_id, is_correct, answered_at, questions(prompt)')
      .eq('wallet_address', wallet)
      .order('answered_at', { ascending: false })
      .limit(HISTORY_LIMIT);

    if (error || !data) {
      console.error('getAnswerHistory error:', error);
      return [];
    }

    return (data as unknown as Array<{ question_id: string; is_correct: boolean; questions: { prompt: string } | null }>).map(
      (row) => ({
        questionId: row.question_id,
        prompt: row.questions?.prompt ?? '',
        isCorrect: row.is_correct,
      })
    );
  } catch (err) {
    console.error('getAnswerHistory exception:', err);
    return [];
  }
}

export async function submitAnswer(params: {
  questionId: string;
  answerIndex: number;
}): Promise<AnswerSubmissionResult> {
  const failed = (notSavedReason: NonNullable<AnswerSubmissionResult['notSavedReason']>): AnswerSubmissionResult => ({
    isCorrect: false,
    correctIndex: 0,
    explanation: null,
    recorded: false,
    notSavedReason,
  });
  try {
    // correct_index and explanation are not readable with the public key.
    if (!supabaseAdmin) {
      console.error('submitAnswer: SUPABASE_SECRET_KEY is not set');
      return failed('error');
    }
    // '*' so this keeps working before lib/sql/question-lists.sql adds list_id.
    const { data: qData, error: qError } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('id', params.questionId)
      .single();

    if (qError || !qData) {
      console.error('Question not found for answer submission:', qError);
      return failed('error');
    }
    const wallet = await getSessionWallet();
    // Contest questions stay 'pending' (out of the global pool) and are only answerable
    // by a wallet playing that contest, so their answers can't be looked up beforehand;
    // owners and reviewers never get an entry. Other non-verified questions reveal nothing.
    if (!qData.list_id && qData.status !== 'verified') return failed('error');
    if (qData.list_id) {
      if (!wallet) return failed('signed-out');
      const { data: entry } = await supabaseAdmin
        .from('list_entries')
        .select('status')
        .eq('list_id', qData.list_id)
        .eq('wallet_address', wallet)
        .maybeSingle();
      if (entry?.status !== 'in_progress') return failed('error');
    }

    const isCorrect = params.answerIndex === qData.correct_index;
    const revealed = { isCorrect, correctIndex: qData.correct_index, explanation: qData.explanation };

    // Only a signed-in wallet's answers count; guests still see the result.
    if (!wallet) return { ...revealed, recorded: false, notSavedReason: 'signed-out' };
    // Nobody scores on a question they wrote.
    if (qData.created_by === wallet) return { ...revealed, recorded: false, notSavedReason: 'own-question' };

    // The first answer to a question is the one that counts (unique per wallet and question).
    const { error: insertError } = await supabaseAdmin.from('quiz_results').insert({
      wallet_address: wallet,
      question_id: params.questionId,
      answer_index: params.answerIndex,
      is_correct: isCorrect,
    });
    if (!insertError) return { ...revealed, recorded: true };
    if (insertError.code === '23505') return { ...revealed, recorded: false, notSavedReason: 'already-answered' };
    console.error('submitAnswer insert error:', insertError);
    return { ...revealed, recorded: false, notSavedReason: 'error' };
  } catch (err) {
    console.error('submitAnswer error:', err);
    return failed('error');
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

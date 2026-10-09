'use server';

import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { getSessionAccount, type SessionAccount } from '@/lib/services/session';
import { allowAttemptFromIp } from '@/lib/services/rate-limit';
import { isUuid } from '@/lib/utils/validation';
import { statsForAccount } from '@/lib/utils/stats';
import { AnswerSubmissionResult, UserStats, HistoryItem } from '@/lib/types';
import { logger } from '@/lib/logger';

const HISTORY_LIMIT = 20;
const HOUR = 3600;
// Every answer shows its key, guests included (docs/specs/trivia-guest-access.md), so this caps
// how fast a script can read the question bank from one address. Generous for shared networks.
const ANSWERS_PER_IP_PER_HOUR = 120;

// The session account's most recent answers, newest first, so history and answeredIds
// survive a reload. Never anyone else's, and never answer_index or correct_index
// (that would reveal the correct option).
export async function getAnswerHistory(): Promise<HistoryItem[]> {
  try {
    if (!supabaseAdmin) return [];
    const account = await getSessionAccount();
    if (!account) return [];

    const { data, error } = await supabaseAdmin
      .from('quiz_results')
      .select('question_id, is_correct, answered_at, questions(prompt)')
      .eq('user_id', account.id)
      .order('answered_at', { ascending: false })
      .limit(HISTORY_LIMIT);

    if (error || !data) {
      logger.error('getAnswerHistory error:', error);
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
    logger.error('getAnswerHistory exception:', err);
    return [];
  }
}

export async function submitAnswer(params: {
  questionId: string;
  answerIndex: number;
}, mobileAccount?: SessionAccount): Promise<AnswerSubmissionResult> {
  const failed = (notSavedReason: NonNullable<AnswerSubmissionResult['notSavedReason']>): AnswerSubmissionResult => ({
    isCorrect: false,
    correctIndex: 0,
    explanation: null,
    recorded: false,
    notSavedReason,
  });
  try {
    if (!isUuid(params.questionId)) return failed('error');
    // correct_index and explanation are not readable with the public key.
    if (!supabaseAdmin) {
      logger.error('submitAnswer: SUPABASE_SECRET_KEY is not set', new Error('submitAnswer: SUPABASE_SECRET_KEY is not set'));
      return failed('error');
    }
    if (!(await allowAttemptFromIp('submit-answer-ip', ANSWERS_PER_IP_PER_HOUR, HOUR))) return failed('rate-limited');
    // '*' so this keeps working before lib/sql/question-lists.sql adds list_id.
    const { data: qData, error: qError } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('id', params.questionId)
      .single();

    if (qError || !qData) {
      logger.error('Question not found for answer submission:', qError);
      return failed('error');
    }
    const account = mobileAccount ?? await getSessionAccount();
    // Contest questions stay 'pending' (out of the global pool) and are only answerable
    // by an account playing that contest, so their answers can't be looked up beforehand;
    // owners and reviewers never get an entry. Other non-verified questions reveal nothing.
    if (!qData.list_id && qData.status !== 'verified') return failed('error');
    if (qData.list_id) {
      if (!account?.wallet) return failed('signed-out');
      const { data: entry } = await supabaseAdmin
        .from('list_entries')
        .select('status')
        .eq('list_id', qData.list_id)
        .eq('wallet_address', account.wallet)
        .maybeSingle();
      if (entry?.status !== 'in_progress') return failed('error');
    }

    const isCorrect = params.answerIndex === qData.correct_index;
    const revealed = { isCorrect, correctIndex: qData.correct_index, explanation: qData.explanation };

    // Only a signed-in account's answers count; guests still see the result.
    if (!account) return { ...revealed, recorded: false, notSavedReason: 'signed-out' };
    // Nobody scores on a question they wrote.
    if (qData.created_by_user === account.id) {
      return { ...revealed, recorded: false, notSavedReason: 'own-question' };
    }

    // The first answer to a question is the one that counts (unique per account and question).
    // wallet_address is written directly too (the bridge trigger would fill it in anyway) so
    // readers of the old column stay correct until it's dropped in Task 25.
    const { error: insertError } = await supabaseAdmin.from('quiz_results').insert({
      user_id: account.id,
      wallet_address: account.wallet,
      question_id: params.questionId,
      answer_index: params.answerIndex,
      is_correct: isCorrect,
    });
    if (!insertError) return { ...revealed, recorded: true };
    if (insertError.code === '23505') return { ...revealed, recorded: false, notSavedReason: 'already-answered' };
    logger.error('submitAnswer insert error:', insertError);
    return { ...revealed, recorded: false, notSavedReason: 'error' };
  } catch (err) {
    logger.error('submitAnswer error:', err);
    return failed('error');
  }
}

export async function getUserStats(): Promise<UserStats> {
  const account = await getSessionAccount();
  if (!account) return { score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 };
  return statsForAccount(account.id);
}

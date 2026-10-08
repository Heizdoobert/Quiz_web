# lib/actions/quiz-actions.ts
lines:123 exports:getAnswerHistory,submitAnswer,getUserStats
---
'use server';

import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { getSessionAccount } from '@/lib/services/session';
import { statsForAccount } from '@/lib/utils/stats';
import { AnswerSubmissionResult, UserStats, HistoryItem } from '@/lib/types';
import { logger } from '@/lib/logger';

const HISTORY_LIMIT = 20;

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

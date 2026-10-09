# lib/actions/quiz-actions.ts
lines:131 exports:getAnswerHistory,submitAnswer,getUserStats
---
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

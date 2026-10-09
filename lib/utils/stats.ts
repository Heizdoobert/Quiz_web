import 'server-only';
import { supabase } from '@/lib/supabase/supabase';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { HistoryItem, UserStats } from '@/lib/types';
import { logger } from '@/lib/logger';

export const ZERO_STATS: UserStats = { score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 };
const HISTORY_LIMIT = 20;

// An account's most recent answers, newest first. Never answer_index or correct_index
// (that would reveal the correct option). Shared by the web session (getAnswerHistory)
// and the mobile board route, which resolve the account id their own way.
export async function historyForAccount(accountId: string): Promise<HistoryItem[]> {
  try {
    if (!supabaseAdmin) return [];
    const { data, error } = await supabaseAdmin
      .from('quiz_results')
      .select('question_id, is_correct, answered_at, questions(prompt)')
      .eq('user_id', accountId)
      .order('answered_at', { ascending: false })
      .limit(HISTORY_LIMIT);

    if (error || !data) {
      logger.error('historyForAccount error:', error);
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
    logger.error('historyForAccount exception:', err);
    return [];
  }
}

// Aggregated in Postgres (lib/sql/stats-functions.sql); raw rows are capped at 1000.
// Not a server action: it takes an account id straight from the caller, which
// resolves it from the session (getUserStats) or a wallet lookup (reward-actions,
// until Task 9 moves that to the session too).
export async function statsForAccount(accountId: string): Promise<UserStats> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_stats', { p_user: accountId })
      .single<{ total_answered: number; correct_count: number; streak: number; best_streak: number }>();

    if (error) logger.error('statsForAccount rpc error:', error);
    if (error || !data || data.total_answered === 0) return ZERO_STATS;

    return {
      score: data.correct_count,
      streak: data.streak,
      bestStreak: data.best_streak,
      accuracy: Math.round((data.correct_count / data.total_answered) * 100),
      totalAnswered: data.total_answered,
    };
  } catch (err) {
    logger.error('statsForAccount error:', err);
    return ZERO_STATS;
  }
}

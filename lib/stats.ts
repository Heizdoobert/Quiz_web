import 'server-only';
import { supabase } from '@/lib/supabase';
import { UserStats } from '@/lib/types';

const ZERO_STATS: UserStats = { score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 };

// Aggregated in Postgres (lib/sql/stats-functions.sql); raw rows are capped at 1000.
// Not a server action: it takes an account id straight from the caller, which
// resolves it from the session (getUserStats) or a wallet lookup (reward-actions,
// until Task 9 moves that to the session too).
export async function statsForAccount(accountId: string): Promise<UserStats> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_stats', { p_user: accountId })
      .single<{ total_answered: number; correct_count: number; streak: number; best_streak: number }>();

    if (error) console.error('statsForAccount rpc error:', error);
    if (error || !data || data.total_answered === 0) return ZERO_STATS;

    return {
      score: data.correct_count,
      streak: data.streak,
      bestStreak: data.best_streak,
      accuracy: Math.round((data.correct_count / data.total_answered) * 100),
      totalAnswered: data.total_answered,
    };
  } catch (err) {
    console.error('statsForAccount error:', err);
    return ZERO_STATS;
  }
}

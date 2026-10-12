import 'server-only';
import { admin, pub } from './client';
import { unwrap, unwrapOne } from './errors';

// Postgres functions (lib/sql/, supabase/migrations/). Later tasks add to this file.

// True when the attempt is allowed (supabase/migrations/17-auth-rate-limit.sql).
export async function rateLimitHit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const allowed = unwrap(
    'rpc.rate_limit_hit',
    await admin().rpc('rate_limit_hit', { p_key: key, p_max: max, p_window_seconds: windowSeconds })
  );
  return allowed !== false;
}

export type UserStatsRow = { total_answered: number; correct_count: number; streak: number; best_streak: number };

// Aggregated in Postgres (lib/sql/stats-functions.sql); raw rows are capped at 1000.
export async function userStats(accountId: string): Promise<UserStatsRow | null> {
  return unwrapOne('rpc.get_user_stats', await pub.rpc('get_user_stats', { p_user: accountId }).single<UserStatsRow>());
}

export async function topics(): Promise<Array<{ name: string; question_count: number; latest_at: string }>> {
  return unwrap('rpc.get_topics', await pub.rpc('get_topics')) ?? [];
}

// Today's AI generations for the account, after counting this one.
export async function incrementAiGeneration(accountId: string): Promise<number> {
  return unwrap('rpc.increment_ai_generation', await admin().rpc('increment_ai_generation', { p_user_id: accountId })) ?? 0;
}

export async function searchQuestionsRpc(query: string, limit: number, offset: number): Promise<unknown[]> {
  return unwrap('rpc.search_questions', await pub.rpc('search_questions', { p_query: query, p_limit: limit, p_offset: offset })) ?? [];
}

export async function ratingSummary(questionId: string): Promise<Array<{ average: unknown; count: unknown }>> {
  return unwrap('rpc.get_rating_summary', await pub.rpc('get_rating_summary', { p_question_id: questionId })) ?? [];
}

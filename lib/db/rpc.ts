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

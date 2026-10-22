import 'server-only';
import { admin, pub } from '../client';
import { unwrap } from '../errors';

// Daily challenge functions (supabase/migrations/20261013001000_add_daily_challenge_with_pick_daily_challenge_and_get_daily_leaderboard.sql).

// Rows inserted: 0 when the day already has a challenge. Secret key only.
export async function pickDailyChallenge(date: string, count = 10): Promise<number> {
  return unwrap('rpc.pick_daily_challenge', await admin().rpc('pick_daily_challenge', { p_date: date, p_count: count })) ?? 0;
}

export async function dailyLeaderboard(date: string, limit: number, offset: number): Promise<unknown[]> {
  return unwrap('rpc.get_daily_leaderboard', await pub.rpc('get_daily_leaderboard', { p_date: date, p_limit: limit, p_offset: offset })) ?? [];
}

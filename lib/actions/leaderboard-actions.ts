'use server';

import { supabase } from '@/lib/supabase';
import { LeaderboardEntry } from '@/lib/types';

// Rows come pre-aggregated and pre-sorted from Postgres (lib/sql/stats-functions.sql);
// raw quiz_results reads are capped at 1000 rows, so counting is done there.
type LeaderboardRow = { wallet_address: string; score: number; accuracy: number };

function toEntries(rows: LeaderboardRow[]): LeaderboardEntry[] {
  return rows.map((row, idx) => ({
    wallet_address: row.wallet_address,
    display_name: `${row.wallet_address.slice(0, 6)}...${row.wallet_address.slice(-4)}`,
    score: row.score,
    accuracy: row.accuracy,
    rank: idx + 1,
  }));
}

export async function getGlobalLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase.rpc('get_global_leaderboard', { p_limit: limit });
    if (error) console.error('getGlobalLeaderboard rpc error:', error);
    if (error || !data) return [];
    return toEntries(data as LeaderboardRow[]);
  } catch (err) {
    console.error('getGlobalLeaderboard error:', err);
    return [];
  }
}

export async function getGroupLeaderboard(
  groupId: string,
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase.rpc('get_group_leaderboard', {
      p_group_id: groupId,
      p_limit: limit,
    });
    if (error) console.error('getGroupLeaderboard rpc error:', error);
    if (error || !data) return [];
    return toEntries(data as LeaderboardRow[]);
  } catch (err) {
    console.error('getGroupLeaderboard error:', err);
    return [];
  }
}

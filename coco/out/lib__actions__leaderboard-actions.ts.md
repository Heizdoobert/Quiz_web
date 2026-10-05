# lib/actions/leaderboard-actions.ts
lines:63 exports:getGlobalLeaderboard,getGroupLeaderboard
---
'use server';

import { supabase } from '@/lib/supabase/supabase';
import { LeaderboardEntry } from '@/lib/types';
import { isUuid } from '@/lib/utils/validation';

// Rows come pre-aggregated and pre-sorted from Postgres (lib/sql/stats-functions.sql);
// raw quiz_results reads are capped at 1000 rows, so counting is done there.
// wallet_address is null for an email account with no wallet.
type LeaderboardRow = {
  user_id: string;
  display_name: string | null;
  wallet_address: string | null;
  score: number;
  accuracy: number;
};

// The SQL functions clamp too, since the public key can call them directly.
const clampLimit = (limit: number) => Math.min(Math.max(Math.trunc(limit) || 1, 1), 100);

function toEntries(rows: LeaderboardRow[], offset: number = 0): LeaderboardEntry[] {
  return rows.map((row, idx) => ({
    user_id: row.user_id,
    wallet_address: row.wallet_address,
    display_name: row.display_name,
    score: row.score,
    accuracy: row.accuracy,
    rank: offset + idx + 1,
  }));
}

export async function getGlobalLeaderboard(limit: number = 50, offset: number = 0): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase.rpc('get_global_leaderboard', { p_limit: clampLimit(limit), p_offset: Math.max(0, offset) });
    if (error) console.error('getGlobalLeaderboard rpc error:', error);
    if (error || !data) return [];
    return toEntries(data as LeaderboardRow[], offset);
  } catch (err) {
    console.error('getGlobalLeaderboard error:', err);
    return [];

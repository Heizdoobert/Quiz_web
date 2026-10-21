# lib/actions/leaderboard-actions.ts
lines:70 exports:getGlobalLeaderboard,getGroupLeaderboard
---
'use server';

import { unstable_cache } from 'next/cache';
import { globalLeaderboard, groupLeaderboard } from '@/lib/db/rpc';
import { LeaderboardEntry } from '@/lib/types';
import { isUuid } from '@/lib/utils/validation';
import { logger } from '@/lib/logger';
import type { SessionAccount } from '@/lib/services/session';

// Rows come pre-aggregated and pre-sorted from Postgres (supabase/migrations/20261013000400_read_leaderboards_and_get_user_stats_from_user_stats.sql);
// raw quiz_results reads are capped at 1000 rows, so counting is done there.
type LeaderboardRow = {
  user_id: string;
  display_name: string | null;
  score: number;
  accuracy: number;
};

// The SQL functions clamp too, since the public key can call them directly.
const clampLimit = (limit: number) => Math.min(Math.max(Math.trunc(limit) || 1, 1), 100);

function toEntries(rows: LeaderboardRow[], offset: number = 0): LeaderboardEntry[] {
  return rows.map((row, idx) => ({
    user_id: row.user_id,
    display_name: row.display_name,
    score: row.score,
    accuracy: row.accuracy,
    rank: offset + idx + 1,
  }));
}

// get_global_leaderboard aggregates every quiz_results row, and each home render, each open
// leaderboard poll and each answer calls it. The 15 s cache (matching the poll interval) bounds that
// to one aggregate per page window and instance; a player's own new score can lag by that long.
// It throws on a failed read so an error is never cached as an empty board.
const GLOBAL_LEADERBOARD_TTL_SECONDS = 15;

const readGlobalLeaderboard = unstable_cache(
  async (limit: number, offset: number): Promise<LeaderboardRow[]> => {
    return (await globalLeaderboard(limit, offset)) as LeaderboardRow[];

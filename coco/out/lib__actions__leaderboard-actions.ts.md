# lib/actions/leaderboard-actions.ts
lines:79 exports:getGlobalLeaderboard,getGroupLeaderboard
---
'use server';

import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase/supabase';
import { LeaderboardEntry } from '@/lib/types';
import { isUuid } from '@/lib/utils/validation';
import { logger } from '@/lib/logger';

// Rows come pre-aggregated and pre-sorted from Postgres (supabase/migrations/stats-functions.sql);
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

// get_global_leaderboard aggregates every quiz_results row, and each home render, each open
// leaderboard poll and each answer calls it. The 15 s cache (matching the poll interval) bounds that
// to one aggregate per page window and instance; a player's own new score can lag by that long.
// It throws on a failed read so an error is never cached as an empty board.
const GLOBAL_LEADERBOARD_TTL_SECONDS = 15;

const readGlobalLeaderboard = unstable_cache(

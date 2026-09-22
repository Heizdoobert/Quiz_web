'use server';

import { supabase } from '@/lib/supabase';
import { LeaderboardEntry } from '@/lib/types';

export async function getGlobalLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('wallet_address, is_correct');

    if (error || !data || data.length === 0) return [];

    // Aggregate user scores
    const userMap: Record<string, { correct: number; total: number }> = {};
    for (const r of data) {
      if (!userMap[r.wallet_address]) {
        userMap[r.wallet_address] = { correct: 0, total: 0 };
      }
      userMap[r.wallet_address].total++;
      if (r.is_correct) userMap[r.wallet_address].correct++;
    }

    const sorted = Object.entries(userMap)
      .map(([wallet, stats]) => ({
        wallet_address: wallet,
        display_name: `${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
        score: stats.correct,
        accuracy: Math.round((stats.correct / stats.total) * 100),
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy)
      .slice(0, limit)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    return sorted;
  } catch (err) {
    console.error('getGlobalLeaderboard error:', err);
    return [];
  }
}

export async function getGroupLeaderboard(
  groupId: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  try {
    // Get group members
    const { data: members, error: mError } = await supabase
      .from('group_members')
      .select('wallet_address')
      .eq('group_id', groupId);

    if (mError || !members || members.length === 0) return [];

    const memberWallets = members.map((m) => m.wallet_address);

    const { data: results, error: rError } = await supabase
      .from('quiz_results')
      .select('wallet_address, is_correct')
      .in('wallet_address', memberWallets);

    if (rError || !results) return [];

    const userMap: Record<string, { correct: number; total: number }> = {};
    for (const wallet of memberWallets) {
      userMap[wallet] = { correct: 0, total: 0 };
    }
    for (const r of results) {
      if (userMap[r.wallet_address]) {
        userMap[r.wallet_address].total++;
        if (r.is_correct) userMap[r.wallet_address].correct++;
      }
    }

    const sorted = Object.entries(userMap)
      .map(([wallet, stats]) => ({
        wallet_address: wallet,
        display_name: `${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
        score: stats.correct,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy)
      .slice(0, limit)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    return sorted;
  } catch (err) {
    console.error('getGroupLeaderboard error:', err);
    return [];
  }
}

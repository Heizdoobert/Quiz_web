'use client';

import React from 'react';
import { LeaderboardEntry } from '@/lib/types';

interface GlobalLeaderboardProps {
  entries: LeaderboardEntry[];
  loading: boolean;
}

export default function GlobalLeaderboard({ entries, loading }: GlobalLeaderboardProps) {
  if (loading) {
    return <p className="text-xs text-slate-400 text-center py-6">Loading leaderboard...</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500 text-xs italic">
        No records yet. Complete a quiz to rank!
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => {
        const medal =
          entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
        return (
          <div
            key={entry.wallet_address}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors text-xs"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 text-center font-bold text-slate-400">{medal}</span>
              <div>
                <span className="font-semibold text-slate-200">
                  {entry.display_name || entry.wallet_address.slice(0, 10)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">{entry.accuracy}% acc</span>
              <span className="font-bold text-blue-400">{entry.score} pts</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

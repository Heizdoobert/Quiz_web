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
    <div className="space-y-2">
      {entries.map((entry) => {
        const medal =
          entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
        const isTop1 = entry.rank === 1;
        return (
          <div
            key={entry.wallet_address}
            className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-xs ${
              isTop1
                ? 'bg-[#FFD166]/10 border-[#FFD166]/40 shadow-[0_0_15px_rgba(255,209,102,0.15)]'
                : 'bg-[#0A1128]/80 border-[#2D305A] hover:border-[#6C5CE7]/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 text-center font-bold text-slate-300">{medal}</span>
              <div>
                <span className={`font-bold ${isTop1 ? 'text-[#FFD166]' : 'text-slate-200'}`}>
                  {entry.display_name || entry.wallet_address.slice(0, 10)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-medium">{entry.accuracy}% acc</span>
              <span className="font-extrabold text-[#00FFCC]">{entry.score} pts</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

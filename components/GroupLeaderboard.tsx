'use client';

import React from 'react';
import { LeaderboardEntry } from '@/lib/types';

interface GroupLeaderboardProps {
  entries: LeaderboardEntry[];
  loading: boolean;
  onOpenGroupModal: () => void;
}

export default function GroupLeaderboard({
  entries,
  loading,
  onOpenGroupModal,
}: GroupLeaderboardProps) {
  if (loading) {
    return <p className="text-xs text-slate-400 text-center py-6">Loading group ranking...</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-xs text-slate-400">No member activity recorded yet for this group.</p>
        <button
          onClick={onOpenGroupModal}
          className="px-3.5 py-1.5 bg-[#6C5CE7]/20 hover:bg-[#6C5CE7] text-[#6C5CE7] hover:text-white border border-[#6C5CE7]/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          Manage Groups
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.wallet_address}
          className="flex items-center justify-between p-3 rounded-2xl bg-[#0A1128]/80 border border-[#2D305A] hover:border-[#6C5CE7]/60 text-xs transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-[#6C5CE7]">#{entry.rank}</span>
            <span className="font-bold text-slate-200">
              {entry.display_name || entry.wallet_address.slice(0, 10)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">{entry.accuracy}%</span>
            <span className="font-heading font-black text-[#00FFCC]">{entry.score} pts</span>
          </div>
        </div>
      ))}
    </div>
  );
}

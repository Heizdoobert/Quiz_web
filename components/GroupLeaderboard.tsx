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
          className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
        >
          Manage Groups
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => (
        <div
          key={entry.wallet_address}
          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">#{entry.rank}</span>
            <span className="font-semibold text-slate-200">
              {entry.display_name || entry.wallet_address.slice(0, 10)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">{entry.accuracy}%</span>
            <span className="font-bold text-purple-400">{entry.score} pts</span>
          </div>
        </div>
      ))}
    </div>
  );
}

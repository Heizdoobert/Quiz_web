'use client';

import React from 'react';
import { UserStats } from '@/lib/types';
import StatsPanel from './StatsPanel';
import HistoryList from './HistoryList';
import { HistoryItem } from './modals/ReviewModal';

interface SidebarProps {
  stats: UserStats;
  history: HistoryItem[];
  onOpenReview: () => void;
  className?: string;
  claimableTokens?: string;
  onOpenRewards?: () => void;
}

export default function Sidebar({
  stats,
  history,
  onOpenReview,
  className = '',
  claimableTokens,
  onOpenRewards,
}: SidebarProps) {
  return (
    <aside
      className={`p-5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl backdrop-blur-sm space-y-5 ${className}`}
      aria-label="Scoreboard and Stats"
    >
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <span>📊</span> Live Scoreboard
      </h3>
      <StatsPanel
        stats={stats}
        claimableTokens={claimableTokens}
        onOpenRewards={onOpenRewards}
      />
      <div className="pt-2 border-t border-slate-700/60">
        <HistoryList history={history} onOpenReview={onOpenReview} />
      </div>
    </aside>
  );
}

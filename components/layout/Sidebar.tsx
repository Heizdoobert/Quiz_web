'use client';

import React from 'react';
import { UserStats } from '@/lib/types';
import StatsPanel from './StatsPanel';
import HistoryList from './HistoryList';
import { HistoryItem } from '../modals/ReviewModal';

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
      className={`p-5 rounded-3xl bg-[#1A1B35]/90 border border-[#2D305A] shadow-2xl backdrop-blur-md space-y-5 ${className}`}
      aria-label="Scoreboard and Stats"
    >
      <h3 className="text-sm font-extrabold text-white flex items-center gap-2 tracking-wide">
        <span className="text-base">📊</span> Live Scoreboard
      </h3>
      <StatsPanel
        stats={stats}
        claimableTokens={claimableTokens}
        onOpenRewards={onOpenRewards}
      />
      <div className="pt-3 border-t border-[#2D305A]">
        <HistoryList history={history} onOpenReview={onOpenReview} />
      </div>
    </aside>
  );
}

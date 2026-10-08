# components/layout/Sidebar.tsx
lines:43 exports:default
---
'use client';

import React from 'react';
import { UserStats, HistoryItem } from '@/lib/types';
import StatsPanel from './StatsPanel';
import HistoryList from './HistoryList';

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
      className={`glass glass-border glass-edge p-6 rounded-3xl shadow-2xl space-y-5 ${className}`}
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
      <div className="pt-3 border-t border-cyber-border">
        <HistoryList history={history} onOpenReview={onOpenReview} />
      </div>

# components/leaderboard/LeaderboardPanel.tsx
lines:82 exports:default
---
'use client';

import React, { useState } from 'react';
import { LeaderboardEntry } from '@/lib/types';
import { useSession } from '@/hooks/shared/use-session';
import GlobalLeaderboard from './GlobalLeaderboard';
import GroupLeaderboard from './GroupLeaderboard';
import { Shield, Trophy, Users } from 'lucide-react';

interface LeaderboardPanelProps {
  globalEntries: LeaderboardEntry[];
  groupEntries: LeaderboardEntry[];
  loading: boolean;
  onOpenGroupModal: () => void;
  className?: string;
}

export default function LeaderboardPanel({
  globalEntries,
  groupEntries,
  loading,
  onOpenGroupModal,
  className = '',
}: LeaderboardPanelProps) {
  const [activeTab, setActiveTab] = useState<'global' | 'group'>('global');
  const { account } = useSession();

  return (
    <section
      className={`glass glass-border glass-edge p-5 rounded-3xl shadow-2xl space-y-4 ${className}`}
      aria-label="Leaderboards"
    >
      <div className="flex items-center justify-between border-b border-[#2D305A] pb-3">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('global')}
            className={`flex items-center gap-1.5 text-xs font-black font-heading pb-1.5 border-b-2 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD166] rounded-t ${
              activeTab === 'global'
                ? 'border-[#FFD166] text-[#FFD166] shadow-[0_4px_12px_rgba(255,209,102,0.2)]'

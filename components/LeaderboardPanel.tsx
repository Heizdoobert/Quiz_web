'use client';

import React, { useState } from 'react';
import { LeaderboardEntry } from '@/lib/types';
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

  return (
    <section
      className={`p-5 rounded-3xl bg-[#1A1B35]/90 border border-[#2D305A] shadow-2xl backdrop-blur-md space-y-4 ${className}`}
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
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Global Top
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('group')}
            className={`flex items-center gap-1.5 text-xs font-black font-heading pb-1.5 border-b-2 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C5CE7] rounded-t ${
              activeTab === 'group'
                ? 'border-[#6C5CE7] text-[#6C5CE7] shadow-[0_4px_12px_rgba(108,92,231,0.2)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Group Guild
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenGroupModal}
          className="p-1.5 rounded-xl bg-[#25284D] hover:bg-[#2E3260] border border-[#3A3E70] text-[#00FFCC] hover:text-white transition-all cursor-pointer shadow-sm active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
          title="Create or Join Groups"
        >
          <Shield className="w-3.5 h-3.5" />
        </button>
      </div>

      {activeTab === 'global' ? (
        <GlobalLeaderboard entries={globalEntries} loading={loading} />
      ) : (
        <GroupLeaderboard
          entries={groupEntries}
          loading={loading}
          onOpenGroupModal={onOpenGroupModal}
        />
      )}
    </section>
  );
}

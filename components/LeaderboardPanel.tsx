'use client';

import React, { useState } from 'react';
import { LeaderboardEntry } from '@/lib/types';
import GlobalLeaderboard from './GlobalLeaderboard';
import GroupLeaderboard from './GroupLeaderboard';
import { Shield } from 'lucide-react';

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
      className={`p-5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl backdrop-blur-sm space-y-4 ${className}`}
      aria-label="Leaderboards"
    >
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('global')}
            className={`text-xs font-bold pb-1 border-b-2 transition-colors ${
              activeTab === 'global'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🏆 Global Top
          </button>
          <button
            onClick={() => setActiveTab('group')}
            className={`text-xs font-bold pb-1 border-b-2 transition-colors ${
              activeTab === 'group'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🛡️ Group Guild
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenGroupModal}
          className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
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

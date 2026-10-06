'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LeaderboardEntry } from '@/lib/types';
import { useSession } from '@/hooks/shared/use-session';
import GlobalLeaderboard from './GlobalLeaderboard';
import GroupLeaderboard from './GroupLeaderboard';
import { Shield, Trophy, Users } from 'lucide-react';
import { useIntersectionObserver } from '@/hooks/shared/use-intersection';
import { supabase } from '@/lib/supabase/supabase';
import debounce from 'lodash.debounce';

interface LeaderboardPanelProps {
  globalEntries: LeaderboardEntry[];
  groupEntries: LeaderboardEntry[];
  loading: boolean;
  onOpenGroupModal: () => void;
  refreshLeaderboard?: () => void;
  className?: string;
}

export default function LeaderboardPanel({
  globalEntries,
  groupEntries,
  loading,
  onOpenGroupModal,
  refreshLeaderboard,
  className = '',
}: LeaderboardPanelProps) {
  const [activeTab, setActiveTab] = useState<'global' | 'group'>('global');
  const { account } = useSession();
  
  const panelRef = useRef<HTMLElement>(null);
  const isVisible = useIntersectionObserver(panelRef, { threshold: 0.1 });

  const debouncedRefresh = useMemo(() => {
    if (!refreshLeaderboard) return null;
    return debounce(refreshLeaderboard, 5000, { leading: true, trailing: true });
  }, [refreshLeaderboard]);

  useEffect(() => {
    if (!isVisible || !debouncedRefresh) return;

    const channel = supabase
      .channel('public:quiz_results')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quiz_results' },
        () => {
          debouncedRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      debouncedRefresh.cancel();
    };
  }, [isVisible, debouncedRefresh]);

  return (
    <section
      ref={panelRef}
      className={`glass glass-border glass-edge p-5 rounded-3xl shadow-2xl space-y-4 ${className}`}
      aria-label="Leaderboards"
    >
      <div className="flex items-center justify-between border-b border-cyber-border pb-3">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('global')}
            className={`flex items-center gap-1.5 text-xs font-black font-heading pb-1.5 border-b-2 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crypto-gold rounded-t ${
              activeTab === 'global'
                ? 'border-crypto-gold text-crypto-gold shadow-[0_4px_12px_rgba(255,209,102,0.2)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Global Top
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('group')}
            className={`flex items-center gap-1.5 text-xs font-black font-heading pb-1.5 border-b-2 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-indigo rounded-t ${
              activeTab === 'group'
                ? 'border-electric-indigo text-electric-indigo shadow-[0_4px_12px_rgba(108,92,231,0.2)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Group Guild
          </button>
        </div>

        {account && (
          <button
            type="button"
            onClick={onOpenGroupModal}
            className="p-1.5 rounded-xl bg-cyber-violet-light hover:bg-[#2E3260] border border-[#3A3E70] text-neo-mint hover:text-white transition-all cursor-pointer shadow-sm active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint"
            title="Create or Join Groups"
          >
            <Shield className="w-3.5 h-3.5" />
          </button>
        )}
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

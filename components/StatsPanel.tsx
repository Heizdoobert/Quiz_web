'use client';

import React from 'react';
import { UserStats } from '@/lib/types';
import { Flame, Trophy, Target, Coins } from 'lucide-react';

interface StatsPanelProps {
  stats: UserStats;
  claimableTokens?: string;
  onOpenRewards?: () => void;
}

export default function StatsPanel({ stats, claimableTokens, onOpenRewards }: StatsPanelProps) {
  const formattedClaimable = claimableTokens
    ? (BigInt(claimableTokens) / (BigInt(10) ** BigInt(18))).toString()
    : '0';
  const hasClaimable = BigInt(claimableTokens || '0') > BigInt(0);

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2.5">
        {/* Total Score */}
        <div className="p-3 bg-slate-900/70 border border-slate-700/80 rounded-xl flex flex-col items-center justify-center text-center">
          <Trophy className="w-4 h-4 text-amber-400 mb-1" />
          <span className="text-[10px] uppercase font-semibold text-slate-400">Score</span>
          <span className="text-lg font-bold text-white">{stats.score}</span>
          <span className="text-[10px] text-slate-500">pts</span>
        </div>

        {/* Streak */}
        <div className="p-3 bg-slate-900/70 border border-slate-700/80 rounded-xl flex flex-col items-center justify-center text-center">
          <Flame className="w-4 h-4 text-orange-500 mb-1" />
          <span className="text-[10px] uppercase font-semibold text-slate-400">Streak</span>
          <span className="text-lg font-bold text-orange-400">{stats.streak}</span>
          <span className="text-[10px] text-slate-500">Best: {stats.bestStreak}</span>
        </div>

        {/* Accuracy */}
        <div className="p-3 bg-slate-900/70 border border-slate-700/80 rounded-xl flex flex-col items-center justify-center text-center">
          <Target className="w-4 h-4 text-blue-400 mb-1" />
          <span className="text-[10px] uppercase font-semibold text-slate-400">Accuracy</span>
          <span className="text-lg font-bold text-blue-400">{stats.accuracy}%</span>
          <span className="text-[10px] text-slate-500">{stats.totalAnswered} total</span>
        </div>
      </div>

      {/* Rewards Summary */}
      {onOpenRewards && (
        <button
          onClick={onOpenRewards}
          className="w-full p-2.5 bg-slate-900/70 border border-slate-700/80 rounded-xl flex items-center justify-between hover:bg-slate-800/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-300">
              {hasClaimable ? `${formattedClaimable} $QUIZ claimable` : 'No tokens to claim'}
            </span>
          </div>
          <span className="text-[10px] text-blue-400 font-medium">View Rewards →</span>
        </button>
      )}
    </div>
  );
}

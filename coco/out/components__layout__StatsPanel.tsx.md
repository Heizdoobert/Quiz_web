# components/layout/StatsPanel.tsx
lines:79 exports:default
---
'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
        <div className="bg-elevation-2 glass-border border border-transparent px-1.5 py-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-inner hover:border-[#6C5CE7]/50 transition-colors">
          <Trophy className="w-4 h-4 text-[#FFD166] mb-1" />
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap">Score</span>
          <span className="text-xl font-black font-heading text-white">{stats.score}</span>
          <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">pts</span>
        </div>

        {/* Streak with Dynamic Flame Glow */}
        <div
          className={`bg-elevation-2 glass-border px-1.5 py-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-inner transition-all ${
            stats.streak >= 3
              ? 'border border-[#FF4757] animate-pulse'
              : 'border border-transparent hover:border-[#FF4757]/50'
          }`}
        >
          <Flame className={`w-4 h-4 mb-1 ${stats.streak >= 3 ? 'text-[#FF4757] animate-bounce' : 'text-[#FF4757]'}`} />
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap">Streak</span>

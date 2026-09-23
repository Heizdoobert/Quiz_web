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
        <div className="p-3 bg-[#0A1128]/80 border border-[#2D305A] rounded-2xl flex flex-col items-center justify-center text-center shadow-inner hover:border-[#6C5CE7]/50 transition-colors">
          <Trophy className="w-4 h-4 text-[#FFD166] mb-1" />
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Score</span>
          <span className="text-xl font-black font-heading text-white">{stats.score}</span>
          <span className="text-[10px] text-slate-500 font-medium">pts</span>
        </div>

        {/* Streak with Dynamic Flame Glow */}
        <div
          className={`p-3 bg-[#0A1128]/80 rounded-2xl flex flex-col items-center justify-center text-center shadow-inner transition-all ${
            stats.streak >= 3
              ? 'border border-[#FF4757] shadow-[0_0_20px_rgba(255,71,87,0.3)] animate-pulse'
              : 'border border-[#2D305A] hover:border-[#FF4757]/50'
          }`}
        >
          <Flame className={`w-4 h-4 mb-1 ${stats.streak >= 3 ? 'text-[#FF4757] animate-bounce' : 'text-[#FF4757]'}`} />
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Streak</span>
          <span className="text-xl font-black font-heading text-[#FFD166]">{stats.streak}</span>
          <span className="text-[10px] text-slate-500 font-medium">Best: {stats.bestStreak}</span>
        </div>

        {/* Accuracy */}
        <div className="p-3 bg-[#0A1128]/80 border border-[#2D305A] rounded-2xl flex flex-col items-center justify-center text-center shadow-inner hover:border-[#00FFCC]/50 transition-colors">
          <Target className="w-4 h-4 text-[#00FFCC] mb-1" />
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Accuracy</span>
          <span className="text-xl font-black font-heading text-[#00FFCC]">{stats.accuracy}%</span>
          <span className="text-[10px] text-slate-500 font-medium">{stats.totalAnswered} total</span>
        </div>
      </div>

      {/* Rewards Summary */}
      {onOpenRewards && (
        <motion.button
          type="button"
          onClick={onOpenRewards}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          className="w-full p-2.5 bg-[#0A1128]/80 border border-[#2D305A] hover:border-[#00FFCC]/50 rounded-2xl flex items-center justify-between hover:bg-[#25284D] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#FFD166] group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-semibold text-slate-300">
              {hasClaimable ? (
                <span className="text-[#00FFCC] font-bold font-heading">{formattedClaimable} $QUIZ claimable</span>
              ) : (
                'No tokens to claim'
              )}
            </span>
          </div>
          <span className="text-[10px] text-[#00FFCC] font-bold font-heading group-hover:underline">View Rewards →</span>
        </motion.button>
      )}
    </div>
  );
}

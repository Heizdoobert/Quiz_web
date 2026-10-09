'use client';

import React from 'react';
import { UserStats } from '@/lib/types';
import { Flame, Trophy, Target } from 'lucide-react';

interface StatsPanelProps {
  stats: UserStats;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2.5">
        {/* Total Score */}
        <div className="bg-elevation-2 glass-border border border-transparent px-1.5 py-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-inner hover:border-electric-indigo/50 transition-colors">
          <Trophy className="w-4 h-4 text-crypto-gold mb-1" />
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap">Score</span>
          <span className="text-xl font-black font-heading text-white">{stats.score}</span>
          <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">pts</span>
        </div>

        {/* Streak with Dynamic Flame Glow */}
        <div
          className={`bg-elevation-2 glass-border px-1.5 py-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-inner transition-all ${
            stats.streak >= 3
              ? 'border border-pop-coral animate-pulse'
              : 'border border-transparent hover:border-pop-coral/50'
          }`}
        >
          <Flame className={`w-4 h-4 mb-1 ${stats.streak >= 3 ? 'text-pop-coral animate-bounce' : 'text-pop-coral'}`} />
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap">Streak</span>
          <span className="text-xl font-black font-heading text-crypto-gold">{stats.streak}</span>
          <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Best: {stats.bestStreak}</span>
        </div>

        {/* Accuracy */}
        <div className="bg-elevation-2 glass-border border border-transparent px-1.5 py-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-inner hover:border-neo-mint/50 transition-colors">
          <Target className="w-4 h-4 text-neo-mint mb-1" />
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap">Accuracy</span>
          <span className="text-xl font-black font-heading text-neo-mint">{stats.accuracy}%</span>
          <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{stats.totalAnswered} total</span>
        </div>
      </div>
    </div>
  );
}

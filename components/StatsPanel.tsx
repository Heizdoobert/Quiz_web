'use client';

import React from 'react';
import { UserStats } from '@/lib/types';
import { Flame, Trophy, Target } from 'lucide-react';

interface StatsPanelProps {
  stats: UserStats;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  return (
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
  );
}

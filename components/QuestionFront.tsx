'use client';

import React, { useEffect } from 'react';
import { ClientQuestion } from '@/lib/types';
import { Timer, Settings2 } from 'lucide-react';

interface QuestionFrontProps {
  question: ClientQuestion;
  timeLeft: number;
  onSelectAnswer: (index: number) => void;
  onOpenTimerSettings: () => void;
  onUse5050: () => void;
  onUseSkip: () => void;
  fiftyFiftyUsed: boolean;
  skipUsed: boolean;
  eliminatedIndices: number[];
  isSubmitting: boolean;
  isFlipped?: boolean;
}

export default function QuestionFront({
  question,
  timeLeft,
  onSelectAnswer,
  onOpenTimerSettings,
  onUse5050,
  onUseSkip,
  fiftyFiftyUsed,
  skipUsed,
  eliminatedIndices,
  isSubmitting,
  isFlipped = false,
}: QuestionFrontProps) {
  // Keyboard navigation: 1-4 or A-D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFlipped || isSubmitting) return;
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;

      const key = e.key.toUpperCase();
      let index = -1;
      if (key === '1' || key === 'A') index = 0;
      if (key === '2' || key === 'B') index = 1;
      if (key === '3' || key === 'C') index = 2;
      if (key === '4' || key === 'D') index = 3;

      if (index >= 0 && index < 4 && !eliminatedIndices.includes(index)) {
        onSelectAnswer(index);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, isSubmitting, eliminatedIndices, onSelectAnswer]);

  return (
    <div className="flex flex-col h-full justify-between p-6 sm:p-8 bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-semibold tracking-wide uppercase">
          {question.category || 'Trivia'}
        </span>

        {/* Timer Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-700/80 rounded-full">
          <Timer className="w-3.5 h-3.5 text-blue-400" />
          <span
            className={`font-mono text-xs font-bold ${
              timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-slate-200'
            }`}
          >
            {Math.floor(timeLeft / 60)
              .toString()
              .padStart(2, '0')}
            :{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={onOpenTimerSettings}
            className="text-slate-400 hover:text-white ml-1 transition-colors"
            title="Timer Settings"
            aria-label="Timer Settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Power-ups */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={fiftyFiftyUsed || isSubmitting}
            onClick={onUse5050}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-900/70 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-900/70 transition-all"
            title="Eliminate 2 wrong options"
          >
            ✂️ 50:50
          </button>
          <button
            type="button"
            disabled={skipUsed || isSubmitting}
            onClick={onUseSkip}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-900/70 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-900/70 transition-all"
            title="Skip this question"
          >
            ⏭️ Skip
          </button>
        </div>
      </div>

      {/* Question Heading */}
      <div className="my-6 text-center">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-relaxed">
          {question.prompt}
        </h2>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto" role="group" aria-label="Answer options">
        {question.options.map((opt, idx) => {
          const isEliminated = eliminatedIndices.includes(idx);
          const letter = ['A', 'B', 'C', 'D'][idx];
          return (
            <button
              key={idx}
              disabled={isEliminated || isSubmitting}
              onClick={() => onSelectAnswer(idx)}
              className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all group ${
                isEliminated
                  ? 'opacity-25 bg-slate-900 border-slate-800 cursor-not-allowed'
                  : 'bg-slate-900/70 border-slate-700 hover:border-blue-500 hover:bg-slate-700/60 hover:shadow-md cursor-pointer'
              }`}
            >
              <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-colors shrink-0">
                {letter}
              </span>
              <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

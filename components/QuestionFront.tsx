'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClientQuestion } from '@/lib/types';
import { Timer, Settings2, Sparkles, FastForward, Loader2 } from 'lucide-react';

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
  const [prevQuestionId, setPrevQuestionId] = useState(question.id);
  const [clickedIdx, setClickedIdx] = useState<number | null>(null);

  if (question.id !== prevQuestionId) {
    setPrevQuestionId(question.id);
    setClickedIdx(null);
  }

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

      if (index !== -1 && !eliminatedIndices.includes(index) && index < question.options.length) {
        setClickedIdx(index);
        onSelectAnswer(index);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, isSubmitting, eliminatedIndices, question.options.length, onSelectAnswer]);

  function getCategoryBadge(cat: string) {
    const lower = (cat || '').toLowerCase();
    if (lower.includes('defi')) {
      return 'bg-[#8A2BE2]/15 text-[#8A2BE2] border-[#8A2BE2]/40';
    }
    if (lower.includes('nft') || lower.includes('game')) {
      return 'bg-[#FF007F]/15 text-[#FF007F] border-[#FF007F]/40';
    }
    if (lower.includes('layer') || lower.includes('web3') || lower.includes('crypto')) {
      return 'bg-[#3071FF]/15 text-[#3071FF] border-[#3071FF]/40';
    }
    return 'bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/40';
  }

  const handleOptionClick = (idx: number) => {
    if (isSubmitting || eliminatedIndices.includes(idx)) return;
    setClickedIdx(idx);
    onSelectAnswer(idx);
  };

  return (
    <div className="flex flex-col h-full justify-between p-6 sm:p-8 bg-[#1A1B35] border border-[#2D305A] rounded-3xl shadow-2xl backdrop-blur-md">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[#2D305A]">
        <span className={`px-3 py-1 border rounded-full text-xs font-bold font-heading tracking-wider uppercase select-none ${getCategoryBadge(question.category)}`}>
          {question.category || 'Trivia'}
        </span>

        {/* Timer Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0A1128]/80 border border-[#2D305A] rounded-full shadow-inner select-none">
          <Timer className={`w-3.5 h-3.5 ${timeLeft <= 5 ? 'text-[#FF4757]' : 'text-[#6C5CE7]'}`} />
          <span
            className={`font-heading text-xs font-bold tracking-wider tabular-nums ${
              timeLeft <= 5 ? 'text-[#FF4757] animate-pulse font-black' : 'text-slate-200'
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
            className="text-slate-400 hover:text-white ml-1 p-0.5 rounded transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00FFCC] cursor-pointer"
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
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-[#2D305A] bg-[#0A1128]/80 hover:bg-[#25284D] hover:border-[#6C5CE7] hover:text-[#00FFCC] text-slate-300 disabled:opacity-30 disabled:pointer-events-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] transition-all cursor-pointer"
            title="Eliminate 2 wrong options"
          >
            <Sparkles className="w-3 h-3 text-[#00FFCC]" /> 50:50
          </button>
          <button
            type="button"
            disabled={skipUsed || isSubmitting}
            onClick={onUseSkip}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-[#2D305A] bg-[#0A1128]/80 hover:bg-[#25284D] hover:border-[#6C5CE7] hover:text-[#00FFCC] text-slate-300 disabled:opacity-30 disabled:pointer-events-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C5CE7] transition-all cursor-pointer"
            title="Skip this question"
          >
            <FastForward className="w-3 h-3 text-[#6C5CE7]" /> Skip
          </button>
        </div>
      </div>

      {/* Question Heading */}
      <div className="my-6 text-center">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold font-heading text-white leading-relaxed tracking-wide">
          {question.prompt}
        </h2>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-auto" role="group" aria-label="Answer options">
        {question.options.map((opt, idx) => {
          const isEliminated = eliminatedIndices.includes(idx);
          const isClicked = clickedIdx === idx;
          const letter = ['A', 'B', 'C', 'D'][idx];

          return (
            <motion.button
              key={idx}
              type="button"
              disabled={isEliminated || isSubmitting}
              onClick={() => handleOptionClick(idx)}
              whileHover={isEliminated || isSubmitting ? {} : { scale: 1.015 }}
              whileTap={isEliminated || isSubmitting ? {} : { scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className={`flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] ${
                isEliminated
                  ? 'opacity-20 bg-[#0A1128] border-[#1C1E3A] cursor-not-allowed pointer-events-none'
                  : isClicked && isSubmitting
                  ? 'bg-[#222344] border-[#00FFCC] shadow-[0_0_25px_rgba(0,255,204,0.3)] ring-1 ring-[#00FFCC] cursor-wait'
                  : isSubmitting
                  ? 'bg-[#131428]/60 border-[#2D305A]/60 opacity-60 cursor-not-allowed'
                  : 'bg-[#131428]/80 border-[#2D305A] hover:border-[#00FFCC] hover:bg-[#222344] hover:shadow-[0_0_20px_rgba(0,255,204,0.18)] cursor-pointer'
              }`}
            >
              <span className={`w-8 h-8 flex items-center justify-center rounded-xl border text-xs font-black font-heading transition-all shrink-0 ${
                isClicked && isSubmitting
                  ? 'bg-[#00FFCC]/20 border-[#00FFCC] text-[#00FFCC]'
                  : 'bg-[#1A1B35] border-[#2D305A] text-slate-300 group-hover:bg-[#00FFCC] group-hover:text-[#0A1128] group-hover:border-[#00FFCC] group-hover:shadow-[0_0_10px_#00FFCC]'
              }`}>
                {isClicked && isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#00FFCC]" />
                ) : (
                  letter
                )}
              </span>
              <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                {opt}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

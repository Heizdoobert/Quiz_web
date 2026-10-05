'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ClientQuestion } from '@/lib/types';
import { useQuestionFront } from '@/hooks/quiz/use-question-front';
import { Timer, Settings2, Sparkles, FastForward, Loader2, Users, ShieldCheck, ExternalLink, Rocket } from 'lucide-react';

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
  isUnlocked?: boolean;
  onUnlock?: () => void;
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
  isUnlocked = true,
  onUnlock,
}: QuestionFrontProps) {
  const { clickedIdx, getCategoryBadge, handleOptionClick } = useQuestionFront({
    questionId: question.id,
    optionsLength: question.options.length,
    isFlipped,
    isSubmitting,
    isUnlocked,
    eliminatedIndices,
    onSelectAnswer,
  });

  return (
    <div className="flex flex-col h-full justify-between p-6 sm:p-8 glass glass-border glass-edge rounded-3xl shadow-2xl">
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-cyber-border">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 border rounded-full text-xs font-bold font-heading tracking-wider uppercase select-none ${getCategoryBadge(question.category)}`}>
            {question.category || 'Trivia'}
          </span>
          {question.created_by ? (
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-crypto-gold/10 border border-crypto-gold/30 text-[10px] font-mono text-crypto-gold"
              title={`Submitted by community member ${question.created_by}`}
            >
              <Users className="w-3 h-3" />
              <span>{question.created_by.slice(0, 6)}...</span>
            </span>
          ) : (
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neo-mint/10 border border-neo-mint/30 text-[10px] font-heading font-bold text-neo-mint"
              title="Verified Core Question"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Verified</span>
            </span>
          )}
        </div>

        {/* Timer Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-deep-space/80 border border-cyber-border rounded-full shadow-inner select-none">
          <Timer className={`w-3.5 h-3.5 ${timeLeft <= 5 ? 'text-pop-coral' : 'text-electric-indigo'}`} />
          <span
            className={`font-heading text-xs font-bold tracking-wider tabular-nums ${
              timeLeft <= 5 ? 'text-pop-coral animate-pulse font-black' : 'text-slate-200'
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
            className="text-slate-400 hover:text-white ml-1 p-0.5 rounded transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neo-mint cursor-pointer"
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
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-cyber-border bg-deep-space/80 hover:bg-cyber-violet-light hover:border-electric-indigo hover:text-neo-mint text-slate-300 disabled:opacity-30 disabled:pointer-events-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint transition-all cursor-pointer"
            title="Eliminate 2 wrong options"
          >
            <Sparkles className="w-3 h-3 text-neo-mint" /> 50:50
          </button>
          <button
            type="button"
            disabled={skipUsed || isSubmitting}
            onClick={onUseSkip}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-cyber-border bg-deep-space/80 hover:bg-cyber-violet-light hover:border-electric-indigo hover:text-neo-mint text-slate-300 disabled:opacity-30 disabled:pointer-events-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-indigo transition-all cursor-pointer"
            title="Skip this question"
          >
            <FastForward className="w-3 h-3 text-electric-indigo" /> Skip
          </button>
        </div>
      </div>

      {/* Question Heading */}
      <div className="my-6 text-center">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-relaxed tracking-wide">
          {question.prompt}
        </h2>
      </div>

      {/* Options Grid or Unlock Sponsor CTA */}
      {!isUnlocked ? (
        <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-deep-space/85 border border-neo-mint/40 rounded-2xl text-center backdrop-blur-md my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crypto-gold/15 border border-crypto-gold/40 text-crypto-gold text-xs font-bold font-heading uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unlock Question • Earn $QUIZ</span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white mb-2">
            Ready for the Web3 Challenge?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Click the button below to <span className="text-neo-mint font-bold">open our sponsor tab</span> and activate the countdown timer!
          </p>

          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={onUnlock}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-black font-heading rounded-2xl bg-linear-to-r from-neo-mint via-cat-l1 to-electric-indigo hover:opacity-95 text-deep-space cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint"
          >
            <Rocket className="w-5 h-5 text-deep-space" />
            <span>START ANSWERING</span>
            <ExternalLink className="w-4 h-4 text-deep-space opacity-80" />
          </motion.button>

          <span className="text-[11px] text-slate-400 mt-3 font-medium">
            🛡️ Opens in new tab • No page reload • 100% sponsor guarantee
          </span>
        </div>
      ) : (
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
                whileHover={isEliminated || isSubmitting ? {} : { scale: 1.015, filter: 'brightness(1.1)' }}
                whileTap={isEliminated || isSubmitting ? {} : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                className={`flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-[color,background-color,border-color,opacity,box-shadow] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint ${
                  isEliminated
                    ? 'opacity-20 bg-deep-space border-[#1C1E3A] cursor-not-allowed pointer-events-none'
                    : isClicked && isSubmitting
                    ? 'bg-[#222344] border-neo-mint ring-1 ring-neo-mint cursor-wait'
                    : isSubmitting
                    ? 'bg-[#131428]/60 border-cyber-border/60 opacity-60 cursor-not-allowed'
                    : 'bg-[#131428]/80 border-cyber-border hover:border-neo-mint hover:bg-[#222344] cursor-pointer'
                }`}
              >
                <span className={`w-8 h-8 flex items-center justify-center rounded-xl border text-xs font-black font-heading transition-all shrink-0 ${
                  isClicked && isSubmitting
                    ? 'bg-neo-mint/20 border-neo-mint text-neo-mint'
                    : 'bg-cyber-violet border-cyber-border text-slate-300 group-hover:bg-neo-mint group-hover:text-deep-space group-hover:border-neo-mint'
                }`}>
                  {isClicked && isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-neo-mint" />
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
      )}
    </div>
  );
}

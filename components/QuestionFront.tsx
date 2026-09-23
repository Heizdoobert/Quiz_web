'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ClientQuestion } from '@/lib/types';
import { useQuestionFront } from '@/hooks/use-question-front';
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
    <div className="flex flex-col h-full justify-between p-6 sm:p-8 bg-[#1A1B35] border border-[#2D305A] rounded-3xl shadow-2xl backdrop-blur-md">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[#2D305A]">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 border rounded-full text-xs font-bold font-heading tracking-wider uppercase select-none ${getCategoryBadge(question.category)}`}>
            {question.category || 'Trivia'}
          </span>
          {question.created_by ? (
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFD166]/10 border border-[#FFD166]/30 text-[10px] font-mono text-[#FFD166]"
              title={`Submitted by community member ${question.created_by}`}
            >
              <Users className="w-3 h-3" />
              <span>{question.created_by.slice(0, 6)}...</span>
            </span>
          ) : (
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00FFCC]/10 border border-[#00FFCC]/30 text-[10px] font-heading font-bold text-[#00FFCC]"
              title="Verified Core Question"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Verified</span>
            </span>
          )}
        </div>

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

      {/* Options Grid or Unlock Sponsor CTA */}
      {!isUnlocked ? (
        <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-[#0A1128]/85 border border-[#00FFCC]/40 rounded-2xl shadow-[0_0_35px_rgba(0,255,204,0.15)] text-center backdrop-blur-md my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD166]/15 border border-[#FFD166]/40 text-[#FFD166] text-xs font-bold font-heading uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unlock Question • Earn $QUIZ</span>
          </div>

          <h3 className="text-base sm:text-lg font-bold font-heading text-white mb-2">
            Ready for the Web3 Challenge?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Click the button below to <span className="text-[#00FFCC] font-bold">open our sponsor tab</span> and activate the countdown timer!
          </p>

          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={onUnlock}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-black font-heading rounded-2xl bg-gradient-to-r from-[#00FFCC] via-[#3071FF] to-[#6C5CE7] hover:opacity-95 text-[#0A1128] shadow-[0_0_30px_rgba(0,255,204,0.45)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
          >
            <Rocket className="w-5 h-5 text-[#0A1128]" />
            <span>START ANSWERING</span>
            <ExternalLink className="w-4 h-4 text-[#0A1128] opacity-80" />
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
      )}
    </div>
  );
}

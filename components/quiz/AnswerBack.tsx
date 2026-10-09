'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AnswerSubmissionResult, ClientQuestion, UserStats } from '@/lib/types';
import { ArrowRight, CheckCircle2, XCircle, Flag } from 'lucide-react';
import { CommunityDiscussion } from './CommunityDiscussion';
import { SocialShare } from '../community/SocialShare';

interface AnswerBackProps {
  question: ClientQuestion;
  result: AnswerSubmissionResult;
  stats?: UserStats;
  onNext: () => void;
  onOpenDispute?: () => void;
}

export default function AnswerBack({
  question,
  result,
  stats,
  onNext,
  onOpenDispute,
}: AnswerBackProps) {
  const letters = ['A', 'B', 'C', 'D'];
  const nextRef = useRef<HTMLButtonElement>(null);

  // The answered option sat on the face that just turned away, so focus would drop to <body>;
  // put it on the next step instead. A no-op while this face is still inert.
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, []);

  const notSavedMessage: Record<NonNullable<AnswerSubmissionResult['notSavedReason']>, string> = {
    'signed-out': 'Sign in so this counts.',
    'already-answered': 'Already answered — this one only counts once.',
    'own-question': "You wrote this question, so it doesn't count for you.",
    'rate-limited': 'Too many answers from this connection. Try again in a while.',
    error: 'Not saved — something went wrong, try again.',
  };

  // Advance to next question on Enter or Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable || target?.tagName === 'BUTTON') return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext]);

  return (
    <div className="flex flex-col h-full justify-between p-6 sm:p-8 glass glass-border glass-edge rounded-3xl shadow-2xl">
      {/* Top Banner */}
      <div
        role="status"
        className={`flex items-center gap-3.5 p-4 rounded-2xl border ${
          result.isCorrect
            ? 'bg-neo-mint/10 border-neo-mint/40 text-neo-mint'
            : 'bg-pop-coral/10 border-pop-coral/40 text-pop-coral'
        }`}
      >
        {result.isCorrect ? (
          <CheckCircle2 className="w-8 h-8 text-neo-mint shrink-0" />
        ) : (
          <XCircle className="w-8 h-8 text-pop-coral shrink-0" />
        )}
        <div>
          <h3 className="text-lg font-bold tracking-wide">
            {result.isCorrect ? 'Correct! Well Done!' : 'Incorrect! Keep Going!'}
          </h3>
          <p className="text-xs font-semibold opacity-90">
            {result.recorded
              ? result.isCorrect
                ? '+1 Score point'
                : 'Streak reset to 0'
              : notSavedMessage[result.notSavedReason ?? 'error']}
          </p>
        </div>
      </div>

      {/* Answer & Explanation Box */}
      <div className="my-6 p-5 rounded-2xl bg-deep-space/80 border border-cyber-border space-y-3">
        <div>
          <span className="text-xs font-bold font-heading text-slate-400 uppercase tracking-wider">
            Correct Answer:
          </span>
          <p className="text-base font-bold font-heading text-neo-mint mt-0.5">
            {letters[result.correctIndex]}: {question.options[result.correctIndex]}
          </p>
        </div>

        {result.explanation && (
          <div className="pt-3 border-t border-[#1C1E3A]">
            <span className="text-xs font-bold font-heading text-slate-400 uppercase tracking-wider">
              Explanation:
            </span>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {result.explanation}
            </p>
          </div>
        )}
      </div>

      <CommunityDiscussion questionId={question.id} />

      {/* Next Button & Dispute Footer */}
      <div className="pt-4 border-t border-cyber-border">
        <div className="flex items-center justify-between mb-4">
          {onOpenDispute ? (
            <button
              type="button"
              onClick={onOpenDispute}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-pop-coral hover:bg-pop-coral/10 border border-transparent hover:border-pop-coral/30 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pop-coral"
              title="Challenge or report this question"
            >
              <Flag className="w-3.5 h-3.5 text-pop-coral/70" />
              <span className="hidden sm:inline">Dispute Question</span>
            </button>
          ) : (
            <div />
          )}

          <motion.button
            ref={nextRef}
            type="button"
            onClick={onNext}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-neo-mint to-electric-indigo hover:opacity-95 text-deep-space font-black font-heading rounded-xl text-sm cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-violet"
          >
            <span>Next Question</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>
        
        {stats && (
          <SocialShare score={stats.score} streak={stats.streak} />
        )}
      </div>
    </div>
  );
}

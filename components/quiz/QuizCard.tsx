'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AnswerSubmissionResult, ClientQuestion, UserStats } from '@/lib/types';
import QuestionFront from './QuestionFront';
import AnswerBack from './AnswerBack';
import useSound from 'use-sound';

import { Rocket, PlusCircle } from 'lucide-react';

interface QuizCardProps {
  question: ClientQuestion | null;
  isFlipped: boolean;
  timeLeft: number;
  result: AnswerSubmissionResult | null;
  stats?: UserStats;
  onSelectAnswer: (index: number) => void;
  onNextQuestion: () => void;
  onOpenTimerSettings: () => void;
  onUse5050: () => void;
  onUseSkip: () => void;
  fiftyFiftyUsed: boolean;
  skipUsed: boolean;
  eliminatedIndices: number[];
  isSubmitting: boolean;
  onAddQuestionClick: () => void;
  onOpenDispute?: () => void;
  isUnlocked?: boolean;
  onUnlock?: () => void;
}

export default function QuizCard({
  question,
  isFlipped,
  timeLeft,
  result,
  stats,
  onSelectAnswer,
  onNextQuestion,
  onOpenTimerSettings,
  onUse5050,
  onUseSkip,
  fiftyFiftyUsed,
  skipUsed,
  eliminatedIndices,
  isSubmitting,
  onAddQuestionClick,
  onOpenDispute,
  isUnlocked = true,
  onUnlock,
}: QuizCardProps) {
  const [playFlip] = useSound('/sounds/flip.mp3', { volume: 0.5 });
  const [playCorrect] = useSound('/sounds/correct.mp3', { volume: 0.6 });
  const [playWrong] = useSound('/sounds/wrong.mp3', { volume: 0.5 });

  // Fire confetti and sound if result is correct
  React.useEffect(() => {
    if (isFlipped) {
      playFlip();
      
      if (result) {
        if (result.isCorrect) {
          setTimeout(playCorrect, 300); // Slight delay for the flip animation
          import('canvas-confetti').then(({ default: confetti }) => {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#00FFCC', '#6C5CE7', '#FFD166', '#FF4757'],
            });
          });
        } else {
          setTimeout(playWrong, 300);
        }
      }
    }
  }, [isFlipped, result, playFlip, playCorrect, playWrong]);

  // Empty state when no question is available
  if (!question) {
    return (
      <div className="w-full min-h-105 flex flex-col items-center justify-center p-8 glass glass-border glass-edge rounded-3xl shadow-2xl shadow-black/60 text-center">
        <Rocket className="w-12 h-12 text-neo-mint mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-white mb-2">No Quiz Questions Yet</h2>
        <p className="text-sm text-slate-300 max-w-md mb-6">
          Be the first to contribute! Add your own custom questions to kick off the trivia session.
        </p>
        <button
          type="button"
          onClick={onAddQuestionClick}
          className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-neo-mint to-electric-indigo hover:opacity-95 active:scale-95 text-deep-space font-black font-heading rounded-xl shadow-lg shadow-neo-mint/20 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-violet"
        >
          <PlusCircle className="w-4 h-4" /> Add First Question
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full perspective-1000">
      {/* Both faces share one grid cell, so the card grows to the taller face */}
      <motion.div
        className="grid w-full min-h-115 transform-style-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Front Face; inert hides the turned-away face from mouse, keyboard and screen readers */}
        <div
          className="col-start-1 row-start-1 backface-hidden"
          data-testid="quiz-card-front"
          inert={isFlipped}
        >
          <QuestionFront
            question={question}
            timeLeft={timeLeft}
            onSelectAnswer={onSelectAnswer}
            onOpenTimerSettings={onOpenTimerSettings}
            onUse5050={onUse5050}
            onUseSkip={onUseSkip}
            fiftyFiftyUsed={fiftyFiftyUsed}
            skipUsed={skipUsed}
            eliminatedIndices={eliminatedIndices}
            isSubmitting={isSubmitting}
            isFlipped={isFlipped}
            isUnlocked={isUnlocked}
            onUnlock={onUnlock}
          />
        </div>

        {/* Back Face */}
        <div className="col-start-1 row-start-1 backface-hidden rotate-y-180" inert={!isFlipped}>
          {result && (
            <AnswerBack
              question={question}
              result={result}
              stats={stats}
              onNext={onNextQuestion}
              onOpenDispute={onOpenDispute}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

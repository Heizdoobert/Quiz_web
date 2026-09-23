'use client';

import React from 'react';
import confetti from 'canvas-confetti';
import { AnswerSubmissionResult, ClientQuestion } from '@/lib/types';
import QuestionFront from './QuestionFront';
import AnswerBack from './AnswerBack';

import { Rocket, PlusCircle } from 'lucide-react';

interface QuizCardProps {
  question: ClientQuestion | null;
  isFlipped: boolean;
  timeLeft: number;
  result: AnswerSubmissionResult | null;
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
}

export default function QuizCard({
  question,
  isFlipped,
  timeLeft,
  result,
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
}: QuizCardProps) {
  // Fire confetti if result is correct
  React.useEffect(() => {
    if (isFlipped && result?.isCorrect) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00FFCC', '#6C5CE7', '#FFD166', '#FF4757'],
      });
    }
  }, [isFlipped, result]);

  // Empty state when no question is available
  if (!question) {
    return (
      <div className="w-full min-h-[420px] flex flex-col items-center justify-center p-8 bg-[#1A1B35] border border-[#2D305A] rounded-3xl shadow-2xl shadow-black/60 text-center">
        <Rocket className="w-12 h-12 text-[#00FFCC] mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold font-heading text-white mb-2">No Quiz Questions Yet</h2>
        <p className="text-sm text-slate-300 max-w-md mb-6">
          Be the first to contribute! Add your own custom questions to kick off the trivia session.
        </p>
        <button
          type="button"
          onClick={onAddQuestionClick}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 text-[#0A1128] font-black font-heading rounded-xl shadow-lg shadow-[#00FFCC]/20 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" /> Add First Question
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[460px] perspective-1000">
      <div
        className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front Face */}
        <div
          className={`absolute inset-0 w-full h-full backface-hidden ${
            isFlipped ? 'pointer-events-none' : ''
          }`}
          aria-hidden={isFlipped}
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
          />
        </div>

        {/* Back Face */}
        <div
          className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 ${
            !isFlipped ? 'pointer-events-none' : ''
          }`}
          aria-hidden={!isFlipped}
        >
          {result && (
            <AnswerBack
              question={question}
              result={result}
              onNext={onNextQuestion}
              onOpenDispute={onOpenDispute}
            />
          )}
        </div>
      </div>
    </div>
  );
}

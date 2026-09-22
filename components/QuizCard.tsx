'use client';

import React from 'react';
import confetti from 'canvas-confetti';
import { AnswerSubmissionResult, ClientQuestion } from '@/lib/types';
import QuestionFront from './QuestionFront';
import AnswerBack from './AnswerBack';

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
}: QuizCardProps) {
  // Fire confetti if result is correct
  React.useEffect(() => {
    if (isFlipped && result?.isCorrect) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899'],
      });
    }
  }, [isFlipped, result]);

  // Empty state when no question is available
  if (!question) {
    return (
      <div className="w-full min-h-[420px] flex flex-col items-center justify-center p-8 bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl text-center">
        <div className="text-5xl mb-4">🚀</div>
        <h2 className="text-2xl font-bold text-white mb-2">No Quiz Questions Yet</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Be the first to contribute! Add your own custom questions to kick off the trivia session.
        </p>
        <button
          type="button"
          onClick={onAddQuestionClick}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all"
        >
          ➕ Add First Question
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
        <div className="absolute inset-0 w-full h-full backface-hidden">
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
          />
        </div>

        {/* Back Face */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
          {result && (
            <AnswerBack
              question={question}
              result={result}
              onNext={onNextQuestion}
            />
          )}
        </div>
      </div>
    </div>
  );
}

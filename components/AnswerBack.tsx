'use client';

import React, { useEffect } from 'react';
import { AnswerSubmissionResult, ClientQuestion } from '@/lib/types';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

interface AnswerBackProps {
  question: ClientQuestion;
  result: AnswerSubmissionResult;
  onNext: () => void;
}

export default function AnswerBack({ question, result, onNext }: AnswerBackProps) {
  const letters = ['A', 'B', 'C', 'D'];

  // Advance to next question on Enter or Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext]);

  return (
    <div className="flex flex-col h-full justify-between p-6 sm:p-8 bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl">
      {/* Top Banner */}
      <div
        className={`flex items-center gap-3 p-4 rounded-2xl border ${
          result.isCorrect
            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
            : 'bg-red-950/40 border-red-500/50 text-red-300'
        }`}
      >
        {result.isCorrect ? (
          <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
        ) : (
          <XCircle className="w-8 h-8 text-red-400 shrink-0" />
        )}
        <div>
          <h3 className="text-lg font-bold">
            {result.isCorrect ? 'Correct! Well Done! 🎉' : 'Incorrect! Better Luck Next Time.'}
          </h3>
          <p className="text-xs opacity-80">
            {result.isCorrect ? '+1 Score point added' : 'Streak reset to 0'}
          </p>
        </div>
      </div>

      {/* Answer & Explanation Box */}
      <div className="my-6 p-5 rounded-2xl bg-slate-900/80 border border-slate-700/80 space-y-3">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Correct Answer:
          </span>
          <p className="text-base font-bold text-blue-400 mt-0.5">
            {letters[result.correctIndex]}: {question.options[result.correctIndex]}
          </p>
        </div>

        {result.explanation && (
          <div className="pt-3 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Explanation:
            </span>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {result.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Next Button Footer */}
      <div className="pt-4 border-t border-slate-700/60 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer group"
        >
          <span>Next Question</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

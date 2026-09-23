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
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext]);

  return (
    <div className="flex flex-col h-full justify-between p-6 sm:p-8 bg-[#1A1B35] border border-[#2D305A] rounded-3xl shadow-2xl backdrop-blur-md">
      {/* Top Banner */}
      <div
        className={`flex items-center gap-3.5 p-4 rounded-2xl border ${
          result.isCorrect
            ? 'bg-[#00FFCC]/10 border-[#00FFCC]/40 text-[#00FFCC] shadow-[0_0_20px_rgba(0,255,204,0.15)]'
            : 'bg-[#FF4757]/10 border-[#FF4757]/40 text-[#FF4757] shadow-[0_0_20px_rgba(255,71,87,0.15)]'
        }`}
      >
        {result.isCorrect ? (
          <CheckCircle2 className="w-8 h-8 text-[#00FFCC] shrink-0" />
        ) : (
          <XCircle className="w-8 h-8 text-[#FF4757] shrink-0" />
        )}
        <div>
          <h3 className="text-lg font-bold">
            {result.isCorrect ? 'Correct! Well Done! 🎉' : 'Incorrect! Keep Going! 💪'}
          </h3>
          <p className="text-xs font-semibold opacity-90">
            {result.isCorrect ? '+1 Score point & tokens earned' : 'Streak reset to 0'}
          </p>
        </div>
      </div>

      {/* Answer & Explanation Box */}
      <div className="my-6 p-5 rounded-2xl bg-[#0A1128]/80 border border-[#2D305A] space-y-3">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Correct Answer:
          </span>
          <p className="text-base font-bold text-[#00FFCC] mt-0.5">
            {letters[result.correctIndex]}: {question.options[result.correctIndex]}
          </p>
        </div>

        {result.explanation && (
          <div className="pt-3 border-t border-[#1C1E3A]">
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
      <div className="pt-4 border-t border-[#2D305A] flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 text-[#0A1128] font-black rounded-xl text-sm shadow-[0_0_20px_rgba(0,255,204,0.25)] hover:scale-105 transition-all cursor-pointer group"
        >
          <span>Next Question</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

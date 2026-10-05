import React from 'react';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { ClientQuestion } from '@/lib/types';

export function ContestPlayQuestion({
  question,
  index,
  totalQuestions,
  selected,
  feedback,
  onSelect,
  onNext,
  onExit,
}: {
  question: ClientQuestion;
  index: number;
  totalQuestions: number;
  selected: number | null;
  feedback: { isCorrect: boolean; correctIndex: number } | null;
  onSelect: (idx: number) => void;
  onNext: () => void;
  onExit: () => void;
}) {
  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-4">
      <button onClick={onExit} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Exit contest
      </button>
      <p className="text-xs text-slate-500 font-mono">
        Question {index + 1} / {totalQuestions}
      </p>
      <h2 className="text-lg font-bold text-white">{question.prompt}</h2>
      <div className="space-y-2">
        {question.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isCorrectAnswer = feedback && idx === feedback.correctIndex;
          const showWrong = feedback && isSelected && !feedback.isCorrect;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect(idx)}
              disabled={selected !== null}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all cursor-pointer ${
                isCorrectAnswer
                  ? 'bg-neo-mint/15 border-neo-mint text-neo-mint'
                  : showWrong
                  ? 'bg-pop-coral/15 border-pop-coral text-pop-coral'
                  : 'bg-cyber-violet border-cyber-border text-white hover:border-electric-indigo/50'
              }`}
            >
              <span className="flex items-center justify-between">
                {opt}
                {isCorrectAnswer && <CheckCircle2 className="w-4 h-4" />}
                {showWrong && <XCircle className="w-4 h-4" />}
              </span>
            </button>
          );
        })}
      </div>
      {feedback && (
        <button
          onClick={onNext}
          className="w-full py-2.5 bg-gradient-to-r from-neo-mint to-electric-indigo text-deep-space rounded-xl font-black text-sm cursor-pointer"
        >
          {index + 1 < totalQuestions ? 'Next Question' : 'Finish Contest'}
        </button>
      )}
    </div>
  );
}

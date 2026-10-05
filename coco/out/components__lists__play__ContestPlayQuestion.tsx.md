# components/lists/play/ContestPlayQuestion.tsx
lines:71 exports:ContestPlayQuestion
---
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

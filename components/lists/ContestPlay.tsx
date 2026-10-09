'use client';

import React, { useEffect, useState } from 'react';
import { startListAttempt, completeListAttempt } from '@/lib/actions/question-list-actions';
import { submitAnswer } from '@/lib/actions/quiz-actions';
import { useSession } from '@/hooks/shared/use-session';
import { ClientQuestion, QuestionListWithMeta } from '@/lib/types';
import { ContestPlayQuestion } from './play/ContestPlayQuestion';
import { useToast } from '@/hooks/shared/use-toast';

export default function ContestPlay({
  list,
  onExit,
}: {
  list: QuestionListWithMeta;
  onExit: () => void;
}) {
  const toast = useToast();
  const [questions, setQuestions] = useState<ClientQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctIndex: number } | null>(null);
  const [result, setResult] = useState<{ correctCount: number; claimed?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { account, requireSignIn: ensureSession } = useSession();

  useEffect(() => {
    // Contest answers only count for the signed-in wallet that started the attempt.
    ensureSession().then(async (signedIn) => {
      if (!signedIn) {
        toast.error('Sign the message in your wallet to play.');
        setError('Sign the message in your wallet to play.');
        return;
      }
      const res = await startListAttempt(list.id);
      if (!res.success) {
        toast.error(res.error || 'Failed to start contest.');
        setError(res.error || 'Failed to start contest.');
        return;
      }
      if (res.result) {
        setResult({ correctCount: res.result.correctCount, claimed: res.result.claimed });
      } else {
        const answeredCount = res.answeredQuestionIds?.length || 0;
        setQuestions(res.questions || []);
        if (res.questions && res.questions.length > 0 && answeredCount >= res.questions.length) {
          const completeRes = await completeListAttempt(list.id);
          if (completeRes.success) {
            setResult({ correctCount: completeRes.correctCount || 0 });
          } else {
            toast.error(completeRes.error || 'Failed to finalize contest.');
            setError(completeRes.error || 'Failed to finalize contest.');
          }
        } else {
          setIndex(answeredCount);
        }
      }
    });
  }, [list.id, ensureSession, toast]);

  const handleSelect = async (optionIdx: number) => {
    if (selected !== null || !questions) return;
    setSelected(optionIdx);
    try {
      const res = await submitAnswer({ questionId: questions[index].id, answerIndex: optionIdx });
      setFeedback({ isCorrect: res.isCorrect, correctIndex: res.correctIndex });
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : 'Error submitting answer'));
    }
  };

  const handleNext = async () => {
    if (!questions) return;
    setSelected(null);
    setFeedback(null);
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }
    const res = await completeListAttempt(list.id);
    if (!res.success) {
      toast.error(res.error || 'Failed to finalize contest.');
      setError(res.error || 'Failed to finalize contest.');
      return;
    }
    toast.success('Contest completed successfully!');
    setResult({ correctCount: res.correctCount || 0 });
  };

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-3">
        <p role="alert" className="text-sm text-pop-coral">{error}</p>
        <button onClick={onExit} className="text-sm text-neo-mint cursor-pointer">
          Back to contests
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-cyber-violet rounded-xl border border-cyber-border text-center space-y-4">
        <h2 className="text-2xl font-bold font-heading text-white">Contest Complete</h2>
        <p className="text-slate-300">
          You scored <span className="font-bold text-neo-mint">{result.correctCount}</span> out of {questions?.length ?? 0}.
        </p>
        <button
          onClick={onExit}
          className="px-6 py-2 bg-neo-mint/15 text-neo-mint border border-neo-mint/40 rounded-xl font-bold font-heading text-sm hover:bg-neo-mint/30 transition-colors"
        >
          Back to Contests
        </button>
      </div>
    );
  }

  if (!questions) {
    return <p className="text-center text-slate-400 py-12">Loading contest...</p>;
  }

  return (
    <ContestPlayQuestion
      question={questions[index]}
      index={index}
      totalQuestions={questions.length}
      selected={selected}
      feedback={feedback}
      onSelect={handleSelect}
      onNext={handleNext}
      onExit={onExit}
    />
  );
}

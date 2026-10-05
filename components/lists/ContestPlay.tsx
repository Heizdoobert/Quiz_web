'use client';

import React, { useEffect, useState } from 'react';
import { startListAttempt, completeListAttempt } from '@/lib/actions/question-list-actions';
import { submitAnswer } from '@/lib/actions/quiz-actions';
import { useSession } from '@/hooks/shared/use-session';
import { ClientQuestion, QuestionListWithMeta } from '@/lib/types';
import { ContestPlayResult } from './play/ContestPlayResult';
import { ContestPlayQuestion } from './play/ContestPlayQuestion';

export default function ContestPlay({
  list,
  onExit,
}: {
  list: QuestionListWithMeta;
  onExit: () => void;
}) {
  const [questions, setQuestions] = useState<ClientQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctIndex: number } | null>(null);
  const [result, setResult] = useState<{ correctCount: number; rewardAmount: string; claimed?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { account, requireSignIn: ensureSession } = useSession();

  useEffect(() => {
    // Contest answers only count for the signed-in wallet that started the attempt.
    ensureSession().then(async (signedIn) => {
      if (!signedIn) {
        setError('Sign the message in your wallet to play.');
        return;
      }
      const res = await startListAttempt(list.id);
      if (!res.success) {
        setError(res.error || 'Failed to start contest.');
        return;
      }
      if (res.result) {
        setResult({ correctCount: res.result.correctCount, rewardAmount: res.result.rewardAmount, claimed: res.result.claimed });
      } else {
        const answeredCount = res.answeredQuestionIds?.length || 0;
        setQuestions(res.questions || []);
        if (res.questions && res.questions.length > 0 && answeredCount >= res.questions.length) {
          const completeRes = await completeListAttempt(list.id);
          if (completeRes.success) {
            setResult({ correctCount: completeRes.correctCount || 0, rewardAmount: completeRes.rewardAmount || '0' });
          } else {
            setError(completeRes.error || 'Failed to finalize contest.');
          }
        } else {
          setIndex(answeredCount);
        }
      }
    });
  }, [list.id, ensureSession]);

  const handleSelect = async (optionIdx: number) => {
    if (selected !== null || !questions) return;
    setSelected(optionIdx);
    const res = await submitAnswer({ questionId: questions[index].id, answerIndex: optionIdx });
    setFeedback({ isCorrect: res.isCorrect, correctIndex: res.correctIndex });
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
      setError(res.error || 'Failed to finalize contest.');
      return;
    }
    setResult({ correctCount: res.correctCount || 0, rewardAmount: res.rewardAmount || '0' });
  };

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-3">
        <p className="text-sm text-pop-coral">{error}</p>
        <button onClick={onExit} className="text-sm text-neo-mint cursor-pointer">
          Back to contests
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <ContestPlayResult
        listId={list.id}
        result={result}
        totalQuestions={questions?.length ?? 0}
        onExit={onExit}
        walletAddress={account?.wallet}
      />
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

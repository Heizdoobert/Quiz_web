# components/lists/ContestPlay.tsx
lines:131 exports:default
---
'use client';

import React, { useEffect, useState } from 'react';
import { startListAttempt, completeListAttempt } from '@/lib/actions/question-list-actions';
import { submitAnswer } from '@/lib/actions/quiz-actions';
import { useSession } from '@/hooks/shared/use-session';
import { ClientQuestion, QuestionListWithMeta } from '@/lib/types';
import { ContestPlayResult } from './play/ContestPlayResult';
import { ContestPlayQuestion } from './play/ContestPlayQuestion';
import { useToast } from '@/hooks/use-toast';

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
  const [result, setResult] = useState<{ correctCount: number; rewardAmount: string; claimed?: boolean } | null>(null);
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

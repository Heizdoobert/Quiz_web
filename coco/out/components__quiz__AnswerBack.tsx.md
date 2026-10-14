# components/quiz/AnswerBack.tsx
lines:149 exports:default
---
'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AnswerSubmissionResult, ClientQuestion, UserStats } from '@/lib/types';
import { ArrowRight, CheckCircle2, XCircle, Flag } from 'lucide-react';
import { CommunityDiscussion } from './CommunityDiscussion';
import { SocialShare } from '../community/SocialShare';

interface AnswerBackProps {
  question: ClientQuestion;
  result: AnswerSubmissionResult;
  stats?: UserStats;
  onNext: () => void;
  onOpenDispute?: () => void;
}

export default function AnswerBack({
  question,
  result,
  stats,
  onNext,
  onOpenDispute,
}: AnswerBackProps) {
  const letters = ['A', 'B', 'C', 'D'];
  const nextRef = useRef<HTMLButtonElement>(null);

  // The answered option sat on the face that just turned away, so focus would drop to <body>;
  // put it on the next step instead. A no-op while this face is still inert.
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, []);

  const notSavedMessage: Record<NonNullable<AnswerSubmissionResult['notSavedReason']>, string> = {
    'signed-out': 'Sign in so this counts.',
    'already-answered': 'Already answered — this one only counts once.',
    'own-question': "You wrote this question, so it doesn't count for you.",
    'rate-limited': 'Too many answers from this connection. Try again in a while.',
    error: 'Not saved — something went wrong, try again.',
  };

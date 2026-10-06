# components/quiz/AnswerBack.tsx
lines:139 exports:default
---
'use client';

import React, { useEffect } from 'react';
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

  const notSavedMessage: Record<NonNullable<AnswerSubmissionResult['notSavedReason']>, string> = {
    'signed-out': 'Sign in with your wallet so this counts.',
    'already-answered': 'Already answered — this one only counts once.',
    'own-question': "You wrote this question, so it doesn't count for you.",
    error: 'Not saved — something went wrong, try again.',
  };

  // Advance to next question on Enter or Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable || target?.tagName === 'BUTTON') return;

      if (e.key === 'Enter' || e.key === ' ') {

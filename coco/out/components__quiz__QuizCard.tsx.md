# components/quiz/QuizCard.tsx
lines:146 exports:default
---
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AnswerSubmissionResult, ClientQuestion, UserStats } from '@/lib/types';
import QuestionFront from './QuestionFront';
import AnswerBack from './AnswerBack';
import useSound from 'use-sound';

import { Rocket, PlusCircle } from 'lucide-react';

interface QuizCardProps {
  question: ClientQuestion | null;
  isFlipped: boolean;
  timeLeft: number;
  result: AnswerSubmissionResult | null;
  stats?: UserStats;
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
  onOpenDispute?: () => void;
  isUnlocked?: boolean;
  onUnlock?: () => void;
}

export default function QuizCard({
  question,
  isFlipped,
  timeLeft,
  result,
  stats,
  onSelectAnswer,
  onNextQuestion,

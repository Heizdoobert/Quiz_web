# components/quiz/QuestionFront.tsx
lines:210 exports:default
---
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ClientQuestion } from '@/lib/types';
import { useQuestionFront } from '@/hooks/quiz/use-question-front';
import { Timer, Settings2, Sparkles, FastForward, Loader2, Users, ShieldCheck, ExternalLink, Rocket } from 'lucide-react';

interface QuestionFrontProps {
  question: ClientQuestion;
  timeLeft: number;
  onSelectAnswer: (index: number) => void;
  onOpenTimerSettings: () => void;
  onUse5050: () => void;
  onUseSkip: () => void;
  fiftyFiftyUsed: boolean;
  skipUsed: boolean;
  eliminatedIndices: number[];
  isSubmitting: boolean;
  isFlipped?: boolean;
  isUnlocked?: boolean;
  onUnlock?: () => void;
}

export default function QuestionFront({
  question,
  timeLeft,
  onSelectAnswer,
  onOpenTimerSettings,
  onUse5050,
  onUseSkip,
  fiftyFiftyUsed,
  skipUsed,
  eliminatedIndices,
  isSubmitting,
  isFlipped = false,
  isUnlocked = true,
  onUnlock,
}: QuestionFrontProps) {
  const { clickedIdx, getCategoryBadge, handleOptionClick } = useQuestionFront({

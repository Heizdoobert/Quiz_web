# hooks/quiz/use-question-front.ts
lines:76 exports:useQuestionFront
---
'use client';

import { useState, useEffect } from 'react';

function getCategoryBadge(cat: string) {
  const lower = (cat || '').toLowerCase();
  if (lower.includes('defi')) {
    return 'bg-[#8A2BE2]/15 text-[#8A2BE2] border-[#8A2BE2]/40';
  }
  if (lower.includes('nft') || lower.includes('game')) {
    return 'bg-[#FF007F]/15 text-[#FF007F] border-[#FF007F]/40';
  }
  if (lower.includes('layer') || lower.includes('web3') || lower.includes('crypto')) {
    return 'bg-[#3071FF]/15 text-[#3071FF] border-[#3071FF]/40';
  }
  return 'bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/40';
}

interface UseQuestionFrontOptions {
  questionId: string;
  optionsLength: number;
  isFlipped: boolean;
  isSubmitting: boolean;
  isUnlocked: boolean;
  eliminatedIndices: number[];
  onSelectAnswer: (index: number) => void;
}

export function useQuestionFront({
  questionId,
  optionsLength,
  isFlipped,
  isSubmitting,
  isUnlocked,
  eliminatedIndices,
  onSelectAnswer,
}: UseQuestionFrontOptions) {
  const [prevQuestionId, setPrevQuestionId] = useState(questionId);
  const [clickedIdx, setClickedIdx] = useState<number | null>(null);


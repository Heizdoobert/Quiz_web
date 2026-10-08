# hooks/quiz/use-question-front.ts
lines:76 exports:useQuestionFront
---
'use client';

import { useState, useEffect } from 'react';

function getCategoryBadge(cat: string) {
  const lower = (cat || '').toLowerCase();
  if (lower.includes('defi')) {
    return 'bg-cat-defi/15 text-cat-defi border-cat-defi/40';
  }
  if (lower.includes('nft') || lower.includes('game')) {
    return 'bg-cat-nft/15 text-cat-nft border-cat-nft/40';
  }
  if (lower.includes('layer') || lower.includes('web3') || lower.includes('crypto')) {
    return 'bg-cat-l1/15 text-cat-l1 border-cat-l1/40';
  }
  return 'bg-neo-mint/15 text-neo-mint border-neo-mint/40';
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


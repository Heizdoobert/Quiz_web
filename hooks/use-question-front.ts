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

  if (questionId !== prevQuestionId) {
    setPrevQuestionId(questionId);
    setClickedIdx(null);
  }

  // Keyboard navigation: 1-4 or A-D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFlipped || isSubmitting || !isUnlocked) return;
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;

      const key = e.key.toUpperCase();
      let index = -1;
      if (key === '1' || key === 'A') index = 0;
      if (key === '2' || key === 'B') index = 1;
      if (key === '3' || key === 'C') index = 2;
      if (key === '4' || key === 'D') index = 3;

      if (index !== -1 && !eliminatedIndices.includes(index) && index < optionsLength) {
        setClickedIdx(index);
        onSelectAnswer(index);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, isSubmitting, isUnlocked, eliminatedIndices, optionsLength, onSelectAnswer]);

  const handleOptionClick = (idx: number) => {
    if (isSubmitting || eliminatedIndices.includes(idx)) return;
    setClickedIdx(idx);
    onSelectAnswer(idx);
  };

  return { clickedIdx, getCategoryBadge, handleOptionClick };
}

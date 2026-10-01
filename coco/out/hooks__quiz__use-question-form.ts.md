# hooks/quiz/use-question-form.ts
lines:93 exports:useQuestionForm
---
'use client';

import { useState } from 'react';
import { createQuestion } from '@/lib/actions/question-actions';
import { useSession } from '@/hooks/shared/use-session';

interface UseQuestionFormOptions {
  walletAddress: string | null;
  onQuestionAdded?: () => void;
}

export function useQuestionForm({ walletAddress, onQuestionAdded }: UseQuestionFormOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [category, setCategory] = useState('Web Dev');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(
    null
  );
  const { requireSignIn: ensureSession } = useSession();

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!prompt.trim()) {
      setFeedback({ type: 'error', message: 'Question prompt is required.' });
      return;
    }
    if (options.some((opt) => !opt.trim())) {
      setFeedback({ type: 'error', message: 'All 4 options must be filled.' });

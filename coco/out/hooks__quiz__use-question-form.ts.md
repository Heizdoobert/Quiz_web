# hooks/quiz/use-question-form.ts
lines:91 exports:useQuestionForm
---
'use client';

import { useState } from 'react';
import { createQuestion } from '@/lib/actions/question-actions';
import { useSession } from '@/hooks/shared/use-session';
import { useToast } from '@/hooks/use-toast';

interface UseQuestionFormOptions {
  walletAddress: string | null;
  onQuestionAdded?: () => void;
}

export function useQuestionForm({ walletAddress, onQuestionAdded }: UseQuestionFormOptions) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [category, setCategory] = useState('Web Dev');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const { requireSignIn: ensureSession } = useSession();

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!prompt.trim()) {
      toast.error('Question prompt is required.');
      return;
    }
    if (options.some((opt) => !opt.trim())) {
      toast.error('All 4 options must be filled.');
      return;
    }

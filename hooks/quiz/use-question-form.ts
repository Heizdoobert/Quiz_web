'use client';

import { useState } from 'react';
import { createQuestion } from '@/lib/actions/question-actions';
import { useSession } from '@/hooks/shared/use-session';
import { useToast } from '@/hooks/shared/use-toast';

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

    if (!walletAddress) {
      toast.error('Connect your wallet to add questions.');
      return;
    }

    setLoading(true);
    try {
      if (!(await ensureSession())) {
        toast.error('Sign the message in your wallet to add questions.');
        return;
      }
      const res = await createQuestion({ prompt, options, correctIndex, category, explanation });

      if (!res.success) {
        toast.error(res.error?.message || 'Failed to add question.');
      } else {
        toast.success('Question added successfully!');
        setPrompt('');
        setOptions(['', '', '', '']);
        setExplanation('');
        setCorrectIndex(0);
        if (onQuestionAdded) onQuestionAdded();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred while adding the question.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    prompt,
    setPrompt,
    options,
    correctIndex,
    setCorrectIndex,
    category,
    setCategory,
    explanation,
    setExplanation,
    loading,
    setOptions,
    handleOptionChange,
    handleSubmit,
  };
}

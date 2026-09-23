'use client';

import { useState } from 'react';
import { createQuestion } from '@/lib/actions/question-actions';

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
      return;
    }

    setLoading(true);
    try {
      const res = await createQuestion({
        prompt,
        options,
        correctIndex,
        category,
        explanation,
        createdBy: walletAddress || undefined,
      });

      if (!res.success) {
        setFeedback({ type: 'error', message: res.error || 'Failed to add question.' });
      } else {
        setFeedback({ type: 'success', message: 'Question added successfully!' });
        setPrompt('');
        setOptions(['', '', '', '']);
        setExplanation('');
        setCorrectIndex(0);
        if (onQuestionAdded) onQuestionAdded();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred while adding the question.';
      setFeedback({ type: 'error', message });
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
    feedback,
    handleOptionChange,
    handleSubmit,
  };
}

# components/quiz/QuestionForm.tsx
lines:172 exports:default
---
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuestionForm } from '@/hooks/quiz/use-question-form';
import { ChevronDown, ChevronUp, Plus, Sparkles, Loader2 } from 'lucide-react';
import { QuestionOptionsInput } from './QuestionOptionsInput';

interface QuestionFormProps {
  walletAddress: string | null;
  onQuestionAdded?: () => void;
}

export default function QuestionForm({ walletAddress, onQuestionAdded }: QuestionFormProps) {
  const {
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
  } = useQuestionForm({ walletAddress, onQuestionAdded });

  return (
    <section className="w-full glass glass-border glass-edge rounded-3xl shadow-xl overflow-hidden my-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="question-form-body"
        className="w-full flex items-center justify-between p-4 px-6 text-left hover:bg-[#25284D] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] transition-all cursor-pointer select-none"

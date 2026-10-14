# components/quiz/QuestionForm.tsx
lines:176 exports:default
---
'use client';
import { useToast } from "@/hooks/shared/use-toast";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuestionForm } from '@/hooks/quiz/use-question-form';
import { ChevronDown, ChevronUp, Plus, Sparkles, Loader2 } from 'lucide-react';
import { QuestionOptionsInput } from './QuestionOptionsInput';
import { AiQuestionGenerator } from './AiQuestionGenerator';

interface QuestionFormProps {
  onQuestionAdded?: () => void;
}

export default function QuestionForm({ onQuestionAdded }: QuestionFormProps) {
  const toast = useToast();
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
    setOptions,
    handleOptionChange,
    handleSubmit,
  } = useQuestionForm({ onQuestionAdded });

  const handleAiSuccess = (data: { prompt: string; options: string[]; correctIndex: number; explanation: string }) => {
    setPrompt(data.prompt);
    setOptions(data.options);
    setCorrectIndex(data.correctIndex);
    setExplanation(data.explanation || '');
    toast.success('Question generated successfully! Please review before submitting.');

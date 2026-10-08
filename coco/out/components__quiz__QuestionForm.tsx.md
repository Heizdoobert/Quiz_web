# components/quiz/QuestionForm.tsx
lines:177 exports:default
---
'use client';
import { useToast } from "@/hooks/use-toast";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuestionForm } from '@/hooks/quiz/use-question-form';
import { ChevronDown, ChevronUp, Plus, Sparkles, Loader2 } from 'lucide-react';
import { QuestionOptionsInput } from './QuestionOptionsInput';
import { AiQuestionGenerator } from './AiQuestionGenerator';

interface QuestionFormProps {
  walletAddress: string | null;
  onQuestionAdded?: () => void;
}

export default function QuestionForm({ walletAddress, onQuestionAdded }: QuestionFormProps) {
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
  } = useQuestionForm({ walletAddress, onQuestionAdded });

  const handleAiSuccess = (data: { prompt: string; options: string[]; correctIndex: number; explanation: string }) => {
    setPrompt(data.prompt);
    setOptions(data.options);
    setCorrectIndex(data.correctIndex);
    setExplanation(data.explanation || '');

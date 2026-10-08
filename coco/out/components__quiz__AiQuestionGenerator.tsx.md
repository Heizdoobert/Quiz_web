# components/quiz/AiQuestionGenerator.tsx
lines:91 exports:AiQuestionGenerator
---
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Loader2, Bot } from 'lucide-react';
import { generateQuestion } from '@/lib/actions/question-actions';

interface AiQuestionGeneratorProps {
  onSuccess: (data: { prompt: string; options: string[]; correctIndex: number; explanation: string }) => void;
  onError: (message: string) => void;
}

export function AiQuestionGenerator({ onSuccess, onError }: AiQuestionGeneratorProps) {
  const [aiTopic, setAiTopic] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);

  const handleGenerateAi = async () => {
    if (!aiTopic.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await generateQuestion(aiTopic);
      if (res.success) {
        onSuccess(res.data);
        setShowAi(false);
      } else {
        onError((typeof res.error === 'string' ? res.error : res.error?.message) || 'Failed to generate question.');
      }
    } catch (err: unknown) {
      onError((err instanceof Error ? err.message : 'Unexpected error occurred.'));
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="bg-deep-space border border-cyber-border rounded-xl p-3">
      <button
        type="button"
        onClick={() => setShowAi(!showAi)}
        className="flex items-center justify-between w-full text-left text-sm font-bold text-white cursor-pointer"
      >

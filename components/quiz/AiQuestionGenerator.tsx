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
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-neo-mint" />
          <span>Generate with AI</span>
        </div>
        {showAi ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      <AnimatePresence>
        {showAi && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Enter a topic or URL..."
                className="flex-1 px-3 py-2 bg-black border border-cyber-border rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-neo-mint transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleGenerateAi();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleGenerateAi}
                disabled={isAiLoading || !aiTopic.trim()}
                className="px-4 py-2 bg-neo-mint text-deep-space disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer"
              >
                {isAiLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Bot className="w-3 h-3" />
                )}
                {isAiLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

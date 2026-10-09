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
  };

  const handleAiError = (message: string) => {
    toast.error(message);
  };

  return (
    <section className="w-full glass glass-border glass-edge rounded-3xl shadow-xl overflow-hidden my-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="question-form-body"
        className="w-full flex items-center justify-between p-4 px-6 text-left hover:bg-cyber-violet-light active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint transition-all cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-neo-mint/15 text-neo-mint border border-neo-mint/30">
            <Plus className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-black text-white text-base">Add Custom Question</h3>
            <p className="text-xs text-slate-400">Contribute new trivia to the global database</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-heading px-3 py-1 bg-cyber-violet-light text-neo-mint border border-[#3A3E70] rounded-full">
            {isOpen ? 'Close' : 'Expand'}
          </span>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="question-form-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-cyber-border"
          >
            <form
              id="question-form-body"
              onSubmit={handleSubmit}
              className="p-6 pt-4 space-y-4"
            >
              <AiQuestionGenerator onSuccess={handleAiSuccess} onError={handleAiError} />

              <div>
                <label htmlFor="question-prompt" className="block text-xs font-bold text-slate-300 mb-1.5">
                  Question Prompt <span className="text-pop-coral" aria-hidden="true">*</span>
                </label>
                <input
                  id="question-prompt"
                  type="text"
                  required
                  maxLength={250}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. What does CSS stand for?"
                  className="w-full px-4 py-2.5 bg-deep-space border border-cyber-border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neo-mint focus:border-neo-mint placeholder:text-slate-500 transition-all"
                />
              </div>

              <QuestionOptionsInput
                options={options}
                correctIndex={correctIndex}
                onOptionChange={handleOptionChange}
                onCorrectIndexChange={setCorrectIndex}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="question-category" className="block text-xs font-bold text-slate-300 mb-1">
                    Category / Topic
                  </label>
                  <input
                    id="question-category"
                    type="text"
                    list="topics-list"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Web Dev, Science, General..."
                    className="w-full px-3.5 py-2 bg-deep-space border border-cyber-border rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-neo-mint focus:border-neo-mint transition-all"
                  />
                  <datalist id="topics-list">
                    <option value="Web Dev" />
                    <option value="JavaScript" />
                    <option value="General" />
                  </datalist>
                </div>
                <div>
                  <label htmlFor="question-explanation" className="block text-xs font-bold text-slate-300 mb-1">
                    Explanation (Optional)
                  </label>
                  <input
                    id="question-explanation"
                    type="text"
                    maxLength={300}
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="e.g. Cascading Style Sheets format web pages."
                    className="w-full px-3.5 py-2 bg-deep-space border border-cyber-border rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-neo-mint focus:border-neo-mint transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.03, filter: loading ? 'none' : 'brightness(1.1)' }}
                  whileTap={{ scale: loading ? 1 : 0.97 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-neo-mint to-electric-indigo disabled:opacity-50 disabled:cursor-not-allowed text-deep-space rounded-xl font-black font-heading text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-deep-space" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-deep-space" />
                  )}
                  {loading ? 'Submitting Question...' : 'Submit Question'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

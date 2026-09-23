'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuestionForm } from '@/hooks/use-question-form';
import { ChevronDown, ChevronUp, Plus, Sparkles, Loader2 } from 'lucide-react';

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
    <section className="w-full bg-[#1A1B35]/90 border border-[#2D305A] rounded-3xl shadow-xl overflow-hidden backdrop-blur-md my-4">
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="question-form-body"
        className="w-full flex items-center justify-between p-4 px-6 text-left hover:bg-[#25284D] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] transition-all cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-[#00FFCC]/15 text-[#00FFCC] border border-[#00FFCC]/30">
            <Plus className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-black font-heading text-white text-base">Add Custom Question</h3>
            <p className="text-xs text-slate-400">Contribute new trivia to the global database</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-heading px-3 py-1 bg-[#25284D] text-[#00FFCC] border border-[#3A3E70] rounded-full">
            {isOpen ? 'Close' : 'Expand'}
          </span>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Collapsible Form Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="question-form-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-[#2D305A]"
          >
            <form
              id="question-form-body"
              onSubmit={handleSubmit}
              className="p-6 pt-4 space-y-4"
            >
              {feedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    feedback.type === 'error'
                      ? 'bg-[#FF4757]/15 text-[#FF4757] border border-[#FF4757]/40'
                      : 'bg-[#00FFCC]/15 text-[#00FFCC] border border-[#00FFCC]/40'
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              {/* Prompt */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Question Prompt <span className="text-[#FF4757]">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={250}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. What does CSS stand for?"
                  className="w-full px-4 py-2.5 bg-[#0A1128] border border-[#2D305A] rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC] focus:border-[#00FFCC] placeholder:text-slate-500 transition-all"
                />
              </div>

              {/* Options with radio button for correct option */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Answer Options <span className="text-[#FF4757]">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Radio button selects correct answer</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {['A', 'B', 'C', 'D'].map((letter, idx) => (
                    <div
                      key={letter}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                        correctIndex === idx
                          ? 'bg-[#00FFCC]/10 border-[#00FFCC]/50 shadow-[0_0_12px_rgba(0,255,204,0.12)]'
                          : 'bg-[#0A1128] border-[#2D305A] hover:border-[#6C5CE7]/50'
                      }`}
                    >
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="correct-option"
                          checked={correctIndex === idx}
                          onChange={() => setCorrectIndex(idx)}
                          className="w-4 h-4 text-[#00FFCC] accent-[#00FFCC] bg-[#1A1B35] border-[#2D305A] cursor-pointer"
                        />
                        <span className="font-black text-xs px-2 py-0.5 rounded-lg bg-[#1A1B35] text-slate-300 font-heading">
                          {letter}
                        </span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={options[idx]}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${letter}`}
                        className="flex-1 bg-transparent border-none text-white text-xs focus:outline-none placeholder:text-slate-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Category & Explanation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Category / Topic
                  </label>
                  <input
                    type="text"
                    list="topics-list"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Web Dev, Crypto, General..."
                    className="w-full px-3.5 py-2 bg-[#0A1128] border border-[#2D305A] rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#00FFCC] focus:border-[#00FFCC] transition-all"
                  />
                  <datalist id="topics-list">
                    <option value="Web Dev" />
                    <option value="JavaScript" />
                    <option value="Crypto & Web3" />
                    <option value="DeFi" />
                    <option value="NFT & Gaming" />
                    <option value="General" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Explanation (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={300}
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="e.g. Cascading Style Sheets format web pages."
                    className="w-full px-3.5 py-2 bg-[#0A1128] border border-[#2D305A] rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#00FFCC] focus:border-[#00FFCC] transition-all"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.03 }}
                  whileTap={{ scale: loading ? 1 : 0.97 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed text-[#0A1128] rounded-xl font-black font-heading text-xs shadow-[0_0_20px_rgba(0,255,204,0.25)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0A1128]" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-[#0A1128]" />
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

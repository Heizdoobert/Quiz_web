'use client';

import React, { useState } from 'react';
import { createQuestion } from '@/lib/actions/question-actions';
import { ChevronDown, ChevronUp, Plus, Sparkles } from 'lucide-react';

interface QuestionFormProps {
  walletAddress: string | null;
  onQuestionAdded?: () => void;
}

export default function QuestionForm({ walletAddress, onQuestionAdded }: QuestionFormProps) {
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
        setFeedback({ type: 'success', message: 'Question added successfully! 🎉' });
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

  return (
    <section className="w-full bg-[#1A1B35]/90 border border-[#2D305A] rounded-3xl shadow-xl overflow-hidden backdrop-blur-md my-4">
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="question-form-body"
        className="w-full flex items-center justify-between p-4 px-6 text-left hover:bg-[#25284D] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-[#00FFCC]/15 text-[#00FFCC] border border-[#00FFCC]/30">
            <Plus className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-extrabold text-white text-base">Add Custom Question</h3>
            <p className="text-xs text-slate-400">Contribute new trivia to the global database</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 bg-[#25284D] text-[#00FFCC] border border-[#3A3E70] rounded-full">
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
      {isOpen && (
        <form
          id="question-form-body"
          onSubmit={handleSubmit}
          className="p-6 pt-2 border-t border-[#2D305A] space-y-4"
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
              className="w-full px-4 py-2.5 bg-[#0A1128] border border-[#2D305A] rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC] focus:border-[#00FFCC] placeholder:text-slate-500"
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
                    <span className="font-black text-xs px-2 py-0.5 rounded-lg bg-[#1A1B35] text-slate-300">
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
                className="w-full px-3.5 py-2 bg-[#0A1128] border border-[#2D305A] rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#00FFCC] focus:border-[#00FFCC]"
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
                className="w-full px-3.5 py-2 bg-[#0A1128] border border-[#2D305A] rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#00FFCC] focus:border-[#00FFCC]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 disabled:opacity-50 text-[#0A1128] rounded-xl font-black text-xs shadow-[0_0_20px_rgba(0,255,204,0.25)] hover:scale-105 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#0A1128]" />
              {loading ? 'Saving Question...' : 'Submit Question'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

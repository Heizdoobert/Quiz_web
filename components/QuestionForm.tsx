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
    <section className="w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm my-4">
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="question-form-body"
        className="w-full flex items-center justify-between p-4 px-6 text-left hover:bg-slate-700/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
            <Plus className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-white text-base">Add Custom Question</h3>
            <p className="text-xs text-slate-400">Contribute new trivia to the global database</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-700 text-slate-300 rounded-full">
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
          className="p-6 pt-2 border-t border-slate-700/60 space-y-4"
        >
          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs font-medium ${
                feedback.type === 'error'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Question Prompt <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={250}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. What does CSS stand for?"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Options with radio button for correct option */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Answer Options <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-slate-400">Radio button selects correct answer</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {['A', 'B', 'C', 'D'].map((letter, idx) => (
                <div
                  key={letter}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                    correctIndex === idx
                      ? 'bg-blue-950/40 border-blue-500'
                      : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="correct-option"
                      checked={correctIndex === idx}
                      onChange={() => setCorrectIndex(idx)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-600 cursor-pointer"
                    />
                    <span className="font-bold text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category / Topic
              </label>
              <input
                type="text"
                list="topics-list"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Web Dev, Crypto, General..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="topics-list">
                <option value="Web Dev" />
                <option value="JavaScript" />
                <option value="Crypto & Web3" />
                <option value="Python" />
                <option value="General" />
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Explanation (Optional)
              </label>
              <input
                type="text"
                maxLength={300}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="e.g. Cascading Style Sheets format web pages."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Saving Question...' : 'Submit Question'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

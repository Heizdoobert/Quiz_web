'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

export interface QuestionFormValues {
  prompt: string;
  options: string[];
  correctIndex: number;
  category: string;
  explanation: string;
}

interface ListQuestionEditorProps {
  initial?: QuestionFormValues;
  submitLabel: string;
  onSubmit: (values: QuestionFormValues) => Promise<{ success: boolean; error?: string }>;
  onDone: () => void;
  onCancel?: () => void;
}

const EMPTY: QuestionFormValues = {
  prompt: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  category: 'General',
  explanation: '',
};

export default function ListQuestionEditor({
  initial,
  submitLabel,
  onSubmit,
  onDone,
  onCancel,
}: ListQuestionEditorProps) {
  const [values, setValues] = useState<QuestionFormValues>(initial || EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setOption = (idx: number, val: string) => {
    const next = [...values.options];
    next[idx] = val;
    setValues({ ...values, options: next });
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await onSubmit(values);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Failed to save question.');
      return;
    }
    setValues(EMPTY);
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-deep-space/70 border border-cyber-border rounded-2xl">
      {error && (
        <div className="p-2.5 rounded-xl text-xs font-bold bg-pop-coral/15 text-pop-coral border border-pop-coral/40">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-300 mb-1">Question Prompt *</label>
        <input
          type="text"
          required
          maxLength={250}
          value={values.prompt}
          onChange={(e) => setValues({ ...values, prompt: e.target.value })}
          placeholder="e.g. What does CSS stand for?"
          className="w-full px-3 py-2 bg-cyber-violet border border-cyber-border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neo-mint placeholder:text-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {['A', 'B', 'C', 'D'].map((letter, idx) => (
          <div
            key={letter}
            className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
              values.correctIndex === idx
                ? 'bg-neo-mint/10 border-neo-mint/50'
                : 'bg-cyber-violet border-cyber-border'
            }`}
          >
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={values.correctIndex === idx}
                onChange={() => setValues({ ...values, correctIndex: idx })}
                className="w-4 h-4 accent-neo-mint cursor-pointer"
              />
              <span className="font-black text-xs px-1.5 py-0.5 rounded bg-deep-space text-slate-300">{letter}</span>
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={values.options[idx]}
              onChange={(e) => setOption(idx, e.target.value)}
              placeholder={`Option ${letter}`}
              className="flex-1 bg-transparent border-none text-white text-xs focus:outline-none placeholder:text-slate-500"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
          <input
            type="text"
            value={values.category}
            onChange={(e) => setValues({ ...values, category: e.target.value })}
            className="w-full px-3 py-2 bg-cyber-violet border border-cyber-border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neo-mint"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">Explanation * (min 20 chars)</label>
          <input
            type="text"
            required
            value={values.explanation}
            onChange={(e) => setValues({ ...values, explanation: e.target.value })}
            placeholder="Why this answer is correct..."
            className="w-full px-3 py-2 bg-cyber-violet border border-cyber-border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neo-mint placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 bg-linear-to-r from-neo-mint to-electric-indigo disabled:opacity-50 text-deep-space rounded-xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-cyber-violet-light hover:bg-cyber-border text-slate-300 rounded-xl font-bold text-sm cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

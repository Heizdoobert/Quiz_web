'use client';

import React from 'react';
import { HistoryItem } from '@/lib/types';
import { History, Check, X } from 'lucide-react';

interface HistoryListProps {
  history: HistoryItem[];
  onOpenReview: () => void;
}

export default function HistoryList({ history, onOpenReview }: HistoryListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <History className="w-3.5 h-3.5 text-slate-400" />
          Recent History
        </h4>
        {history.length > 0 && (
          <button
            type="button"
            onClick={onOpenReview}
            className="text-[11px] text-neo-mint hover:underline active:opacity-70 font-bold font-heading transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neo-mint"
          >
            Review All →
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-2">No answered questions yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {history.slice(0, 6).map((item, idx) => (
            <div
              key={`${item.questionId}-${idx}`}
              className="bg-elevation-2 glass-border border border-transparent flex items-center justify-between p-2.5 rounded-2xl hover:border-electric-indigo/40 transition-colors text-xs"
            >
              <span className="truncate max-w-37.5 text-slate-300 font-medium">
                {item.prompt}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold font-heading ${
                  item.isCorrect
                    ? 'bg-neo-mint/15 text-neo-mint border border-neo-mint/30'
                    : 'bg-pop-coral/15 text-pop-coral border border-pop-coral/30'
                }`}
              >
                {item.isCorrect ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                {item.isCorrect ? 'PASS' : 'FAIL'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

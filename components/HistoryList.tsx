'use client';

import React from 'react';
import { HistoryItem } from './modals/ReviewModal';

interface HistoryListProps {
  history: HistoryItem[];
  onOpenReview: () => void;
}

export default function HistoryList({ history, onOpenReview }: HistoryListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Recent History
        </h4>
        {history.length > 0 && (
          <button
            onClick={onOpenReview}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors"
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
              className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
            >
              <span className="truncate max-w-[150px] text-slate-300 font-medium">
                {item.prompt}
              </span>
              <span className="text-xs">{item.isCorrect ? '✅' : '❌'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

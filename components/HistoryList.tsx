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
            className="text-[11px] text-[#00FFCC] hover:underline font-bold transition-colors cursor-pointer"
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
              className="flex items-center justify-between p-2 rounded-xl bg-[#0A1128]/80 border border-[#2D305A] hover:border-[#6C5CE7]/40 transition-colors text-xs"
            >
              <span className="truncate max-w-[150px] text-slate-300 font-medium">
                {item.prompt}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                  item.isCorrect
                    ? 'bg-[#00FFCC]/15 text-[#00FFCC] border border-[#00FFCC]/30'
                    : 'bg-[#FF4757]/15 text-[#FF4757] border border-[#FF4757]/30'
                }`}
              >
                {item.isCorrect ? 'PASS' : 'FAIL'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

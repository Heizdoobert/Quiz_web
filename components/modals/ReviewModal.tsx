'use client';

import React from 'react';
import Modal from '@/components/Modal';

export interface HistoryItem {
  questionId: string;
  prompt: string;
  isCorrect: boolean;
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
}

export default function ReviewModal({ isOpen, onClose, history }: ReviewModalProps) {
  const correctCount = history.filter((h) => h.isCorrect).length;
  const accuracy = history.length > 0 ? Math.round((correctCount / history.length) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Session Breakdown"
      icon="📋"
      maxWidth="max-w-lg"
      footer={
        <button
          onClick={onClose}
          className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          Back to Quiz
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
          <div>
            <span className="text-xs text-slate-400">Total Answered</span>
            <p className="text-lg font-bold text-white">{history.length}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Correct</span>
            <p className="text-lg font-bold text-emerald-400">{correctCount}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Accuracy</span>
            <p className="text-lg font-bold text-blue-400">{accuracy}%</p>
          </div>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No questions answered yet.</p>
          ) : (
            history.map((item, idx) => (
              <div
                key={`${item.questionId}-${idx}`}
                className={`p-3 rounded-lg border flex items-start gap-3 ${
                  item.isCorrect
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                    : 'bg-red-950/20 border-red-800/40 text-red-200'
                }`}
              >
                <span className="text-lg mt-0.5">{item.isCorrect ? '✅' : '❌'}</span>
                <div className="flex-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Q{idx + 1}
                  </span>
                  <p className="text-xs font-medium text-slate-200 line-clamp-2">{item.prompt}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

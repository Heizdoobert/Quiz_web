'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Modal from '@/components/Modal';
import { BarChart3, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

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
      icon={<BarChart3 className="w-5 h-5 text-[#6C5CE7]" />}
      maxWidth="max-w-lg"
      footer={
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-black rounded-xl bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 text-[#0A1128] transition-all shadow-md cursor-pointer font-heading"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Quiz
        </motion.button>
      }
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3.5 bg-[#0A1128]/70 rounded-xl border border-[#2D305A]">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Answered</span>
            <p className="text-lg font-bold text-white font-heading">{history.length}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Correct</span>
            <p className="text-lg font-black text-[#00FFCC] font-heading">{correctCount}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Accuracy</span>
            <p className="text-lg font-black text-[#6C5CE7] font-heading">{accuracy}%</p>
          </div>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No questions answered yet.</p>
          ) : (
            history.map((item, idx) => (
              <div
                key={`${item.questionId}-${idx}`}
                className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                  item.isCorrect
                    ? 'bg-[#00FFCC]/10 border-[#00FFCC]/30 text-slate-200'
                    : 'bg-[#FF4757]/10 border-[#FF4757]/30 text-slate-200'
                }`}
              >
                {item.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-[#00FFCC] shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-[#FF4757] shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider font-heading ${
                    item.isCorrect ? 'text-[#00FFCC]' : 'text-[#FF4757]'
                  }`}>
                    Q{idx + 1} • {item.isCorrect ? 'Correct' : 'Missed'}
                  </span>
                  <p className="text-xs font-semibold text-white line-clamp-2 mt-0.5">{item.prompt}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

# components/modals/ReviewModal.tsx
lines:88 exports:default
---
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Modal from '@/components/Modal';
import { BarChart3, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { HistoryItem } from '@/lib/types';

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
          className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-black rounded-xl bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 text-[#0A1128] transition-[color,background-color,border-color,opacity,box-shadow] shadow-md cursor-pointer font-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Quiz
        </motion.button>
      }
    >
      <div className="space-y-5">
        <div className="flex justify-between items-center p-4 bg-[#0A1128]/70 rounded-xl border border-[#2D305A]">

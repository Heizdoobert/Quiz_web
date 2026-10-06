# components/modals/IntroModal.tsx
lines:127 exports:default
---
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Modal from '@/components/Modal';
import { useIntroModal } from '@/hooks/modals/use-intro-modal';
import { Lightbulb, FileEdit, Boxes, Trophy, ArrowRight, ArrowLeft, Rocket } from 'lucide-react';

interface IntroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IntroModal({ isOpen, onClose }: IntroModalProps) {
  const { step, setStep, handleNext, handleBack } = useIntroModal({ onClose });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How to Create & Play"
      icon={<Lightbulb className="w-5 h-5 text-crypto-gold" />}
      footer={
        <div className="flex w-full items-center justify-between">
          {step > 1 ? (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-cyber-violet-light hover:bg-cyber-border text-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </motion.button>
          ) : <div />}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}

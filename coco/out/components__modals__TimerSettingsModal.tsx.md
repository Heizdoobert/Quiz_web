# components/modals/TimerSettingsModal.tsx
lines:108 exports:default
---
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Modal from '@/components/Modal';
import { useTimerSettingsModal } from '@/hooks/modals/use-timer-settings-modal';
import { Clock } from 'lucide-react';

interface TimerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: 'per-question' | 'total' | 'stopwatch';
  currentDuration: number;
  onSave: (mode: 'per-question' | 'total' | 'stopwatch', duration: number) => void;
}

export default function TimerSettingsModal({
  isOpen,
  onClose,
  currentMode,
  currentDuration,
  onSave,
}: TimerSettingsModalProps) {
  const { mode, setMode, duration, setDuration, setValidatedDuration, handleCancel, handleSave } =
    useTimerSettingsModal({ isOpen, currentMode, currentDuration, onSave, onClose });

  const presets = [15, 30, 60, 120];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Timer & Clock Settings"
      icon={<Clock className="w-5 h-5 text-neo-mint" />}
      footer={
        <>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}

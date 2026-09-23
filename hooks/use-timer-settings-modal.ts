'use client';

import { useState } from 'react';

export type TimerMode = 'per-question' | 'total' | 'stopwatch';

interface UseTimerSettingsModalOptions {
  isOpen: boolean;
  currentMode: TimerMode;
  currentDuration: number;
  onSave: (mode: TimerMode, duration: number) => void;
  onClose: () => void;
}

export function useTimerSettingsModal({
  isOpen,
  currentMode,
  currentDuration,
  onSave,
  onClose,
}: UseTimerSettingsModalOptions) {
  const [mode, setMode] = useState(currentMode);
  const [duration, setDuration] = useState(currentDuration);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setMode(currentMode);
      setDuration(currentDuration);
    }
  }

  const setValidatedDuration = (raw: string) => setDuration(Math.max(5, parseInt(raw) || 30));

  const handleCancel = () => {
    setMode(currentMode);
    setDuration(currentDuration);
    onClose();
  };

  const handleSave = () => {
    onSave(mode, duration);
    onClose();
  };

  return { mode, setMode, duration, setDuration, setValidatedDuration, handleCancel, handleSave };
}

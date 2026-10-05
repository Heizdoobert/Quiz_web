# components/auth/AuthPopup.tsx
lines:66 exports:AuthPopupProps,default
---
'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import Modal from '@/components/Modal';
import AuthChoiceScreen from './AuthChoiceScreen';
import AuthMethodTabs, { AuthMode } from './AuthMethodTabs';

type AuthStep = 'choice' | 'method';

export interface AuthPopupProps {
  isOpen: boolean;
  onClose: () => void;
  refresh: () => Promise<unknown>;
}

export default function AuthPopup({ isOpen, onClose, refresh }: AuthPopupProps) {
  const [step, setStep] = useState<AuthStep>('choice');
  const [mode, setMode] = useState<AuthMode>('login');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Delay reset slightly to not interrupt closing animation
      const timer = setTimeout(() => {
        setStep('choice');
        setMode('login');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSelectMode = (selectedMode: AuthMode) => {
    setMode(selectedMode);
    setStep('method');
  };

  const handleBack = () => {
    setStep('choice');

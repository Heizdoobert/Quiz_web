# components/auth/SignInModal.tsx
lines:137 exports:default
---
'use client';

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, Mail, Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { requestEmailCode, verifyEmailCode } from '@/lib/actions/auth-actions';
import { NO_WALLET_DISCLOSURE } from '@/lib/rewards-copy';

// Two sign-in paths: RainbowKit + SIWE (existing, drives itself once connected),
// and email + one-time code (this task). Both end the same way: refresh() picks
// up the new quiz_session and resolves the pending requireSignIn() promise.
// refresh comes in as a prop, not useSession(), so this file doesn't import the
// module that renders it (would be a circular dependency).
type Step = 'choose' | 'email' | 'code';

export default function SignInModal({
  isOpen,
  onClose,
  refresh,
}: {
  isOpen: boolean;
  onClose: () => void;
  refresh: () => Promise<unknown>;
}) {
  const [step, setStep] = useState<Step>('choose');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setStep('choose');
    setEmail('');
    setCode('');
    setError(null);
    onClose();
  };

  const handleSendCode = async (e: React.FormEvent) => {

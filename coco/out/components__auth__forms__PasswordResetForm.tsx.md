# components/auth/forms/PasswordResetForm.tsx
lines:146 exports:default
---
'use client';

import React, { useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { requestPasswordReset, verifyPasswordResetCode, updatePasswordWithReset } from '@/lib/actions/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type ResetStep = 'request' | 'verify' | 'new-password';

interface PasswordResetFormProps {
  initialEmail?: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function PasswordResetForm({ initialEmail = '', onSuccess, onBack }: PasswordResetFormProps) {
  const [step, setStep] = useState<ResetStep>('request');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await requestPasswordReset(cleanEmail);
      setInfo('If an account exists for this email, a 6-digit recovery code has been sent.');
      setStep('verify');
    } catch {
      setError('An error occurred. Please try again.');

# components/auth/forms/EmailPasswordForm.tsx
lines:156 exports:default
---
'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { signInWithEmail } from '@/lib/actions/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailPasswordFormProps {
  initialEmail?: string;
  onSuccess: () => void;
  onForgotPassword: (email: string) => void;
  onRequiresVerification: (email: string) => void;
}

export default function EmailPasswordForm({
  initialEmail = '',
  onSuccess,
  onForgotPassword,
  onRequiresVerification,
}: EmailPasswordFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }


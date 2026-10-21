# components/auth/forms/OtpVerificationForm.tsx
lines:121 exports:default
---
'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { verifyVerificationCode, requestVerificationCode } from '@/lib/actions/auth-actions';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface OtpVerificationFormProps {
  initialEmail?: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function OtpVerificationForm({ initialEmail = '', onSuccess, onBack }: OtpVerificationFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanCode = code.replace(/\D/g, '');
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (cleanCode.length !== 6) {
      setError('Verification code must be exactly 6 digits.');
      return;

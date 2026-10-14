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
    }

    setPending(true);
    setError(null);
    setInfo(null);
    try {
      const res = await verifyVerificationCode(cleanEmail, cleanCode);
      if (res.ok) {
        onSuccess();
        return;
      }
      setError(res.error === 'RATE_LIMITED' ? 'Too many attempts. Please try again later.' : res.error || 'Wrong or expired code. Please try again.');
    } catch {
      setError('An unexpected error occurred during verification.');
    } finally {
      setPending(false);
    }
  };

  const handleResend = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      setError('Please enter a valid email address to receive a code.');
      return;
    }
    setResending(true);
    setError(null);
    setInfo(null);
    try {
      const res = await requestVerificationCode(cleanEmail);
      if (res.error === 'RATE_LIMITED') {
        setError('Code request rate limit reached. Please wait before requesting another code.');
      } else if (res.sent) {
        setInfo('A new 6-digit verification code has been dispatched to your email.');
        setCooldown(60);
      } else {
        setError('Failed to send verification code. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred while requesting code.');
    } finally {
      setResending(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-neo-mint';
  const labelClass = 'block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1';

  return (
    <form onSubmit={handleVerify} className="space-y-4" noValidate>
      {error && <div role="alert" aria-live="polite" className="p-3 text-sm rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>}
      {info && <div role="status" aria-live="polite" className="p-3 text-sm rounded-lg bg-neo-mint/10 border border-neo-mint/30 text-neo-mint">{info}</div>}
      <p className="text-xs text-slate-400">Enter the 6-digit verification code sent to your email. No confirmation links are used.</p>

      <div>
        <label htmlFor="otp-email" className={labelClass}>Email</label>
        <input id="otp-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
      </div>

      <div>
        <label htmlFor="otp-code" className={labelClass}>6-digit verification code</label>
        <input id="otp-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" className={`${inputClass} font-mono tracking-[0.25em] text-center text-lg`} />
      </div>

      <button type="submit" disabled={pending || code.length !== 6} className="w-full py-2.5 px-4 rounded-lg bg-neo-mint text-deep-space font-semibold hover:bg-neo-mint/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        <span>Verify code</span>
      </button>

      <div className="flex justify-between items-center pt-2 text-xs">
        <button type="button" onClick={onBack} className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </button>
        <button type="button" disabled={resending || cooldown > 0} onClick={handleResend} className="text-neo-mint hover:underline disabled:opacity-50">
          {cooldown > 0 ? `Resend code (${cooldown}s)` : resending ? 'Sending...' : 'Resend code'}
        </button>
      </div>
    </form>
  );
}

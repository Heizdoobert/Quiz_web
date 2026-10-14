'use client';

import React, { useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { requestPasswordReset, verifyPasswordResetCode, updatePasswordWithReset } from '@/lib/actions/auth-actions';

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
    } finally {
      setPending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setError('Recovery code must be 6 digits.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await verifyPasswordResetCode(email.trim(), cleanCode);
      if (res.ok && res.resetToken) {
        setResetToken(res.resetToken);
        setStep('new-password');
        setInfo(null);
      } else {
        setError(res.error || 'Invalid or expired recovery code.');
      }
    } catch {
      setError('An unexpected error occurred during verification.');
    } finally {
      setPending(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await updatePasswordWithReset(email.trim(), resetToken, newPassword);
      if (res.ok) onSuccess();
      else setError(res.error || 'Failed to update password.');
    } catch {
      setError('An unexpected error occurred while resetting password.');
    } finally {
      setPending(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-neo-mint';
  const labelClass = 'block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1';
  const btnClass = 'w-full py-2.5 px-4 rounded-lg bg-neo-mint text-deep-space font-semibold hover:bg-neo-mint/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2';

  return (
    <div className="space-y-4">
      {error && <div role="alert" className="p-3 text-sm rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>}
      {info && <div role="status" className="p-3 text-sm rounded-lg bg-neo-mint/10 border border-neo-mint/30 text-neo-mint">{info}</div>}

      {step === 'request' && (
        <form onSubmit={handleRequest} className="space-y-4" noValidate>
          <div>
            <label htmlFor="reset-email" className={labelClass}>Email</label>
            <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
          </div>
          <button type="submit" disabled={pending} className={btnClass}>
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Send reset code</span>
          </button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerify} className="space-y-4" noValidate>
          <div>
            <label htmlFor="reset-code" className={labelClass}>Recovery code</label>
            <input id="reset-code" type="text" inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" className={`${inputClass} font-mono tracking-[0.25em] text-center text-lg`} />
          </div>
          <button type="submit" disabled={pending || code.length !== 6} className={btnClass}>
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Verify code</span>
          </button>
        </form>
      )}

      {step === 'new-password' && (
        <form onSubmit={handleUpdate} className="space-y-4" noValidate>
          <div>
            <label htmlFor="reset-new-password" className={labelClass}>New password</label>
            <input id="reset-new-password" type="password" minLength={6} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
          </div>
          <button type="submit" disabled={pending || newPassword.length < 6} className={btnClass}>
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Update password</span>
          </button>
        </form>
      )}

      <div className="pt-2 text-center">
        <button type="button" onClick={onBack} className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </button>
      </div>
    </div>
  );
}

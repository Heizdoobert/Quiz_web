'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { signInWithEmail } from '@/lib/actions/auth-actions';

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

    setPending(true);
    setError(null);
    setIsUnverified(false);

    try {
      const res = await signInWithEmail(cleanEmail, password);
      if (res.ok) {
        onSuccess();
        return;
      }

      const errMsg = res.error || 'Invalid email or password.';
      setError(errMsg);
      if (/confirm|verif/i.test(errMsg)) {
        setIsUnverified(true);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 text-sm rounded-lg bg-red-500/10 border border-red-500/30 text-red-400"
        >
          <p>{error}</p>
          {isUnverified && (
            <button
              type="button"
              onClick={() => onRequiresVerification(email.trim())}
              className="mt-2 text-xs font-semibold text-neo-mint hover:underline block"
            >
              Verify with code &rarr;
            </button>
          )}
        </div>
      )}

      <div>
        <label htmlFor="signin-email" className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">
          Email
        </label>
        <input
          id="signin-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-neo-mint"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="signin-password" className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Password
          </label>
          <button
            type="button"
            onClick={() => onForgotPassword(email.trim())}
            className="text-xs text-neo-mint/80 hover:text-neo-mint hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <input
            id="signin-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-neo-mint"
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide value' : 'Show value'}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 px-4 rounded-lg bg-neo-mint text-deep-space font-semibold hover:bg-neo-mint/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        <span>Sign in</span>
      </button>

      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => onRequiresVerification(email.trim())}
          className="text-xs text-slate-400 hover:text-neo-mint transition-colors"
        >
          Verify an email code
        </button>
      </div>
    </form>
  );
}

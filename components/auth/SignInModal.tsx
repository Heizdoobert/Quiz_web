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
    e.preventDefault();
    setPending(true);
    setError(null);
    await requestEmailCode(email);
    setPending(false);
    setStep('code');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await verifyEmailCode(email, code);
    setPending(false);
    if (!res.ok) {
      setError('Wrong or expired code. Try again.');
      return;
    }
    await refresh();
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Sign in" icon={<Wallet className="w-5 h-5 text-[#00FFCC]" />}>
      {step === 'choose' && (
        <div className="space-y-5">
          <p className="text-sm text-slate-300">
            Connect your wallet and sign a free message to sign in. This costs no gas.
          </p>
          <div className="flex justify-center">
            <ConnectButton label="Connect wallet" showBalance={false} />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="h-px flex-1 bg-[#2D305A]" />
            or
            <div className="h-px flex-1 bg-[#2D305A]" />
          </div>
          <button
            type="button"
            onClick={() => setStep('email')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#2D305A] text-sm font-bold text-white hover:border-[#00FFCC]/60 cursor-pointer"
          >
            <Mail className="w-4 h-4" /> Continue with email
          </button>
        </div>
      )}

      {step === 'email' && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <p className="text-xs text-slate-400">{NO_WALLET_DISCLOSURE}</p>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-2.5 rounded-xl bg-[#1A1B35] border border-[#2D305A] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00FFCC]/60"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] disabled:opacity-40 text-[#0A1128] rounded-xl font-black text-sm cursor-pointer"
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />} Send code
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-sm text-slate-300">Enter the 6-digit code sent to {email}.</p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className="w-full px-4 py-2.5 rounded-xl bg-[#1A1B35] border border-[#2D305A] text-sm text-white tracking-[0.3em] text-center placeholder:text-slate-500 focus:outline-none focus:border-[#00FFCC]/60"
          />
          {error && <p className="text-xs text-[#FF4757]">{error}</p>}
          <button
            type="submit"
            disabled={pending || code.length !== 6}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] disabled:opacity-40 text-[#0A1128] rounded-xl font-black text-sm cursor-pointer"
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />} Verify
          </button>
        </form>
      )}
    </Modal>
  );
}

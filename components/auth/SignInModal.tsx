'use client';

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, Mail, User, KeyRound, Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import {
  requestEmailCode,
  verifyEmailCode,
  signInWithUsername,
  signUpWithUsername,
} from '@/lib/actions/auth-actions';
import { NO_WALLET_DISCLOSURE } from '@/lib/rewards-copy';

type Tab = 'username' | 'wallet' | 'email';
type EmailStep = 'input' | 'code';
type AuthMode = 'login' | 'register';

export default function SignInModal({
  isOpen,
  onClose,
  refresh,
}: {
  isOpen: boolean;
  onClose: () => void;
  refresh: () => Promise<unknown>;
}) {
  const [tab, setTab] = useState<Tab>('username');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailStep, setEmailStep] = useState<EmailStep>('input');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setTab('username');
    setAuthMode('login');
    setUsername('');
    setPassword('');
    setEmail('');
    setCode('');
    setEmailStep('input');
    setError(null);
    onClose();
  };

  const handleUsernameAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const action = authMode === 'login' ? signInWithUsername : signUpWithUsername;
    const res = await action(username, password);

    setPending(false);
    if (!res.ok) {
      setError(res.error || (authMode === 'login' ? 'Failed to sign in.' : 'Failed to create account.'));
      return;
    }

    await refresh();
    handleClose();
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    await requestEmailCode(email);
    setPending(false);
    setEmailStep('code');
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={authMode === 'register' && tab === 'username' ? 'Create Account' : 'Sign In'}
      icon={<User className="w-5 h-5 text-[#00FFCC]" />}
    >
      {/* Auth Method Navigation Tabs */}
      <div className="flex border-b border-[#2D305A] mb-5">
        <button
          type="button"
          onClick={() => {
            setTab('username');
            setError(null);
          }}
          className={`flex-1 pb-2.5 text-xs font-heading font-bold text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'username'
              ? 'border-[#00FFCC] text-[#00FFCC]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-3.5 h-3.5" /> Username
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('wallet');
            setError(null);
          }}
          className={`flex-1 pb-2.5 text-xs font-heading font-bold text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'wallet'
              ? 'border-[#00FFCC] text-[#00FFCC]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" /> Wallet
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('email');
            setError(null);
          }}
          className={`flex-1 pb-2.5 text-xs font-heading font-bold text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'email'
              ? 'border-[#00FFCC] text-[#00FFCC]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mail className="w-3.5 h-3.5" /> Email
        </button>
      </div>

      {/* Tab: Username & Password */}
      {tab === 'username' && (
        <form onSubmit={handleUsernameAuth} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Username</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. crypto_champ"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1A1B35] border border-[#2D305A] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00FFCC]/60"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1A1B35] border border-[#2D305A] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00FFCC]/60"
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed bg-[#1A1B35]/60 p-2.5 rounded-lg border border-[#2D305A]/40">
            Play and earn $QUIZ coins right away without a wallet. You can link your Web3 wallet anytime later to withdraw your rewards!
          </p>

          {error && <p className="text-xs text-[#FF4757] font-medium">{error}</p>}

          <button
            type="submit"
            disabled={pending || !username.trim() || password.length < 6}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] disabled:opacity-40 text-[#0A1128] rounded-xl font-black text-sm cursor-pointer shadow-md hover:opacity-95 transition-opacity"
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            {authMode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-xs text-[#00FFCC] hover:underline cursor-pointer"
            >
              {authMode === 'login'
                ? "Don't have an account? Create one"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      )}

      {/* Tab: Web3 Wallet */}
      {tab === 'wallet' && (
        <div className="space-y-5">
          <p className="text-sm text-slate-300">
            Connect your Web3 wallet and sign a free message to sign in. This costs no gas.
          </p>
          <div className="flex justify-center py-2">
            <ConnectButton label="Connect wallet" showBalance={false} />
          </div>
          <p className="text-xs text-slate-500 text-center">
            Supports MetaMask, Coinbase Wallet, Rainbow, and WalletConnect.
          </p>
        </div>
      )}

      {/* Tab: Email OTP */}
      {tab === 'email' && (
        <>
          {emailStep === 'input' && (
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

          {emailStep === 'code' && (
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
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setEmailStep('input')}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ← Use different email
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </Modal>
  );
}

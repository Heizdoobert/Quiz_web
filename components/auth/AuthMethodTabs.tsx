'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Mail, User, ArrowLeft } from 'lucide-react';
import { UsernameTab } from './tabs/UsernameTab';
import { WalletTab } from './tabs/WalletTab';
import { EmailTab } from './tabs/EmailTab';

type Tab = 'username' | 'wallet' | 'email';
export type AuthMode = 'login' | 'register';

export interface AuthMethodTabsProps {
  mode: AuthMode;
  onBack: () => void;
  onSuccess: () => void;
  refresh: () => Promise<unknown>;
}

export default function AuthMethodTabs({ mode, onBack, onSuccess, refresh }: AuthMethodTabsProps) {
  const [tab, setTab] = useState<Tab>('username');

  return (
    <motion.div
      key="methods"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
      className="space-y-5"
    >
      <div className="flex items-center mb-2">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 -ml-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#25284D] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="flex-1 text-center text-lg font-bold text-white mr-6">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2D305A]">
        <button
          type="button"
          onClick={() => setTab('username')}
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
          onClick={() => setTab('wallet')}
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
          onClick={() => setTab('email')}
          className={`flex-1 pb-2.5 text-xs font-heading font-bold text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'email'
              ? 'border-[#00FFCC] text-[#00FFCC]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mail className="w-3.5 h-3.5" /> Email
        </button>
      </div>

      {tab === 'username' && <UsernameTab mode={mode} onSuccess={onSuccess} refresh={refresh} />}
      {tab === 'wallet' && <WalletTab />}
      {tab === 'email' && <EmailTab onSuccess={onSuccess} refresh={refresh} />}
    </motion.div>
  );
}

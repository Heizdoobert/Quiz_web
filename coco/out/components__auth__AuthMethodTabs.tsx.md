# components/auth/AuthMethodTabs.tsx
lines:87 exports:AuthMode,AuthMethodTabsProps,default
---
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

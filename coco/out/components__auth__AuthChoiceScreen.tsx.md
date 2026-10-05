# components/auth/AuthChoiceScreen.tsx
lines:56 exports:AuthChoiceScreenProps,default
---
'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface AuthChoiceScreenProps {
  onSelectMode: (mode: 'login' | 'register') => void;
  onClose: () => void;
}

export default function AuthChoiceScreen({ onSelectMode, onClose }: AuthChoiceScreenProps) {
  return (
    <motion.div
      key="choice"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-white tracking-wide">Ready to play?</h3>
        <p className="text-sm text-slate-400">Sign in to save your progress and earn rewards.</p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onSelectMode('login')}
          className="w-full flex flex-col items-center justify-center py-3.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] text-[#0A1128] rounded-xl font-black shadow-md hover:opacity-95 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span className="text-base">Sign In</span>
          <span className="text-xs opacity-80 font-medium">Log into your existing account</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('register')}
          className="w-full flex flex-col items-center justify-center py-3.5 border border-[#00FFCC] text-[#00FFCC] bg-[#00FFCC]/10 rounded-xl font-black shadow-sm hover:bg-[#00FFCC]/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
        >
          <span className="text-base">Create Account</span>

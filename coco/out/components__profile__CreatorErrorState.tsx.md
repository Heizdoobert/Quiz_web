# components/profile/CreatorErrorState.tsx
lines:47 exports:default
---
'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface CreatorErrorStateProps {
  error: string;
  onRetry: () => void;
  retrying?: boolean;
}

export default function CreatorErrorState({
  error,
  onRetry,
  retrying = false,
}: CreatorErrorStateProps) {
  return (
    <div
      role="alert"
      aria-label="Failed to load quizzes"
      className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-[#FF4757]/30 bg-[#1A1B35]/60 max-w-lg mx-auto shadow-2xl backdrop-blur-xs"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#FF4757]/15 border border-[#FF4757]/30 flex items-center justify-center text-[#FF4757] mb-5">
        <AlertTriangle className="w-8 h-8" aria-hidden="true" />
      </div>

      <h2 className="text-xl font-bold font-heading text-white mb-2 tracking-wide">
        Failed to Load Quizzes
      </h2>

      <p className="text-slate-300 text-sm max-w-sm mb-6 leading-relaxed">
        {error || 'An unexpected error occurred while loading your quizzes. Please try again.'}
      </p>

      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 active:scale-95 text-[#0A1128] font-heading font-black text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
        aria-label="Retry loading quizzes"

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
      className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-pop-coral/30 bg-cyber-violet/60 max-w-lg mx-auto shadow-2xl backdrop-blur-xs"
    >
      <div className="w-16 h-16 rounded-2xl bg-pop-coral/15 border border-pop-coral/30 flex items-center justify-center text-pop-coral mb-5">
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
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-neo-mint to-electric-indigo hover:opacity-95 active:scale-95 text-deep-space font-heading font-black text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint"
        aria-label="Retry loading quizzes"
      >
        <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} aria-hidden="true" />
        <span>{retrying ? 'Retrying...' : 'Retry'}</span>
      </button>
    </div>
  );
}

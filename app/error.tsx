'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to server or monitoring
    logger.error('Next.js Page Error caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-deep-space text-white flex flex-col items-center justify-center p-6 text-center" role="alert">
      <div className="max-w-md w-full p-8 bg-cyber-violet border border-cyber-border rounded-3xl shadow-2xl shadow-black/60 space-y-4">
        <div className="flex justify-center">
          <div className="p-3 bg-pop-coral/15 rounded-2xl border border-pop-coral/30 text-pop-coral">
            <AlertTriangle className="w-10 h-10" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white font-heading">Something Went Wrong</h2>
        <p className="text-xs text-slate-400">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>

        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-2.5 bg-linear-to-r from-neo-mint to-electric-indigo hover:opacity-95 text-deep-space text-xs font-black rounded-xl transition-all shadow-lg shadow-neo-mint/20 cursor-pointer font-heading"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-cyber-violet-light hover:bg-cyber-border text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
}

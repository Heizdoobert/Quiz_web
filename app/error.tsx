'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to server or monitoring
    console.error('Next.js Page Error caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0A1128] text-white flex flex-col items-center justify-center p-6 text-center" role="alert">
      <div className="max-w-md w-full p-8 bg-[#1A1B35] border border-[#2D305A] rounded-3xl shadow-2xl shadow-black/60 space-y-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-bold text-white">Something Went Wrong</h2>
        <p className="text-xs text-slate-400">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>

        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-2.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 text-[#0A1128] text-xs font-black rounded-xl transition-all shadow-lg shadow-[#00FFCC]/20 cursor-pointer"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-[#25284D] hover:bg-[#2D305A] text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
}

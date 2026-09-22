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
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center" role="alert">
      <div className="max-w-md w-full p-8 bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl space-y-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-bold text-white">Something Went Wrong</h2>
        <p className="text-xs text-slate-400">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>

        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg cursor-pointer"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, Check } from 'lucide-react';

interface CreatorDashboardHeaderProps {
  quizCount: number;
  exporting: boolean;
  exportSuccess: boolean;
  onExport: () => void;
}

export default function CreatorDashboardHeader({
  quizCount,
  exporting,
  exportSuccess,
  onExport,
}: CreatorDashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8 pb-6 border-b border-cyber-border">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-neo-mint transition-colors mb-3 text-xs font-heading font-bold uppercase tracking-wider rounded-lg p-1 -ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint"
          aria-label="Back to Quiz App"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to App
        </Link>

        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight">
            Creator Dashboard
          </h1>
          <span
            className="px-2.5 py-1 rounded-full bg-neo-mint/10 border border-neo-mint/30 text-neo-mint text-xs font-mono font-bold"
            aria-label={`${quizCount} quizzes created`}
          >
            {quizCount} {quizCount === 1 ? 'Quiz' : 'Quizzes'}
          </span>
        </div>

        <p className="text-slate-400 text-sm mt-1.5 leading-relaxed max-w-md">
          Manage your community quiz contributions and download JSON data backups.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          aria-busy={exporting}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-heading font-bold text-xs transition-all border cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint focus-visible:ring-offset-2 focus-visible:ring-offset-deep-space ${
            exportSuccess
              ? 'bg-neo-mint/20 border-neo-mint text-neo-mint'
              : 'bg-cyber-violet-light hover:bg-[#2E3260] text-slate-100 hover:text-white border-[#3A3E70] hover:border-electric-indigo/60 shadow-md'
          }`}
          aria-label="Backup your quiz and gameplay data as JSON"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-neo-mint" aria-hidden="true" />
              <span>Exporting...</span>
            </>
          ) : exportSuccess ? (
            <>
              <Check className="w-4 h-4 text-neo-mint" aria-hidden="true" />
              <span>Backup Downloaded</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-electric-indigo" aria-hidden="true" />
              <span>Backup Data</span>
            </>
          )}
        </button>

        {/* Live status announcement for screen readers */}
        <div role="status" aria-live="polite" className="sr-only">
          {exporting
            ? 'Preparing your backup download...'
            : exportSuccess
            ? 'Backup data downloaded successfully.'
            : ''}
        </div>
      </div>
    </div>
  );
}

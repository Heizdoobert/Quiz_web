# components/profile/CreatorDashboardHeader.tsx
lines:91 exports:default
---
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
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8 pb-6 border-b border-[#2D305A]">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-[#00FFCC] transition-colors mb-3 text-xs font-heading font-bold uppercase tracking-wider rounded-lg p-1 -ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
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
            className="px-2.5 py-1 rounded-full bg-[#00FFCC]/10 border border-[#00FFCC]/30 text-[#00FFCC] text-xs font-mono font-bold"
            aria-label={`${quizCount} quizzes created`}
          >
            {quizCount} {quizCount === 1 ? 'Quiz' : 'Quizzes'}

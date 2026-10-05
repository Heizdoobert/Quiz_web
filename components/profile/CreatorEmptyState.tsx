'use client';

import React from 'react';
import Link from 'next/link';
import { FileQuestion, PlusCircle } from 'lucide-react';

export default function CreatorEmptyState() {
  return (
    <div
      role="status"
      aria-label="No quizzes created yet"
      className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-2xl border border-cyber-border bg-cyber-violet/40 max-w-xl mx-auto backdrop-blur-xs"
    >
      <div className="w-16 h-16 rounded-2xl bg-electric-indigo/15 border border-electric-indigo/30 flex items-center justify-center text-electric-indigo mb-5">
        <FileQuestion className="w-8 h-8" aria-hidden="true" />
      </div>

      <h2 className="text-xl font-bold font-heading text-white mb-2 tracking-wide">
        No Quizzes Created
      </h2>

      <p className="text-slate-400 text-sm max-w-sm mb-6 leading-relaxed">
        You haven&apos;t created any quiz questions yet. Create questions to earn community rewards, challenge other Web3 players, and grow the quiz pool!
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neo-mint hover:bg-neo-mint/90 active:scale-95 text-deep-space font-heading font-black text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint focus-visible:ring-offset-2 focus-visible:ring-offset-deep-space"
        aria-label="Create your first quiz question"
      >
        <PlusCircle className="w-4 h-4" aria-hidden="true" />
        Create First Quiz
      </Link>
    </div>
  );
}

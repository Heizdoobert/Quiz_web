# components/profile/CreatorEmptyState.tsx
lines:36 exports:default
---
'use client';

import React from 'react';
import Link from 'next/link';
import { FileQuestion, PlusCircle } from 'lucide-react';

export default function CreatorEmptyState() {
  return (
    <div
      role="status"
      aria-label="No quizzes created yet"
      className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-2xl border border-[#2D305A] bg-[#1A1B35]/40 max-w-xl mx-auto backdrop-blur-xs"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#6C5CE7]/15 border border-[#6C5CE7]/30 flex items-center justify-center text-[#6C5CE7] mb-5">
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
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-[#00FFCC]/90 active:scale-95 text-[#0A1128] font-heading font-black text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128]"
        aria-label="Create your first quiz question"
      >
        <PlusCircle className="w-4 h-4" aria-hidden="true" />
        Create First Quiz
      </Link>
    </div>
  );
}

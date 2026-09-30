'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function AccessDeniedView() {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center py-16 px-6 text-center border border-[#2D305A] rounded-2xl bg-[#1A1B35]/60 max-w-lg mx-auto shadow-2xl backdrop-blur-sm"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#FF4757]/10 border border-[#FF4757]/30 flex items-center justify-center mb-5 text-[#FF4757]">
        <ShieldAlert className="w-8 h-8" aria-hidden="true" />
      </div>

      <h2 className="text-2xl font-black font-heading text-white mb-2 tracking-wide">
        Access Denied
      </h2>

      <p className="text-slate-300 text-sm leading-relaxed max-w-sm mb-6">
        Please connect your Web3 wallet using the button in the header to view your creator dashboard and manage your quizzes.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25284D] hover:bg-[#2E3260] active:scale-95 text-slate-200 hover:text-white font-heading font-bold text-xs transition-all border border-[#3A3E70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
        aria-label="Return to quiz home page"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Return to Quiz
      </Link>
    </div>
  );
}

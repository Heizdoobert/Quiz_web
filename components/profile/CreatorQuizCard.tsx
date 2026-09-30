'use client';

import React from 'react';
import { ClientQuestion } from '@/lib/types';
import { CheckCircle2, Clock, AlertTriangle, ListChecks } from 'lucide-react';

interface CreatorQuizCardProps {
  quiz: ClientQuestion;
}

export default function CreatorQuizCard({ quiz }: CreatorQuizCardProps) {
  // Format category badge color according to design tokens
  const getCategoryStyles = (category: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('defi')) {
      return 'bg-[#8A2BE2]/15 text-[#8A2BE2] border-[#8A2BE2]/30';
    }
    if (cat.includes('nft')) {
      return 'bg-[#FF007F]/15 text-[#FF007F] border-[#FF007F]/30';
    }
    if (cat.includes('l1') || cat.includes('layer')) {
      return 'bg-[#3071FF]/15 text-[#3071FF] border-[#3071FF]/30';
    }
    return 'bg-[#6C5CE7]/15 text-[#6C5CE7] border-[#6C5CE7]/30';
  };

  const getStatusBadge = (status?: ClientQuestion['status']) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00FFCC]/10 text-[#00FFCC] border border-[#00FFCC]/30">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
            Verified
          </span>
        );
      case 'quarantined':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF4757]/10 text-[#FF4757] border border-[#FF4757]/30">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            {status === 'quarantined' ? 'Quarantined' : 'Rejected'}
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFD166]/10 text-[#FFD166] border border-[#FFD166]/30">
            <Clock className="w-3 h-3" aria-hidden="true" />
            Pending
          </span>
        );
    }
  };

  const formattedDate = quiz.created_at
    ? new Date(quiz.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <li className="list-none flex flex-col justify-between p-5 rounded-2xl border border-[#2D305A] bg-[#1A1B35]/50 hover:bg-[#1A1B35]/80 transition-all hover:border-[#6C5CE7]/60 group focus-within:ring-2 focus-within:ring-[#00FFCC]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-heading font-bold uppercase tracking-wider ${getCategoryStyles(
              quiz.category
            )}`}
          >
            {quiz.category || 'General'}
          </span>
          {getStatusBadge(quiz.status)}
        </div>

        <h3 className="text-white font-medium text-sm leading-relaxed mb-4 line-clamp-3 group-hover:text-slate-100 transition-colors">
          {quiz.prompt}
        </h3>
      </div>

      <div className="flex items-center justify-between pt-3.5 border-t border-[#2D305A]/70 text-xs text-slate-400">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0A1128] border border-[#2D305A] font-mono text-[11px]">
          <ListChecks className="w-3.5 h-3.5 text-[#00FFCC]" aria-hidden="true" />
          <span>{quiz.options?.length || 0} Options</span>
        </div>

        {formattedDate && (
          <span className="text-[11px] text-slate-500 font-medium">
            {formattedDate}
          </span>
        )}
      </div>
    </li>
  );
}

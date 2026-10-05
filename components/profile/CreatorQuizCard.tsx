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
      return 'bg-cat-defi/15 text-cat-defi border-cat-defi/30';
    }
    if (cat.includes('nft')) {
      return 'bg-cat-nft/15 text-cat-nft border-cat-nft/30';
    }
    if (cat.includes('l1') || cat.includes('layer')) {
      return 'bg-cat-l1/15 text-cat-l1 border-cat-l1/30';
    }
    return 'bg-electric-indigo/15 text-electric-indigo border-electric-indigo/30';
  };

  const getStatusBadge = (status?: ClientQuestion['status']) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neo-mint/10 text-neo-mint border border-neo-mint/30">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
            Verified
          </span>
        );
      case 'quarantined':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pop-coral/10 text-pop-coral border border-pop-coral/30">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            {status === 'quarantined' ? 'Quarantined' : 'Rejected'}
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-crypto-gold/10 text-crypto-gold border border-crypto-gold/30">
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
    <li className="list-none flex flex-col justify-between p-5 rounded-2xl border border-cyber-border bg-cyber-violet/50 hover:bg-cyber-violet/80 transition-all hover:border-electric-indigo/60 group focus-within:ring-2 focus-within:ring-neo-mint">
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

      <div className="flex items-center justify-between pt-3.5 border-t border-cyber-border/70 text-xs text-slate-400">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-deep-space border border-cyber-border font-mono text-[11px]">
          <ListChecks className="w-3.5 h-3.5 text-neo-mint" aria-hidden="true" />
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

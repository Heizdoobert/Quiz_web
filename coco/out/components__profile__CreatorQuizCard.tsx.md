# components/profile/CreatorQuizCard.tsx
lines:96 exports:default
---
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

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

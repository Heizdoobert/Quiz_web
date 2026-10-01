# components/lists/ReviewQueue.tsx
lines:189 exports:default
---
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { confirmList, getListDetail, getListsPendingReview } from '@/lib/actions/question-list-actions';
import { REQUIRED_CONFIRMATIONS } from '@/lib/list-constants';
import { useSession } from '@/hooks/shared/use-session';
import { Question, QuestionListWithMeta } from '@/lib/types';
import { CheckCircle2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

export default function ReviewQueue() {
  const { account } = useSession();

  const [lists, setLists] = useState<QuestionListWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setLists(await getListsPendingReview());
    setLoading(false);
  }, [account]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center text-slate-400">
        Sign in to review lists submitted by other players.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black font-heading text-white">Review Queue</h1>

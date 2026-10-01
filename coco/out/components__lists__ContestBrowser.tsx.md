# components/lists/ContestBrowser.tsx
lines:131 exports:default
---
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { getLiveLists, getMyContestEntries, getClaimableContests } from '@/lib/actions/question-list-actions';
import { QuestionListWithMeta, ListEntry } from '@/lib/types';
import { useSession } from '@/hooks/shared/use-session';
import ContestPlay from '@/components/lists/ContestPlay';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Coins, ListChecks, Play, Users } from 'lucide-react';

export default function ContestBrowser() {
  const { account } = useSession();

  const [lists, setLists] = useState<QuestionListWithMeta[]>([]);
  const [entries, setEntries] = useState<ListEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<QuestionListWithMeta | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [l, e, claimable] = await Promise.all([getLiveLists(), getMyContestEntries(), getClaimableContests()]);
    const allLists = [...l];
    for (const cl of claimable) {
      if (!allLists.find(x => x.id === cl.id)) {
        allLists.push(cl);
      }
    }
    setLists(allLists);
    setEntries(e);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center text-slate-400">

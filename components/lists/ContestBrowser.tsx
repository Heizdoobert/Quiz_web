'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getLiveLists } from '@/lib/actions/question-list-actions';
import { QuestionListWithMeta } from '@/lib/types';
import ContestPlay from '@/components/lists/ContestPlay';
import { Coins, ListChecks, Play } from 'lucide-react';

export default function ContestBrowser() {
  const { address, isConnected } = useAccount();
  const wallet = address || null;

  const [lists, setLists] = useState<QuestionListWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<QuestionListWithMeta | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLists(await getLiveLists());
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (!isConnected || !wallet) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center text-slate-400">
        Connect your wallet to play live contests and claim rewards.
      </div>
    );
  }

  if (selected) {
    return (
      <ContestPlay
        list={selected}
        wallet={wallet}
        onExit={() => {
          setSelected(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black font-heading text-white">Live Contests</h1>
        <p className="text-sm text-slate-400 mt-1">
          Peer-reviewed question lists with a crypto reward pool. Answer every question to claim your share.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-6">Loading contests...</p>
      ) : lists.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No contests are live right now.</p>
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <div
              key={list.id}
              className="p-4 bg-[#1A1B35]/90 border border-[#2D305A] rounded-2xl flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <h3 className="font-bold text-white text-sm truncate">{list.title}</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5" /> {list.questionCount} questions
                  </span>
                  <span className="flex items-center gap-1 text-[#00FFCC]">
                    <Coins className="w-3.5 h-3.5" />
                    {(Number(list.perQuestionReward || '0') / 1e18).toString()} QUIZ / correct answer
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(list)}
                className="shrink-0 px-4 py-2 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] text-[#0A1128] rounded-xl font-black text-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4" /> Play
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

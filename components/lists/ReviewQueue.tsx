'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { confirmList, getListDetail, getListsPendingReview } from '@/lib/actions/question-list-actions';
import { REQUIRED_CONFIRMATIONS } from '@/lib/constants/list-constants';
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
        <p className="text-sm text-slate-400 mt-1">
          Read a list&apos;s questions for quality and clarity before confirming. A list needs{' '}
          {REQUIRED_CONFIRMATIONS} distinct confirmations from wallets other than its owner before it can go live.
          Opening a list shows its answers, so you won&apos;t be able to play it once it&apos;s a contest.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-6">Loading pending lists...</p>
      ) : lists.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No lists are currently awaiting review.</p>
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <ReviewCard
              key={list.id}
              list={list}
              expanded={expandedId === list.id}
              onToggle={() => setExpandedId(expandedId === list.id ? null : list.id)}
              onChanged={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  list,
  expanded,
  onToggle,
  onChanged,
}: {
  list: QuestionListWithMeta;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const { requireSignIn: ensureSession } = useSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    // Answers come back only for a signed-in reviewer, so sign in before loading.
    await ensureSession();
    const detail = await getListDetail(list.id);
    setQuestions(detail?.questions || []);
    setLoadingDetail(false);
  }, [list.id, ensureSession]);

  useEffect(() => {
    if (expanded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadDetail();
    }
  }, [expanded, loadDetail]);

  const handleConfirm = async () => {
    setConfirming(true);
    setError(null);
    const res = (await ensureSession())
      ? await confirmList(list.id)
      : { success: false, error: 'Sign the message in your wallet to confirm.' };
    setConfirming(false);
    if (!res.success) {
      setError(res.error || 'Failed to confirm list.');
      return;
    }
    onChanged();
  };

  return (
    <div className="bg-cyber-violet/90 border border-cyber-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left cursor-pointer"
      >
        <div>
          <h3 className="font-bold text-white text-sm">{list.title}</h3>
          <p className="text-xs text-slate-400 mt-1">
            {list.questionCount} questions · {list.confirmationCount}/{REQUIRED_CONFIRMATIONS} confirmations
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="border-t border-cyber-border p-4 space-y-3">
          {error && (
            <div className="p-2.5 rounded-xl text-xs font-bold bg-pop-coral/15 text-pop-coral border border-pop-coral/40">
              {error}
            </div>
          )}

          {list.description && <p className="text-xs text-slate-400">{list.description}</p>}

          {loadingDetail ? (
            <p className="text-xs text-slate-400 py-3">Loading questions...</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-2.5 bg-deep-space/70 border border-cyber-border rounded-xl">
                  <p className="text-xs text-slate-500 font-mono">#{idx + 1} · {q.category}</p>
                  <p className="text-sm text-white">{q.prompt}</p>
                  <ul className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {q.options.map((opt, optIdx) => (
                      <li
                        key={optIdx}
                        className={`text-xs px-2 py-1 rounded-lg ${
                          optIdx === q.correct_index
                            ? 'bg-neo-mint/15 text-neo-mint'
                            : 'bg-cyber-violet text-slate-400'
                        }`}
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming || list.hasConfirmed}
            className="w-full py-2.5 bg-gradient-to-r from-neo-mint to-electric-indigo disabled:opacity-40 text-deep-space rounded-xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {list.hasConfirmed ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Confirmed
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> {confirming ? 'Confirming...' : 'Confirm This List'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

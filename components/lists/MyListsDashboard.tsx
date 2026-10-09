'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { createList, getMyLists } from '@/lib/actions/question-list-actions';
import { MIN_LIST_QUESTIONS, REQUIRED_CONFIRMATIONS } from '@/lib/constants/list-constants';
import { QuestionListWithMeta } from '@/lib/types';
import { useSession } from '@/hooks/shared/use-session';
import { ListCard } from './dashboard/ListCard';

const SIGN_IN_ERROR = 'Sign the message in your wallet to manage your lists.';

export default function MyListsDashboard() {
  const { account, requireSignIn: ensureSession } = useSession();

  const [lists, setLists] = useState<QuestionListWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setLists(await getMyLists());
    setLoading(false);
  }, [account]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const handleCreate = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!account) return;
    setMessage(null);
    if (!(await ensureSession())) {
      setMessage({ type: 'error', text: SIGN_IN_ERROR });
      return;
    }
    const res = await createList({ title, description });
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Failed to create list.' });
      return;
    }
    setTitle('');
    setDescription('');
    setMessage({ type: 'success', text: `List "${res.list?.title}" created. Add at least ${MIN_LIST_QUESTIONS} questions to submit it.` });
    refresh();
  };

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center text-slate-400">
        Sign in to create and manage your question lists.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black font-heading text-white">My Question Lists</h1>
        <p className="text-sm text-slate-400 mt-1">
          Build a list of at least {MIN_LIST_QUESTIONS} questions. {REQUIRED_CONFIRMATIONS} other players must
          confirm it before you can start it as a live, reward-paying contest.
        </p>
      </div>

      {message && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`p-3 rounded-xl text-xs font-bold ${
            message.type === 'error'
              ? 'bg-pop-coral/15 text-pop-coral border border-pop-coral/40'
              : 'bg-neo-mint/15 text-neo-mint border border-neo-mint/40'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleCreate} className="p-4 bg-cyber-violet/90 border border-cyber-border rounded-2xl space-y-3">
        <h2 className="font-bold text-white text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-neo-mint" /> New List
        </h2>
        <input
          type="text"
          required
          minLength={5}
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="List title"
          placeholder="List title, e.g. DeFi Fundamentals"
          className="w-full px-3 py-2 bg-deep-space border border-cyber-border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neo-mint placeholder:text-slate-500"
        />
        <textarea
          rows={2}
          maxLength={200}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="List description (optional)"
          placeholder="Optional description"
          className="w-full px-3 py-2 bg-deep-space border border-cyber-border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neo-mint placeholder:text-slate-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-linear-to-r from-neo-mint to-electric-indigo text-deep-space rounded-xl font-black text-sm cursor-pointer"
        >
          Create List
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-6">Loading your lists...</p>
      ) : lists.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">You haven&apos;t created any lists yet.</p>
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <ListCard
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

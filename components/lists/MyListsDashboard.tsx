'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import {
  createList,
  updateList,
  deleteList,
  getMyLists,
  getListDetail,
  addListQuestion,
  updateListQuestion,
  deleteListQuestion,
  submitListForReview,
  startContest,
  MIN_LIST_QUESTIONS,
  REQUIRED_CONFIRMATIONS,
} from '@/lib/actions/question-list-actions';
import { Question, QuestionListWithMeta } from '@/lib/types';
import ListQuestionEditor, { QuestionFormValues } from '@/components/lists/ListQuestionEditor';
import {
  Plus,
  Trash2,
  Pencil,
  Send,
  Rocket,
  ChevronDown,
  ChevronUp,
  ListChecks,
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
  submitted: 'bg-[#FFD166]/15 text-[#FFD166] border-[#FFD166]/40',
  approved: 'bg-[#6C5CE7]/15 text-[#6C5CE7] border-[#6C5CE7]/40',
  live: 'bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/40',
  rejected: 'bg-[#FF4757]/15 text-[#FF4757] border-[#FF4757]/40',
};

function questionToFormValues(q: Question): QuestionFormValues {
  return {
    prompt: q.prompt,
    options: q.options,
    correctIndex: q.correct_index,
    category: q.category,
    explanation: q.explanation || '',
  };
}

export default function MyListsDashboard() {
  const { address, isConnected } = useAccount();
  const wallet = address || null;

  const [lists, setLists] = useState<QuestionListWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    setLoading(true);
    setLists(await getMyLists(wallet));
    setLoading(false);
  }, [wallet]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setMessage(null);
    const res = await createList({ ownerWallet: wallet, title, description });
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Failed to create list.' });
      return;
    }
    setTitle('');
    setDescription('');
    setMessage({ type: 'success', text: `List "${res.list?.title}" created. Add at least ${MIN_LIST_QUESTIONS} questions to submit it.` });
    refresh();
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center text-slate-400">
        Connect your wallet to create and manage your question lists.
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
          className={`p-3 rounded-xl text-xs font-bold ${
            message.type === 'error'
              ? 'bg-[#FF4757]/15 text-[#FF4757] border border-[#FF4757]/40'
              : 'bg-[#00FFCC]/15 text-[#00FFCC] border border-[#00FFCC]/40'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleCreate} className="p-4 bg-[#1A1B35]/90 border border-[#2D305A] rounded-2xl space-y-3">
        <h2 className="font-bold text-white text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#00FFCC]" /> New List
        </h2>
        <input
          type="text"
          required
          minLength={5}
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="List title, e.g. DeFi Fundamentals"
          className="w-full px-3 py-2 bg-[#0A1128] border border-[#2D305A] rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC] placeholder:text-slate-500"
        />
        <textarea
          rows={2}
          maxLength={200}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          className="w-full px-3 py-2 bg-[#0A1128] border border-[#2D305A] rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC] placeholder:text-slate-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] text-[#0A1128] rounded-xl font-black text-sm cursor-pointer"
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
              wallet={wallet as string}
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

function ListCard({
  list,
  wallet,
  expanded,
  onToggle,
  onChanged,
}: {
  list: QuestionListWithMeta;
  wallet: string;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [poolAmount, setPoolAmount] = useState('');
  const [editingList, setEditingList] = useState(false);
  const [editTitle, setEditTitle] = useState(list.title);
  const [editDescription, setEditDescription] = useState(list.description || '');
  const isDraft = list.status === 'draft';

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    const detail = await getListDetail(list.id, wallet);
    setQuestions(detail?.questions || []);
    setLoadingDetail(false);
  }, [list.id, wallet]);

  useEffect(() => {
    if (expanded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadDetail();
    }
  }, [expanded, loadDetail]);

  const handleSaveListEdit = async () => {
    setError(null);
    const res = await updateList(list.id, wallet, { title: editTitle, description: editDescription });
    if (!res.success) {
      setError(res.error || 'Failed to update list.');
      return;
    }
    setEditingList(false);
    onChanged();
  };

  const handleDeleteList = async () => {
    if (!confirm(`Delete draft list "${list.title}"? This cannot be undone.`)) return;
    await deleteList(list.id, wallet);
    onChanged();
  };

  const handleSubmitForReview = async () => {
    setError(null);
    const res = await submitListForReview(list.id, wallet);
    if (!res.success) {
      setError(res.error || 'Failed to submit list.');
      return;
    }
    onChanged();
  };

  const handleStartContest = async () => {
    const amount = parseFloat(poolAmount);
    if (!amount || amount <= 0) {
      setError('Enter a positive reward pool amount (in QUIZ tokens).');
      return;
    }
    setError(null);
    const res = await startContest(list.id, wallet, amount);
    if (!res.success) {
      setError(res.error || 'Failed to start contest.');
      return;
    }
    onChanged();
  };

  return (
    <div className="bg-[#1A1B35]/90 border border-[#2D305A] rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left cursor-pointer"
      >
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-sm">{list.title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[list.status]}`}>
              {list.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {list.questionCount}/{MIN_LIST_QUESTIONS} questions
            {list.status === 'submitted' && ` · ${list.confirmationCount}/${REQUIRED_CONFIRMATIONS} confirmations`}
            {list.status === 'live' && ` · pool ${(Number(list.reward_pool_tokens) / 1e18).toString()} QUIZ`}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="border-t border-[#2D305A] p-4 space-y-3">
          {error && (
            <div className="p-2.5 rounded-xl text-xs font-bold bg-[#FF4757]/15 text-[#FF4757] border border-[#FF4757]/40">
              {error}
            </div>
          )}

          {isDraft && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAdding((v) => !v)}
                className="px-3 py-1.5 bg-[#00FFCC]/15 text-[#00FFCC] rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
              <button
                type="button"
                onClick={() => setEditingList((v) => !v)}
                className="px-3 py-1.5 bg-[#6C5CE7]/15 text-[#6C5CE7] rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Details
              </button>
              <button
                type="button"
                onClick={handleSubmitForReview}
                disabled={list.questionCount < MIN_LIST_QUESTIONS}
                className="px-3 py-1.5 bg-[#6C5CE7]/15 text-[#6C5CE7] disabled:opacity-40 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Submit for Review
              </button>
              <button
                type="button"
                onClick={handleDeleteList}
                className="px-3 py-1.5 bg-[#FF4757]/15 text-[#FF4757] rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete List
              </button>
            </div>
          )}

          {editingList && (
            <div className="p-3 bg-[#0A1128]/70 border border-[#2D305A] rounded-xl space-y-2">
              <input
                type="text"
                minLength={5}
                maxLength={80}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1B35] border border-[#2D305A] rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
              />
              <textarea
                rows={2}
                maxLength={200}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A1B35] border border-[#2D305A] rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveListEdit}
                  className="px-3 py-1.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] text-[#0A1128] rounded-lg text-xs font-black cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingList(false)}
                  className="px-3 py-1.5 bg-[#25284D] text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {list.status === 'approved' && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-[#6C5CE7]/10 border border-[#6C5CE7]/30 rounded-xl">
              <Rocket className="w-4 h-4 text-[#6C5CE7]" />
              <span className="text-xs text-slate-300">Approved! Set a reward pool (QUIZ tokens) and start the contest:</span>
              <input
                type="number"
                min={1}
                value={poolAmount}
                onChange={(e) => setPoolAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-28 px-2 py-1 bg-[#0A1128] border border-[#2D305A] rounded-lg text-white text-xs"
              />
              <button
                type="button"
                onClick={handleStartContest}
                className="px-3 py-1.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] text-[#0A1128] rounded-lg text-xs font-black cursor-pointer"
              >
                Start Contest
              </button>
            </div>
          )}

          {adding && (
            <ListQuestionEditor
              submitLabel="Add Question"
              onSubmit={(values) =>
                addListQuestion(list.id, wallet, {
                  prompt: values.prompt,
                  options: values.options,
                  correctIndex: values.correctIndex,
                  category: values.category,
                  explanation: values.explanation,
                })
              }
              onDone={() => {
                setAdding(false);
                loadDetail();
                onChanged();
              }}
              onCancel={() => setAdding(false)}
            />
          )}

          {loadingDetail ? (
            <p className="text-xs text-slate-400 py-3">Loading questions...</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {questions.map((q, idx) =>
                editingId === q.id ? (
                  <ListQuestionEditor
                    key={q.id}
                    initial={questionToFormValues(q)}
                    submitLabel="Save Changes"
                    onSubmit={(values) =>
                      updateListQuestion(q.id, wallet, {
                        prompt: values.prompt,
                        options: values.options,
                        correctIndex: values.correctIndex,
                        category: values.category,
                        explanation: values.explanation,
                      })
                    }
                    onDone={() => {
                      setEditingId(null);
                      loadDetail();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div
                    key={q.id}
                    className="p-2.5 bg-[#0A1128]/70 border border-[#2D305A] rounded-xl flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 font-mono">#{idx + 1}</p>
                      <p className="text-sm text-white truncate">{q.prompt}</p>
                    </div>
                    {isDraft && (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingId(q.id)}
                          className="p-1.5 bg-[#6C5CE7]/15 text-[#6C5CE7] rounded-lg cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteListQuestion(q.id, wallet);
                            loadDetail();
                            onChanged();
                          }}
                          className="p-1.5 bg-[#FF4757]/15 text-[#FF4757] rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              )}
              {questions.length === 0 && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5 py-2">
                  <ListChecks className="w-3.5 h-3.5" /> No questions yet.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

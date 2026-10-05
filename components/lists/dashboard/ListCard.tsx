import React, { useCallback, useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { QuestionListWithMeta, Question } from '@/lib/types';
import { MIN_LIST_QUESTIONS, REQUIRED_CONFIRMATIONS } from '@/lib/constants/list-constants';
import { deleteList, submitListForReview, getListDetail, addListQuestion } from '@/lib/actions/question-list-actions';
import { ContestEscrowABI } from '@/lib/contracts/ContestEscrowABI';
import { CONTEST_ESCROW_ADDRESS, TARGET_CHAIN_ID } from '@/lib/contracts/addresses';
import { useSession } from '@/hooks/shared/use-session';
import ListQuestionEditor from '@/components/lists/ListQuestionEditor';
import { ContestActionPanel } from './ContestActionPanel';
import { OnChainRefundPanel } from './OnChainRefundPanel';
import { ListQuestionManager } from './ListQuestionManager';
import { ListCardDraftPanel } from './ListCardDraftPanel';
import { ListCardEditDetailsPanel } from './ListCardEditDetailsPanel';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
  submitted: 'bg-[#FFD166]/15 text-[#FFD166] border-[#FFD166]/40',
  approved: 'bg-[#6C5CE7]/15 text-[#6C5CE7] border-[#6C5CE7]/40',
  live: 'bg-[#00FFCC]/15 text-[#00FFCC] border-[#00FFCC]/40',
  rejected: 'bg-[#FF4757]/15 text-[#FF4757] border-[#FF4757]/40',
};

const SIGN_IN_ERROR = 'Sign the message in your wallet to manage your lists.';

export function ListCard({
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
  const asSignedIn = async <T,>(action: () => Promise<T>): Promise<T | { success: false; error: string }> =>
    (await ensureSession()) ? action() : { success: false, error: SIGN_IN_ERROR };

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingList, setEditingList] = useState(false);
  const [onChainState, setOnChainState] = useState<{ active: boolean; remainingPool: string; expiresAt: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });
  const isDraft = list.status === 'draft';

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    await ensureSession();
    const detail = await getListDetail(list.id);
    setQuestions(detail?.questions || []);
    
    if (list.onchain_contest_id && publicClient) {
      try {
        const contestData = await publicClient.readContract({
          address: CONTEST_ESCROW_ADDRESS,
          abi: ContestEscrowABI,
          functionName: 'contests',
          args: [list.onchain_contest_id as `0x${string}`],
        });
        if (contestData) {
          setOnChainState({
            active: contestData[5] as boolean,
            remainingPool: (contestData[2] as bigint).toString(),
            expiresAt: Number(contestData[4] as bigint),
          });
        }
      } catch (e) {
        console.error('Failed to fetch on-chain contest', e);
      }
    }
    setLoadingDetail(false);
  }, [list.id, ensureSession, list.onchain_contest_id, publicClient]);

  useEffect(() => {
    if (expanded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadDetail();
    }
  }, [expanded, loadDetail]);

  const handleDeleteList = async () => {
    if (!confirm(`Delete draft list "${list.title}"? This cannot be undone.`)) return;
    const res = await asSignedIn(() => deleteList(list.id));
    if (!res.success) setError(res.error || 'Failed to delete list.');
    onChanged();
  };

  const handleSubmitForReview = async () => {
    setError(null);
    const res = await asSignedIn(() => submitListForReview(list.id));
    if (!res.success) {
      setError(res.error || 'Failed to submit list.');
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

          <ListCardDraftPanel
            isDraft={isDraft}
            questionCount={list.questionCount}
            onAddQuestion={() => setAdding((v) => !v)}
            onEditDetails={() => setEditingList((v) => !v)}
            onSubmitForReview={handleSubmitForReview}
            onDeleteList={handleDeleteList}
          />

          {editingList && (
            <ListCardEditDetailsPanel
              listId={list.id}
              initialTitle={list.title}
              initialDescription={list.description || ''}
              onSave={() => {
                setEditingList(false);
                onChanged();
              }}
              onCancel={() => setEditingList(false)}
              setError={setError}
            />
          )}

          <ContestActionPanel 
            listId={list.id} 
            listStatus={list.status} 
            onChanged={onChanged} 
            setError={setError} 
          />

          <OnChainRefundPanel 
            listId={list.id} 
            listStatus={list.status}
            onChainContestId={list.onchain_contest_id || null}
            onChainState={onChainState}
            now={now}
            onChanged={onChanged}
            setError={setError}
          />

          {adding && (
            <ListQuestionEditor
              submitLabel="Add Question"
              onSubmit={(values) =>
                asSignedIn(() =>
                  addListQuestion(list.id, {
                    prompt: values.prompt,
                    options: values.options,
                    correctIndex: values.correctIndex,
                    category: values.category,
                    explanation: values.explanation,
                  })
                )
              }
              onDone={() => {
                setAdding(false);
                loadDetail();
                onChanged();
              }}
              onCancel={() => setAdding(false)}
            />
          )}

          <ListQuestionManager
            questions={questions}
            isDraft={isDraft}
            loadingDetail={loadingDetail}
            onChanged={onChanged}
            loadDetail={loadDetail}
            setError={setError}
          />
        </div>
      )}
    </div>
  );
}

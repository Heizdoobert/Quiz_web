# components/lists/dashboard/ListQuestionManager.tsx
lines:110 exports:ListQuestionManager
---
import React, { useState } from 'react';
import { Trash2, Pencil, ListChecks } from 'lucide-react';
import { Question } from '@/lib/types';
import { deleteListQuestion, updateListQuestion } from '@/lib/actions/question-list-actions';
import ListQuestionEditor, { QuestionFormValues } from '@/components/lists/ListQuestionEditor';
import { useSession } from '@/hooks/shared/use-session';

function questionToFormValues(q: Question): QuestionFormValues {
  return {
    prompt: q.prompt,
    options: q.options,
    correctIndex: q.correct_index,
    category: q.category,
    explanation: q.explanation || '',
  };
}

export function ListQuestionManager({
  questions,
  isDraft,
  loadingDetail,
  onChanged,
  loadDetail,
  setError,
}: {
  questions: Question[];
  isDraft: boolean;
  loadingDetail: boolean;
  onChanged: () => void;
  loadDetail: () => void;
  setError: (err: string | null) => void;
}) {
  const { requireSignIn: ensureSession } = useSession();
  const [editingId, setEditingId] = useState<string | null>(null);

  const asSignedIn = async <T,>(action: () => Promise<T>): Promise<T | { success: false; error: string }> =>
    (await ensureSession()) ? action() : { success: false, error: 'Sign the message in your wallet to manage your lists.' };

  if (loadingDetail) {
    return <p className="text-xs text-slate-400 py-3">Loading questions...</p>;

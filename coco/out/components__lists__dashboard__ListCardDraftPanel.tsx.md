# components/lists/dashboard/ListCardDraftPanel.tsx
lines:55 exports:ListCardDraftPanel
---
import React from 'react';
import { Plus, Pencil, Send, Trash2 } from 'lucide-react';
import { MIN_LIST_QUESTIONS } from '@/lib/constants/list-constants';

export function ListCardDraftPanel({
  isDraft,
  questionCount,
  onAddQuestion,
  onEditDetails,
  onSubmitForReview,
  onDeleteList,
}: {
  isDraft: boolean;
  questionCount: number;
  onAddQuestion: () => void;
  onEditDetails: () => void;
  onSubmitForReview: () => void;
  onDeleteList: () => void;
}) {
  if (!isDraft) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onAddQuestion}
        className="px-3 py-1.5 bg-neo-mint/15 text-neo-mint rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Add Question
      </button>
      <button
        type="button"
        onClick={onEditDetails}
        className="px-3 py-1.5 bg-electric-indigo/15 text-electric-indigo rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
      >
        <Pencil className="w-3.5 h-3.5" /> Edit Details
      </button>
      <button
        type="button"
        onClick={onSubmitForReview}

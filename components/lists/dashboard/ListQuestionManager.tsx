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
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
      {questions.map((q, idx) =>
        editingId === q.id ? (
          <ListQuestionEditor
            key={q.id}
            initial={questionToFormValues(q)}
            submitLabel="Save Changes"
            onSubmit={(values) =>
              asSignedIn(() =>
                updateListQuestion(q.id, {
                  prompt: values.prompt,
                  options: values.options,
                  correctIndex: values.correctIndex,
                  category: values.category,
                  explanation: values.explanation,
                })
              )
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
            className="p-2.5 bg-deep-space/70 border border-cyber-border rounded-xl flex items-start justify-between gap-2"
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
                  className="p-1.5 bg-electric-indigo/15 text-electric-indigo rounded-lg cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await asSignedIn(() => deleteListQuestion(q.id));
                    if (!res.success) setError(res.error || 'Failed to delete question.');
                    loadDetail();
                    onChanged();
                  }}
                  className="p-1.5 bg-pop-coral/15 text-pop-coral rounded-lg cursor-pointer"
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
  );
}

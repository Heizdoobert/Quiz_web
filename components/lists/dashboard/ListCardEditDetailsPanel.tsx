import React, { useState } from 'react';
import { updateList } from '@/lib/actions/question-list-actions';
import { useSession } from '@/hooks/shared/use-session';

export function ListCardEditDetailsPanel({
  listId,
  initialTitle,
  initialDescription,
  onSave,
  onCancel,
  setError,
}: {
  listId: string;
  initialTitle: string;
  initialDescription: string;
  onSave: () => void;
  onCancel: () => void;
  setError: (err: string | null) => void;
}) {
  const { requireSignIn: ensureSession } = useSession();
  const [editTitle, setEditTitle] = useState(initialTitle);
  const [editDescription, setEditDescription] = useState(initialDescription);

  const asSignedIn = async <T,>(action: () => Promise<T>): Promise<T | { success: false; error: string }> =>
    (await ensureSession()) ? action() : { success: false, error: 'Sign the message in your wallet to manage your lists.' };

  const handleSaveListEdit = async () => {
    setError(null);
    const res = await asSignedIn(() => updateList(listId, { title: editTitle, description: editDescription }));
    if (!res.success) {
      setError(res.error || 'Failed to update list.');
      return;
    }
    onSave();
  };

  return (
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
          onClick={onCancel}
          className="px-3 py-1.5 bg-[#25284D] text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

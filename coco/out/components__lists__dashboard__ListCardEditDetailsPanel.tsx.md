# components/lists/dashboard/ListCardEditDetailsPanel.tsx
lines:81 exports:ListCardEditDetailsPanel
---
import React, { useState } from "react";
import { updateList } from "@/lib/actions/question-list-actions";
import { useSession } from "@/hooks/shared/use-session";

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

  const asSignedIn = async <T,>(
    action: () => Promise<T>,
  ): Promise<T | { success: false; error: string }> =>
    (await ensureSession())
      ? action()
      : {
          success: false,
          error: "Sign the message in your wallet to manage your lists.",
        };

  const handleSaveListEdit = async () => {
    setError(null);
    const res = await asSignedIn(() =>
      updateList(listId, { title: editTitle, description: editDescription }),
    );
    if (!res.success) {
      setError(res.error || "Failed to update list.");

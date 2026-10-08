# components/community/CommentList.tsx
lines:179 exports:default
---
"use client";

import React, { useState } from "react";
import { Trash2, MessageSquare, Send } from "lucide-react";
import {
  CommentView,
  addComment,
  deleteComment,
} from "@/lib/actions/community-actions";
import { formatRelativeTime } from "@/lib/utils";
import { logger } from '@/lib/logger';

interface CommentListProps {
  questionId: string;
  comments: CommentView[];
  canComment: boolean;
  onCommentAdded?: () => void;
  onCommentDeleted?: (commentId: string) => void;
  requireSignIn?: () => void;
}

export default function CommentList({
  questionId,
  comments,
  canComment,
  onCommentAdded,
  onCommentDeleted,
  requireSignIn,
}: CommentListProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 500 || submitting) return;

    setSubmitting(true);

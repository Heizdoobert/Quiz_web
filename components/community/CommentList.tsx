"use client";

import React, { useState } from "react";
import { Trash2, MessageSquare, Send } from "lucide-react";
import {
  CommentView,
  addComment,
  deleteComment,
} from "@/lib/actions/community-actions";
import { formatRelativeTime } from "@/lib/utils";

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
    setError(null);

    try {
      const res = await addComment(questionId, trimmed, "comment");
      if (res.ok) {
        setBody("");
        onCommentAdded?.();
      } else {
        if (res.code === "RATE_LIMITED") {
          setError(
            "Daily limit reached (max 20 comments or suggestions per day).",
          );
        } else if (res.code === "NOT_ANSWERED") {
          setError("You must answer this question before commenting.");
        } else {
          setError("Failed to post comment. Please try again.");
        }
      }
    } catch (err) {
      console.error("Comment submission error:", err);
      setError("Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (deletingId) return;
    setDeletingId(commentId);
    setError(null);

    try {
      const res = await deleteComment(commentId);
      if (res.ok) {
        onCommentDeleted?.(commentId);
      } else {
        setError("Failed to delete comment.");
      }
    } catch (err) {
      console.error("Comment deletion error:", err);
      setError("Failed to delete comment.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-xs font-bold font-heading text-slate-300 uppercase tracking-wider">
        <MessageSquare className="w-3.5 h-3.5 text-neo-mint" />
        <span>Comments ({comments.length})</span>
      </div>

      {/* Input box or guest sign-in prompt */}
      {canComment ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="relative">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment..."
              maxLength={500}
              rows={2}
              className="w-full px-3 py-2 text-xs text-slate-100 bg-[#060B1E]/90 border border-cyber-border rounded-xl focus:border-neo-mint focus:outline-none transition-colors resize-none placeholder:text-slate-500"
            />
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span className={body.length > 480 ? "text-crypto-gold" : ""}>
                {body.length}/500
              </span>
              <button
                type="submit"
                disabled={!body.trim() || body.length > 500 || submitting}
                className="flex items-center gap-1 px-3 py-1 bg-linear-to-r from-neo-mint to-electric-indigo hover:opacity-95 text-deep-space font-bold font-heading rounded-lg text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-3 h-3" />
                <span>{submitting ? "Posting..." : "Comment"}</span>
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs text-pop-coral font-medium">{error}</p>
          )}
        </form>
      ) : (
        <div className="p-3 rounded-xl bg-[#060B1E]/60 border border-cyber-border/70 text-center">
          <button
            type="button"
            onClick={requireSignIn}
            className="text-xs font-semibold text-neo-mint hover:underline cursor-pointer"
          >
            Sign in to rate and comment
          </button>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-1">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-2.5 rounded-xl bg-[#060B1E]/60 border border-[#1C1E3A] flex flex-col gap-1 text-xs"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-slate-200 font-semibold">
                    {comment.authorName}
                  </span>
                  <span>·</span>
                  <span>{formatRelativeTime(comment.createdAt)}</span>
                </div>

                {comment.isOwn && (
                  <button
                    type="button"
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    aria-label="Delete comment"
                    className="text-slate-500 hover:text-pop-coral transition-colors p-1 rounded"
                    title="Delete your comment"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Render strictly as plain text (React escapes strings by default) */}
              <p className="text-xs text-slate-300 wrap-break-word leading-relaxed whitespace-pre-wrap">
                {comment.body}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

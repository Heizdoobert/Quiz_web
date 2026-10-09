"use client";

import React, { useState } from "react";
import { Lightbulb, Send, X, Check } from "lucide-react";
import { addComment } from "@/lib/actions/community-actions";
import { logger } from '@/lib/logger';

interface SuggestionFormProps {
  questionId: string;
}

export default function SuggestionForm({ questionId }: SuggestionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 500 || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await addComment(questionId, trimmed, "suggestion");
      if (res.ok) {
        setSuccess(true);
        setBody("");
        setTimeout(() => {
          setSuccess(false);
          setIsOpen(false);
        }, 2000);
      } else {
        if (res.code === "NOT_ALLOWED") {
          setError("Authors cannot send suggestions on their own questions.");
        } else if (res.code === "RATE_LIMITED") {
          setError(
            "Daily limit reached (max 20 comments or suggestions per day).",
          );
        } else if (res.code === "NOT_ANSWERED") {
          setError(
            "You must answer this question before sending a suggestion.",
          );
        } else {
          setError("Failed to send suggestion. Please try again.");
        }
      }
    } catch (err) {
      logger.error("Suggestion submission error:", err);
      setError("Failed to send suggestion. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setError(null);
          setSuccess(false);
        }}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-neo-mint transition-colors cursor-pointer"
      >
        <Lightbulb className="w-3.5 h-3.5 text-neo-mint" />
        <span>Suggest a fix to the author</span>
      </button>
    );
  }

  return (
    <div className="p-3 rounded-2xl bg-[#060B1E]/80 border border-cyber-border space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold font-heading text-slate-200">
          <Lightbulb className="w-3.5 h-3.5 text-neo-mint" />
          <span>Suggest a fix to the author</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          aria-label="Close suggestion form"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[11px] text-slate-400">
        Suggestions are private and only visible to you and the author.
      </p>

      {success ? (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-neo-mint/10 border border-neo-mint/40 text-neo-mint text-xs font-semibold">
          <Check className="w-4 h-4" />
          <span>Suggestion sent to the author!</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-label="Suggest a correction, typo fix, or explanation update"
            placeholder="Suggest a correction, typo fix, or explanation update..."
            maxLength={500}
            rows={2}
            className="w-full px-3 py-2 text-xs text-slate-100 bg-deep-space border border-cyber-border rounded-xl focus:border-neo-mint focus:outline-none transition-colors resize-none placeholder:text-slate-500"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className={body.length > 480 ? "text-crypto-gold" : ""}>
              {body.length}/500
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!body.trim() || body.length > 500 || submitting}
                className="flex items-center gap-1 px-3 py-1 bg-linear-to-r from-neo-mint to-electric-indigo hover:opacity-95 text-deep-space font-bold font-heading rounded-lg text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-3 h-3" />
                <span>{submitting ? "Sending..." : "Send Suggestion"}</span>
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-pop-coral font-medium">{error}</p>
          )}
        </form>
      )}
    </div>
  );
}

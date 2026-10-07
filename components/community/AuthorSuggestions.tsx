"use client";

import React, { useEffect, useState } from "react";
import { Lightbulb, Check } from "lucide-react";
import {
  SuggestionView,
  getSuggestionsForAuthor,
  resolveSuggestion,
} from "@/lib/actions/community-actions";
import { formatRelativeTime } from "@/lib/utils";
import { logger } from '@/lib/logger';

interface AuthorSuggestionsProps {
  accountId: string;
}

export default function AuthorSuggestions({
  accountId,
}: AuthorSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSuggestionsForAuthor(accountId)
      .then((data) => {
        if (!cancelled) {
          setSuggestions(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          logger.error("Failed to load author suggestions:", err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const handleMarkDone = async (commentId: string) => {
    if (resolvingId) return;
    setResolvingId(commentId);

    try {
      const res = await resolveSuggestion(commentId);
      if (res.ok) {
        setSuggestions((prev) => prev.filter((s) => s.id !== commentId));
      }
    } catch (err) {
      logger.error("Failed to mark suggestion done:", err);
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <section aria-labelledby="suggestions-heading" className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-neo-mint" />
        <h2
          id="suggestions-heading"
          className="text-xl font-bold font-heading text-slate-100"
        >
          Suggestions for your questions
        </h2>
        {suggestions.length > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neo-mint/10 text-neo-mint border border-neo-mint/30">
            {suggestions.length}
          </span>
        )}
      </div>

      {suggestions.length === 0 ? (
        <div className="p-6 rounded-2xl bg-deep-space/60 border border-cyber-border/60 text-center text-xs text-slate-400">
          No suggestions yet for your questions.
        </div>
      ) : (
        <ul role="list" className="space-y-3">
          {suggestions.map((item) => (
            <li
              key={item.id}
              className="p-4 rounded-2xl bg-deep-space/80 border border-cyber-border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <p className="text-xs font-bold font-heading text-slate-400 uppercase tracking-wider">
                  Question:{" "}
                  <span className="text-slate-200 normal-case font-medium">
                    {item.prompt}
                  </span>
                </p>
                <p className="text-sm text-slate-100 font-semibold wrap-break-word">
                  {item.body}
                </p>
                <p className="text-xs text-slate-400">
                  Suggested by{" "}
                  <span className="text-slate-300 font-medium">
                    {item.senderName}
                  </span>{" "}
                  · {formatRelativeTime(item.createdAt)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleMarkDone(item.id)}
                disabled={resolvingId === item.id}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-neo-mint/10 hover:bg-neo-mint/20 border border-neo-mint/40 text-neo-mint font-bold font-heading rounded-xl text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neo-mint disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {resolvingId === item.id ? "Saving..." : "Mark done"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

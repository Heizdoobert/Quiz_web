# components/community/AuthorSuggestions.tsx
lines:114 exports:default
---
'use client';

import React, { useEffect, useState } from 'react';
import { Lightbulb, Check } from 'lucide-react';
import {
  SuggestionView,
  getSuggestionsForAuthor,
  resolveSuggestion,
} from '@/lib/actions/community-actions';
import { formatRelativeTime } from '@/lib/utils';

interface AuthorSuggestionsProps {
  accountId: string;
}

export default function AuthorSuggestions({ accountId }: AuthorSuggestionsProps) {
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
          console.error('Failed to load author suggestions:', err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accountId]);

# components/quiz/CommunityDiscussion.tsx
lines:98 exports:CommunityDiscussion
---
import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from '@/hooks/shared/use-session';
import {
  getQuestionDiscussion,
  RatingSummary,
  CommentView,
} from '@/lib/actions/community-actions';
import RatingStars from '@/components/community/RatingStars';
import CommentList from '@/components/community/CommentList';
import SuggestionForm from '@/components/community/SuggestionForm';
import { logger } from '@/lib/logger';

export function CommunityDiscussion({ questionId }: { questionId: string }) {
  const { account, requireSignIn } = useSession();
  const [discussion, setDiscussion] = useState<{
    rating: RatingSummary;
    myRating: number | null;
    comments: CommentView[];
    hasMore: boolean;
  }>({
    rating: { average: 0, count: 0 },
    myRating: null,
    comments: [],
    hasMore: false,
  });

  const loadDiscussion = useCallback(async () => {
    try {
      const data = await getQuestionDiscussion(questionId);
      setDiscussion(data);
    } catch (err) {
      logger.error('Failed to load discussion:', err);
    }
  }, [questionId]);

  useEffect(() => {
    let cancelled = false;
    getQuestionDiscussion(questionId)
      .then((data) => {
        if (!cancelled) setDiscussion(data);

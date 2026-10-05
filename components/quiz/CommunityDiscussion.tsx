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
      console.error('Failed to load discussion:', err);
    }
  }, [questionId]);

  useEffect(() => {
    let cancelled = false;
    getQuestionDiscussion(questionId)
      .then((data) => {
        if (!cancelled) setDiscussion(data);
      })
      .catch((err) => {
        console.error('Failed to load discussion:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [questionId]);

  const handleRated = (newRating: number) => {
    setDiscussion((prev) => {
      const isNew = prev.myRating === null;
      const count = isNew ? prev.rating.count + 1 : prev.rating.count;
      const total = isNew
        ? prev.rating.average * prev.rating.count + newRating
        : prev.rating.average * prev.rating.count - (prev.myRating ?? 0) + newRating;
      const average = count > 0 ? total / count : 0;
      return {
        ...prev,
        myRating: newRating,
        rating: { average, count },
      };
    });
    void loadDiscussion();
  };

  const handleCommentDeleted = (commentId: string) => {
    setDiscussion((prev) => ({
      ...prev,
      comments: prev.comments.filter((c) => c.id !== commentId),
    }));
  };

  return (
    <div className="mb-6 p-4 rounded-2xl bg-deep-space/80 border border-cyber-border space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[#1C1E3A] pb-3">
        <RatingStars
          questionId={questionId}
          average={discussion.rating.average}
          count={discussion.rating.count}
          myRating={discussion.myRating}
          canRate={!!account}
          onRated={handleRated}
        />
        {account && <SuggestionForm questionId={questionId} />}
      </div>

      <CommentList
        questionId={questionId}
        comments={discussion.comments}
        canComment={!!account}
        onCommentAdded={loadDiscussion}
        onCommentDeleted={handleCommentDeleted}
        requireSignIn={requireSignIn}
      />
    </div>
  );
}

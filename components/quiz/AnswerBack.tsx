/* eslint-disable max-lines */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AnswerSubmissionResult, ClientQuestion } from '@/lib/types';
import { ArrowRight, CheckCircle2, XCircle, Flag } from 'lucide-react';
import { useSession } from '@/hooks/shared/use-session';
import {
  getQuestionDiscussion,
  RatingSummary,
  CommentView,
} from '@/lib/actions/community-actions';
import RatingStars from '@/components/community/RatingStars';
import CommentList from '@/components/community/CommentList';
import SuggestionForm from '@/components/community/SuggestionForm';

interface AnswerBackProps {
  question: ClientQuestion;
  result: AnswerSubmissionResult;
  onNext: () => void;
  onOpenDispute?: () => void;
}

export default function AnswerBack({
  question,
  result,
  onNext,
  onOpenDispute,
}: AnswerBackProps) {
  const letters = ['A', 'B', 'C', 'D'];

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
      const data = await getQuestionDiscussion(question.id);
      setDiscussion(data);
    } catch (err) {
      console.error('Failed to load discussion:', err);
    }
  }, [question.id]);

  useEffect(() => {
    let cancelled = false;
    getQuestionDiscussion(question.id)
      .then((data) => {
        if (!cancelled) setDiscussion(data);
      })
      .catch((err) => {
        console.error('Failed to load discussion:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [question.id]);

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

  const notSavedMessage: Record<NonNullable<AnswerSubmissionResult['notSavedReason']>, string> = {
    'signed-out': 'Sign in with your wallet so this counts.',
    'already-answered': 'Already answered — this one only counts once.',
    'own-question': "You wrote this question, so it doesn't count for you.",
    error: 'Not saved — something went wrong, try again.',
  };

  // Advance to next question on Enter or Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable || target?.tagName === 'BUTTON') return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext]);

  return (
    <div className="flex flex-col h-full justify-between p-6 sm:p-8 glass glass-border glass-edge rounded-3xl shadow-2xl">
      {/* Top Banner */}
      <div
        className={`flex items-center gap-3.5 p-4 rounded-2xl border ${
          result.isCorrect
            ? 'bg-[#00FFCC]/10 border-[#00FFCC]/40 text-[#00FFCC]'
            : 'bg-[#FF4757]/10 border-[#FF4757]/40 text-[#FF4757]'
        }`}
      >
        {result.isCorrect ? (
          <CheckCircle2 className="w-8 h-8 text-[#00FFCC] shrink-0" />
        ) : (
          <XCircle className="w-8 h-8 text-[#FF4757] shrink-0" />
        )}
        <div>
          <h3 className="text-lg font-bold tracking-wide">
            {result.isCorrect ? 'Correct! Well Done!' : 'Incorrect! Keep Going!'}
          </h3>
          <p className="text-xs font-semibold opacity-90">
            {result.recorded
              ? result.isCorrect
                ? '+1 Score point & tokens earned'
                : 'Streak reset to 0'
              : notSavedMessage[result.notSavedReason ?? 'error']}
          </p>
        </div>
      </div>

      {/* Answer & Explanation Box */}
      <div className="my-6 p-5 rounded-2xl bg-[#0A1128]/80 border border-[#2D305A] space-y-3">
        <div>
          <span className="text-xs font-bold font-heading text-slate-400 uppercase tracking-wider">
            Correct Answer:
          </span>
          <p className="text-base font-bold font-heading text-[#00FFCC] mt-0.5">
            {letters[result.correctIndex]}: {question.options[result.correctIndex]}
          </p>
        </div>

        {result.explanation && (
          <div className="pt-3 border-t border-[#1C1E3A]">
            <span className="text-xs font-bold font-heading text-slate-400 uppercase tracking-wider">
              Explanation:
            </span>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {result.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Community Discussion: Ratings, Suggestions & Comments */}
      <div className="mb-6 p-4 rounded-2xl bg-[#0A1128]/80 border border-[#2D305A] space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[#1C1E3A] pb-3">
          <RatingStars
            questionId={question.id}
            average={discussion.rating.average}
            count={discussion.rating.count}
            myRating={discussion.myRating}
            canRate={!!account}
            onRated={handleRated}
          />
          {account && <SuggestionForm questionId={question.id} />}
        </div>

        <CommentList
          questionId={question.id}
          comments={discussion.comments}
          canComment={!!account}
          onCommentAdded={loadDiscussion}
          onCommentDeleted={handleCommentDeleted}
          requireSignIn={requireSignIn}
        />
      </div>

      {/* Next Button & Dispute Footer */}
      <div className="pt-4 border-t border-[#2D305A] flex items-center justify-between">
        {onOpenDispute ? (
          <button
            type="button"
            onClick={onOpenDispute}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-[#FF4757] hover:bg-[#FF4757]/10 border border-transparent hover:border-[#FF4757]/30 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4757]"
            title="Challenge or report this question"
          >
            <Flag className="w-3.5 h-3.5 text-[#FF4757]/70" />
            <span className="hidden sm:inline">Dispute Question</span>
          </button>
        ) : (
          <div />
        )}

        <motion.button
          type="button"
          onClick={onNext}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 text-[#0A1128] font-black font-heading rounded-xl text-sm cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1B35]"
        >
          <span>Next Question</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </div>
    </div>
  );
}

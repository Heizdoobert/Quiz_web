# components/quiz/AnswerBack.tsx
lines:220 exports:default
---
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

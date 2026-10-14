# lib/actions/community-actions.ts
lines:315 exports:CommunityResult,RatingSummary,CommentView,SuggestionView,rateQuestion,addComment,deleteComment,resolveSuggestion,getQuestionDiscussion,getSuggestionsForAuthor
---
'use server';

import {
  commentAuthor, countCommentsSince, deleteCommentRow, insertComment, listComments,
  listSuggestionsForAuthor, markSuggestionResolved, myRating as readMyRating,
  questionForDiscussion, suggestionForResolve, upsertRating,
} from '@/lib/db/community';
import { hasRecordedAnswer } from '@/lib/db/results';
import { ratingSummary } from '@/lib/db/rpc';
import { getSessionAccount, type SessionAccount } from '@/lib/services/session';
import { isUuid } from '@/lib/utils/validation';
import { logger } from '@/lib/logger';

export type CommunityResult =
  | { ok: true }
  | {
      ok: false;
      code: 'UNAUTHORIZED' | 'NOT_ANSWERED' | 'NOT_ALLOWED' | 'INVALID' | 'RATE_LIMITED' | 'FAILED';
    };

export interface RatingSummary {
  average: number;
  count: number;
}

export interface CommentView {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  isOwn: boolean;
  mine?: boolean;
}

export interface SuggestionView {
  id: string;
  questionId: string;
  prompt: string;
  questionPrompt?: string;
  body: string;

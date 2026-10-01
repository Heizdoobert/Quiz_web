# lib/actions/community-actions.ts
lines:349 exports:CommunityResult,RatingSummary,CommentView,SuggestionView,rateQuestion,addComment,deleteComment,resolveSuggestion,getQuestionDiscussion,getSuggestionsForAuthor
---
'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';
import { getSessionAccount } from '@/lib/session';
import { isUuid } from '@/lib/validation';

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
}

export interface SuggestionView {
  id: string;
  questionId: string;
  prompt: string;
  body: string;
  senderName: string;
  createdAt: string;
  resolvedAt: string | null;
}

const PAGE_SIZE = 20;

async function checkCanDiscuss(

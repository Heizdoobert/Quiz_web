'use server';

import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { supabase } from '@/lib/supabase/supabase';
import { getSessionAccount } from '@/lib/services/session';
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
  accountId: string,
  questionId: string,
  options: { allowAuthor: boolean }
): Promise<CommunityResult> {
  if (!supabaseAdmin) return { ok: false, code: 'FAILED' };

  // 1. Verify question is public (status = 'verified' AND list_id IS NULL)
  const { data: question, error: qErr } = await supabaseAdmin
    .from('questions')
    .select('id, status, list_id, created_by_user')
    .eq('id', questionId)
    .maybeSingle();

  if (qErr || !question) return { ok: false, code: 'NOT_ALLOWED' };
  if (question.status !== 'verified' || question.list_id !== null) {
    return { ok: false, code: 'NOT_ALLOWED' };
  }

  // 2. Check author gate
  if (!options.allowAuthor && question.created_by_user === accountId) {
    return { ok: false, code: 'NOT_ALLOWED' };
  }

  // 3. Check recorded answer in quiz_results
  const { data: answered, error: aErr } = await supabaseAdmin
    .from('quiz_results')
    .select('id')
    .eq('user_id', accountId)
    .eq('question_id', questionId)
    .maybeSingle();

  if (aErr || !answered) {
    return { ok: false, code: 'NOT_ANSWERED' };
  }

  return { ok: true };
}

export async function rateQuestion(questionId: string, rating: number): Promise<CommunityResult> {
  const account = await getSessionAccount();
  if (!account) return { ok: false, code: 'UNAUTHORIZED' };
  if (!isUuid(questionId) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, code: 'INVALID' };
  }

  const gate = await checkCanDiscuss(account.id, questionId, { allowAuthor: false });
  if (!gate.ok) return gate;

  if (!supabaseAdmin) return { ok: false, code: 'FAILED' };
  const { error } = await supabaseAdmin.from('question_ratings').upsert({
    question_id: questionId,
    user_id: account.id,
    rating,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    logger.error('rateQuestion error:', error);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
}

export async function addComment(
  questionId: string,
  body: string,
  kind: 'comment' | 'suggestion'
): Promise<CommunityResult> {
  const account = await getSessionAccount();
  if (!account) return { ok: false, code: 'UNAUTHORIZED' };
  if (!isUuid(questionId) || !['comment', 'suggestion'].includes(kind)) {
    return { ok: false, code: 'INVALID' };
  }
  const trimmed = body?.trim() || '';
  if (trimmed.length < 1 || trimmed.length > 500) {
    return { ok: false, code: 'INVALID' };
  }

  const gate = await checkCanDiscuss(account.id, questionId, {
    allowAuthor: kind === 'comment',
  });
  if (!gate.ok) return gate;

  if (!supabaseAdmin) return { ok: false, code: 'FAILED' };

  // Rate limit: at most 20 comments plus suggestions per account in 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countErr } = await supabaseAdmin
    .from('question_comments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', account.id)
    .gte('created_at', since);

  if (countErr) {
    logger.error('addComment rate limit check error:', countErr);
    return { ok: false, code: 'FAILED' };
  }
  if (count !== null && count >= 20) {
    return { ok: false, code: 'RATE_LIMITED' };
  }

  const { error } = await supabaseAdmin.from('question_comments').insert({
    question_id: questionId,
    user_id: account.id,
    kind,
    body: trimmed,
  });

  if (error) {
    logger.error('addComment error:', error);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
}

export async function deleteComment(commentId: string): Promise<CommunityResult> {
  const account = await getSessionAccount();
  if (!account) return { ok: false, code: 'UNAUTHORIZED' };
  if (!isUuid(commentId)) return { ok: false, code: 'INVALID' };
  if (!supabaseAdmin) return { ok: false, code: 'FAILED' };

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('question_comments')
    .select('id, user_id')
    .eq('id', commentId)
    .maybeSingle();

  if (fetchErr || !existing) return { ok: false, code: 'NOT_ALLOWED' };
  if (existing.user_id !== account.id) return { ok: false, code: 'NOT_ALLOWED' };

  const { error } = await supabaseAdmin.from('question_comments').delete().eq('id', commentId);

  if (error) {
    logger.error('deleteComment error:', error);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
}

export async function resolveSuggestion(commentId: string): Promise<CommunityResult> {
  const account = await getSessionAccount();
  if (!account) return { ok: false, code: 'UNAUTHORIZED' };
  if (!isUuid(commentId)) return { ok: false, code: 'INVALID' };
  if (!supabaseAdmin) return { ok: false, code: 'FAILED' };

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('question_comments')
    .select('id, kind, questions!inner(created_by_user)')
    .eq('id', commentId)
    .maybeSingle();

  if (fetchErr || !existing) return { ok: false, code: 'NOT_ALLOWED' };
  if (existing.kind !== 'suggestion') return { ok: false, code: 'NOT_ALLOWED' };

  const question = Array.isArray(existing.questions) ? existing.questions[0] : existing.questions;
  if (!question || question.created_by_user !== account.id) {
    return { ok: false, code: 'NOT_ALLOWED' };
  }

  const { error } = await supabaseAdmin
    .from('question_comments')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', commentId);

  if (error) {
    logger.error('resolveSuggestion error:', error);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
}

export async function getQuestionDiscussion(
  questionId: string,
  page = 1
): Promise<{
  rating: RatingSummary;
  myRating: number | null;
  comments: CommentView[];
  hasMore: boolean;
}> {
  const empty = {
    rating: { average: 0, count: 0 },
    myRating: null,
    comments: [],
    hasMore: false,
  };
  if (!isUuid(questionId)) return empty;

  const account = await getSessionAccount();
  const offset = (Math.max(1, page) - 1) * PAGE_SIZE;

  // 1. Fetch rating summary via RPC
  let rating: RatingSummary = { average: 0, count: 0 };
  const { data: rpcData, error: rpcErr } = await supabase.rpc('get_rating_summary', {
    p_question_id: questionId,
  });
  if (!rpcErr && rpcData && rpcData.length > 0) {
    rating = {
      average: Number(rpcData[0].average) || 0,
      count: Number(rpcData[0].count) || 0,
    };
  }

  // 2. Fetch myRating if signed in
  let myRating: number | null = null;
  if (account && supabaseAdmin) {
    const { data: userRating } = await supabaseAdmin
      .from('question_ratings')
      .select('rating')
      .eq('question_id', questionId)
      .eq('user_id', account.id)
      .maybeSingle();
    if (userRating?.rating) {
      myRating = Number(userRating.rating);
    }
  }

  // 3. Fetch comments (kind = 'comment' only, newest first)
  if (!supabaseAdmin) return { rating, myRating, comments: [], hasMore: false };

  const { data: commentRows, error: cErr } = await supabaseAdmin
    .from('question_comments')
    .select('id, body, created_at, user_id, users(display_name)')
    .eq('question_id', questionId)
    .eq('kind', 'comment')
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE);

  if (cErr || !commentRows) {
    logger.error('getQuestionDiscussion comments error:', cErr);
    return { rating, myRating, comments: [], hasMore: false };
  }

  const rows = commentRows as unknown as Array<{
    id: string;
    body: string;
    created_at: string;
    user_id: string;
    users?: { display_name?: string | null } | Array<{ display_name?: string | null }> | null;
  }>;

  const comments: CommentView[] = rows.slice(0, PAGE_SIZE).map((r) => {
    const user = Array.isArray(r.users) ? r.users[0] : r.users;
    return {
      id: r.id,
      authorName: user?.display_name || 'Player',
      body: r.body,
      createdAt: r.created_at,
      isOwn: account?.id === r.user_id,
    };
  });

  return {
    rating,
    myRating,
    comments,
    hasMore: rows.length > PAGE_SIZE,
  };
}

export async function getSuggestionsForAuthor(accountId: string): Promise<SuggestionView[]> {
  const account = await getSessionAccount();
  if (!account || account.id !== accountId) return [];
  if (!isUuid(accountId) || !supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from('question_comments')
    .select(`
      id,
      question_id,
      body,
      created_at,
      resolved_at,
      questions!inner(prompt, created_by_user),
      users(display_name)
    `)
    .eq('kind', 'suggestion')
    .eq('questions.created_by_user', account.id)
    .order('created_at', { ascending: false });

  if (error || !data) {
    logger.error('getSuggestionsForAuthor error:', error);
    return [];
  }

  const rows = data as unknown as Array<{
    id: string;
    question_id: string;
    body: string;
    created_at: string;
    resolved_at: string | null;
    questions?: { prompt?: string } | Array<{ prompt?: string }>;
    users?: { display_name?: string | null } | Array<{ display_name?: string | null }> | null;
  }>;

  return rows.map((r) => {
    const q = Array.isArray(r.questions) ? r.questions[0] : r.questions;
    const u = Array.isArray(r.users) ? r.users[0] : r.users;
    return {
      id: r.id,
      questionId: r.question_id,
      prompt: q?.prompt || '',
      body: r.body,
      senderName: u?.display_name || 'Player',
      createdAt: r.created_at,
      resolvedAt: r.resolved_at || null,
    };
  });
}

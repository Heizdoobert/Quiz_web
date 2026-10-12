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
  // 1. The question must be public (status = 'verified' AND list_id IS NULL)
  let question: Awaited<ReturnType<typeof questionForDiscussion>>;
  try {
    question = await questionForDiscussion(questionId);
  } catch (err) {
    logger.error('checkCanDiscuss question error:', err);
    return { ok: false, code: 'NOT_ALLOWED' };
  }
  if (!question || question.status !== 'verified' || question.list_id !== null) {
    return { ok: false, code: 'NOT_ALLOWED' };
  }

  // 2. Author gate
  if (!options.allowAuthor && question.created_by_user === accountId) {
    return { ok: false, code: 'NOT_ALLOWED' };
  }

  // 3. A recorded answer in quiz_results
  try {
    if (!(await hasRecordedAnswer(accountId, questionId))) return { ok: false, code: 'NOT_ANSWERED' };
  } catch (err) {
    logger.error('checkCanDiscuss answer error:', err);
    return { ok: false, code: 'NOT_ANSWERED' };
  }

  return { ok: true };
}

export async function rateQuestion(
  questionId: string,
  rating: number,
  authAccount?: SessionAccount
): Promise<CommunityResult> {
  const account = authAccount ?? (await getSessionAccount());
  if (!account) return { ok: false, code: 'UNAUTHORIZED' };
  if (!isUuid(questionId) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, code: 'INVALID' };
  }

  const gate = await checkCanDiscuss(account.id, questionId, { allowAuthor: false });
  if (!gate.ok) return gate;

  try {
    await upsertRating(questionId, account.id, rating);
  } catch (err) {
    logger.error('rateQuestion error:', err);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
}

export async function addComment(
  questionId: string,
  body: string,
  kind: 'comment' | 'suggestion',
  authAccount?: SessionAccount
): Promise<CommunityResult> {
  const account = authAccount ?? (await getSessionAccount());
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

  // Rate limit: at most 20 comments plus suggestions per account in 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    if ((await countCommentsSince(account.id, since)) >= 20) return { ok: false, code: 'RATE_LIMITED' };
    await insertComment({ question_id: questionId, user_id: account.id, kind, body: trimmed });
  } catch (err) {
    logger.error('addComment error:', err);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
}

export async function deleteComment(
  commentId: string,
  authAccount?: SessionAccount
): Promise<CommunityResult> {
  const account = authAccount ?? (await getSessionAccount());
  if (!account) return { ok: false, code: 'UNAUTHORIZED' };
  if (!isUuid(commentId)) return { ok: false, code: 'INVALID' };
  let authorId: string | null;
  try {
    authorId = await commentAuthor(commentId);
  } catch (err) {
    logger.error('deleteComment lookup error:', err);
    return { ok: false, code: 'NOT_ALLOWED' };
  }
  if (authorId !== account.id) return { ok: false, code: 'NOT_ALLOWED' };

  try {
    await deleteCommentRow(commentId);
  } catch (err) {
    logger.error('deleteComment error:', err);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
}

export async function resolveSuggestion(
  commentId: string,
  authAccount?: SessionAccount
): Promise<CommunityResult> {
  const account = authAccount ?? (await getSessionAccount());
  if (!account) return { ok: false, code: 'UNAUTHORIZED' };
  if (!isUuid(commentId)) return { ok: false, code: 'INVALID' };
  let existing: { kind?: string; questions?: unknown } | null;
  try {
    existing = (await suggestionForResolve(commentId)) as { kind?: string; questions?: unknown } | null;
  } catch (err) {
    logger.error('resolveSuggestion lookup error:', err);
    return { ok: false, code: 'NOT_ALLOWED' };
  }
  if (!existing || existing.kind !== 'suggestion') return { ok: false, code: 'NOT_ALLOWED' };

  const question = (Array.isArray(existing.questions) ? existing.questions[0] : existing.questions) as
    | { created_by_user?: string }
    | undefined;
  if (!question || question.created_by_user !== account.id) {
    return { ok: false, code: 'NOT_ALLOWED' };
  }

  try {
    await markSuggestionResolved(commentId);
  } catch (err) {
    logger.error('resolveSuggestion error:', err);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
}

export async function getQuestionDiscussion(
  questionId: string,
  page = 1,
  authAccount?: SessionAccount
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

  const account = authAccount ?? (await getSessionAccount());
  const offset = (Math.max(1, page) - 1) * PAGE_SIZE;

  // 1. Rating summary; the discussion still loads without it
  let rating: RatingSummary = { average: 0, count: 0 };
  try {
    const [summary] = await ratingSummary(questionId);
    if (summary) rating = { average: Number(summary.average) || 0, count: Number(summary.count) || 0 };
  } catch (err) {
    logger.error('getQuestionDiscussion rating error:', err);
  }

  // 2. The signed-in account's own rating
  let myRating: number | null = null;
  if (account) {
    try {
      myRating = await readMyRating(questionId, account.id);
    } catch (err) {
      logger.error('getQuestionDiscussion myRating error:', err);
    }
  }

  // 3. Comments (kind = 'comment' only, newest first)
  let commentRows: unknown[];
  try {
    commentRows = await listComments(questionId, offset, PAGE_SIZE);
  } catch (err) {
    logger.error('getQuestionDiscussion comments error:', err);
    return { rating, myRating, comments: [], hasMore: false };
  }

  const rows = commentRows as Array<{
    id: string;
    body: string;
    created_at: string;
    user_id: string;
    users?: { display_name?: string | null } | Array<{ display_name?: string | null }> | null;
  }>;

  const comments: CommentView[] = rows.slice(0, PAGE_SIZE).map((r) => {
    const user = Array.isArray(r.users) ? r.users[0] : r.users;
    const isOwn = account?.id === r.user_id;
    return {
      id: r.id,
      authorName: user?.display_name || 'Player',
      body: r.body,
      createdAt: r.created_at,
      isOwn,
      mine: isOwn,
    };
  });

  return {
    rating,
    myRating,
    comments,
    hasMore: rows.length > PAGE_SIZE,
  };
}

export async function getSuggestionsForAuthor(
  accountId?: string,
  authAccount?: SessionAccount
): Promise<SuggestionView[]> {
  const account = authAccount ?? (await getSessionAccount());
  if (!account) return [];
  const targetId = accountId ?? account.id;
  if (account.id !== targetId) return [];
  if (!isUuid(targetId)) return [];

  let data: unknown[];
  try {
    data = await listSuggestionsForAuthor(account.id);
  } catch (err) {
    logger.error('getSuggestionsForAuthor error:', err);
    return [];
  }

  const rows = data as Array<{
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
    const promptText = q?.prompt || '';
    return {
      id: r.id,
      questionId: r.question_id,
      prompt: promptText,
      questionPrompt: promptText,
      body: r.body,
      senderName: u?.display_name || 'Player',
      createdAt: r.created_at,
      resolvedAt: r.resolved_at || null,
    };
  });
}

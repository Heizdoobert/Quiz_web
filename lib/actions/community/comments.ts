'use server';

import {
  commentAuthor,
  countCommentsSince,
  deleteCommentRow,
  insertComment,
  listComments,
  myRating as readMyRating,
} from '@/lib/db/community';
import { ratingSummary } from '@/lib/db/rpc';
import { getSessionAccount, type SessionAccount } from '@/lib/services/auth/session';
import { isUuid } from '@/lib/utils/validation';
import { logger } from '@/lib/logger';
import type { CommentView, CommunityResult, RatingSummary } from './types';
import { checkCanDiscuss } from './gate';

const PAGE_SIZE = 20;

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

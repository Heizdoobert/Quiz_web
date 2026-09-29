'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionAccount } from '@/lib/session';
import { isUuid } from '@/lib/validation';
import { CommentView, CommunityResult, RatingSummary, SuggestionView } from '@/lib/types';

const MAX_COMMENT_LENGTH = 500;
const COMMENTS_PER_DAY = 20;
const PAGE_SIZE = 20;

type Gate = { ok: true; authorId: string | null } | CommunityResult;

// Same three checks for every write: public question (contest questions excluded,
// same rule as fetchRandomQuestion/getPublicQuestion), a recorded answer to it (the
// same gate disputeQuestion uses), and — unless the caller allows it — not its author.
async function checkCanDiscuss(
  accountId: string,
  questionId: string,
  opts: { allowAuthor: boolean }
): Promise<Gate> {
  if (!supabaseAdmin) return { ok: false, code: 'FAILED' };

  const { data: question, error: qErr } = await supabaseAdmin
    .from('questions')
    .select('created_by_user')
    .eq('id', questionId)
    .eq('status', 'verified')
    .is('list_id', null)
    .maybeSingle();
  if (qErr) {
    console.error('checkCanDiscuss question lookup error:', qErr);
    return { ok: false, code: 'FAILED' };
  }
  if (!question) return { ok: false, code: 'NOT_ALLOWED' };

  const { data: answered, error: aErr } = await supabaseAdmin
    .from('quiz_results')
    .select('id')
    .eq('user_id', accountId)
    .eq('question_id', questionId)
    .limit(1);
  if (aErr) {
    console.error('checkCanDiscuss answered check error:', aErr);
    return { ok: false, code: 'FAILED' };
  }
  if (!answered?.length) return { ok: false, code: 'NOT_ANSWERED' };

  const authorId = (question as { created_by_user: string | null }).created_by_user;
  if (!opts.allowAuthor && authorId === accountId) return { ok: false, code: 'NOT_ALLOWED' };

  return { ok: true, authorId };
}

export async function rateQuestion(questionId: string, rating: number): Promise<CommunityResult> {
  if (!isUuid(questionId)) return { ok: false, code: 'INVALID' };
  const account = await getSessionAccount();
  if (!account) return { ok: false, code: 'UNAUTHORIZED' };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, code: 'INVALID' };
  if (!supabaseAdmin) return { ok: false, code: 'FAILED' };

  const gate = await checkCanDiscuss(account.id, questionId, { allowAuthor: false });
  if (!gate.ok) return gate;

  const { error } = await supabaseAdmin.from('question_ratings').upsert({
    question_id: questionId,
    user_id: account.id,
    rating,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error('rateQuestion error:', error);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
}

export async function addComment(
  questionId: string,
  body: string,
  kind: 'comment' | 'suggestion'
): Promise<CommunityResult> {
  if (!isUuid(questionId) || (kind !== 'comment' && kind !== 'suggestion')) {
    return { ok: false, code: 'INVALID' };
  }
  const account = await getSessionAccount();
  if (!account) return { ok: false, code: 'UNAUTHORIZED' };
  const trimmed = (body || '').trim();
  if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH) return { ok: false, code: 'INVALID' };
  if (!supabaseAdmin) return { ok: false, code: 'FAILED' };

  // Authors may comment on their own question, but not suggest a fix to themselves.
  const gate = await checkCanDiscuss(account.id, questionId, { allowAuthor: kind === 'comment' });
  if (!gate.ok) return gate;

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count, error: countErr } = await supabaseAdmin
    .from('question_comments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', account.id)
    .gte('created_at', since);
  if (countErr) {
    console.error('addComment count error:', countErr);
    return { ok: false, code: 'FAILED' };
  }
  if ((count ?? 0) >= COMMENTS_PER_DAY) return { ok: false, code: 'RATE_LIMITED' };

  const { error } = await supabaseAdmin.from('question_comments').insert({
    question_id: questionId,
    user_id: account.id,
    kind,
    body: trimmed,
  });
  if (error) {
    console.error('addComment error:', error);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
}

export async function deleteComment(commentId: string): Promise<CommunityResult> {
  if (!isUuid(commentId)) return { ok: false, code: 'INVALID' };
  const account = await getSessionAccount();
  if (!account) return { ok: false, code: 'UNAUTHORIZED' };
  if (!supabaseAdmin) return { ok: false, code: 'FAILED' };

  const { data: comment, error: lookupErr } = await supabaseAdmin
    .from('question_comments')
    .select('id, user_id')
    .eq('id', commentId)
    .maybeSingle();
  if (lookupErr) {
    console.error('deleteComment lookup error:', lookupErr);
    return { ok: false, code: 'FAILED' };
  }
  if (!comment || (comment as { user_id: string }).user_id !== account.id) {
    return { ok: false, code: 'NOT_ALLOWED' };
  }

  const { error } = await supabaseAdmin.from('question_comments').delete().eq('id', commentId);
  if (error) {
    console.error('deleteComment error:', error);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
}

interface CommentRow {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  users: { display_name: string | null } | null;
}

export async function getQuestionDiscussion(
  questionId: string,
  page = 1
): Promise<{ rating: RatingSummary; myRating: number | null; comments: CommentView[]; hasMore: boolean }> {
  const empty = { rating: { average: null, count: 0 }, myRating: null, comments: [], hasMore: false };
  if (!isUuid(questionId) || !supabaseAdmin) return empty;

  const account = await getSessionAccount();
  const offset = (Math.max(1, page) - 1) * PAGE_SIZE;

  const [summaryRes, myRatingRes, commentsRes] = await Promise.all([
    supabaseAdmin.rpc('get_rating_summary', { p_question_id: questionId }),
    account
      ? supabaseAdmin
          .from('question_ratings')
          .select('rating')
          .eq('question_id', questionId)
          .eq('user_id', account.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabaseAdmin
      .from('question_comments')
      .select('id, body, created_at, user_id, users(display_name)')
      .eq('question_id', questionId)
      .eq('kind', 'comment')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE),
  ]);

  if (commentsRes.error) {
    console.error('getQuestionDiscussion comments error:', commentsRes.error);
    return empty;
  }

  const summaryData = summaryRes.data as { average: number | string | null; count: number }[] | null;
  const summaryRow = summaryData?.[0];
  const myRatingRow = myRatingRes.data as { rating: number } | null;
  const rows = (commentsRes.data ?? []) as unknown as CommentRow[];

  return {
    rating: {
      average: summaryRow?.average != null ? Number(summaryRow.average) : null,
      count: summaryRow?.count ?? 0,
    },
    myRating: myRatingRow?.rating ?? null,
    comments: rows.slice(0, PAGE_SIZE).map((row) => ({
      id: row.id,
      body: row.body,
      authorName: row.users?.display_name || 'Player',
      createdAt: row.created_at,
      mine: !!account && row.user_id === account.id,
    })),
    hasMore: rows.length > PAGE_SIZE,
  };
}

interface SuggestionCommentRow {
  id: string;
  question_id: string;
  body: string;
  created_at: string;
  resolved_at: string | null;
  users: { display_name: string | null } | null;
}

export async function getSuggestionsForAuthor(accountId: string): Promise<SuggestionView[]> {
  const account = await getSessionAccount();
  if (!account || account.id !== accountId || !supabaseAdmin) return [];

  const { data: myQuestions, error: qErr } = await supabaseAdmin
    .from('questions')
    .select('id, prompt')
    .eq('created_by_user', accountId);
  if (qErr) {
    console.error('getSuggestionsForAuthor questions error:', qErr);
    return [];
  }
  const questions = (myQuestions ?? []) as { id: string; prompt: string }[];
  if (!questions.length) return [];

  const promptById = new Map(questions.map((q) => [q.id, q.prompt]));
  const { data, error } = await supabaseAdmin
    .from('question_comments')
    .select('id, question_id, body, created_at, resolved_at, users(display_name)')
    .eq('kind', 'suggestion')
    .in('question_id', questions.map((q) => q.id))
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getSuggestionsForAuthor comments error:', error);
    return [];
  }

  const rows = (data ?? []) as unknown as SuggestionCommentRow[];
  return rows.map((row) => ({
    id: row.id,
    questionId: row.question_id,
    questionPrompt: promptById.get(row.question_id) || '',
    body: row.body,
    senderName: row.users?.display_name || 'Player',
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }));
}

export async function resolveSuggestion(commentId: string): Promise<CommunityResult> {
  if (!isUuid(commentId)) return { ok: false, code: 'INVALID' };
  const account = await getSessionAccount();
  if (!account) return { ok: false, code: 'UNAUTHORIZED' };
  if (!supabaseAdmin) return { ok: false, code: 'FAILED' };

  const { data: comment, error: cErr } = await supabaseAdmin
    .from('question_comments')
    .select('id, question_id, kind')
    .eq('id', commentId)
    .eq('kind', 'suggestion')
    .maybeSingle();
  if (cErr) {
    console.error('resolveSuggestion lookup error:', cErr);
    return { ok: false, code: 'FAILED' };
  }
  if (!comment) return { ok: false, code: 'NOT_ALLOWED' };

  const { data: question, error: qErr } = await supabaseAdmin
    .from('questions')
    .select('created_by_user')
    .eq('id', (comment as { question_id: string }).question_id)
    .maybeSingle();
  if (qErr) {
    console.error('resolveSuggestion question lookup error:', qErr);
    return { ok: false, code: 'FAILED' };
  }
  if (!question || (question as { created_by_user: string | null }).created_by_user !== account.id) {
    return { ok: false, code: 'NOT_ALLOWED' };
  }

  const { error } = await supabaseAdmin
    .from('question_comments')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', commentId);
  if (error) {
    console.error('resolveSuggestion update error:', error);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
}

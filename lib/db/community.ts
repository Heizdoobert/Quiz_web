import 'server-only';
import { admin } from './client';
import { countOf, unwrap } from './errors';

// question_comments and question_ratings. All secret key: the public key cannot write them.

export async function questionForDiscussion(
  id: string
): Promise<{ id: string; status: string; list_id: string | null; created_by_user: string | null } | null> {
  return unwrap(
    'community.question',
    await admin().from('questions').select('id, status, list_id, created_by_user').eq('id', id).maybeSingle()
  );
}

export async function upsertRating(questionId: string, accountId: string, rating: number): Promise<void> {
  unwrap(
    'ratings.upsert',
    await admin().from('question_ratings').upsert({
      question_id: questionId,
      user_id: accountId,
      rating,
      updated_at: new Date().toISOString(),
    })
  );
}

export async function myRating(questionId: string, accountId: string): Promise<number | null> {
  // Annotated: without generated Database types the row infers as never.
  const row: { rating: number | null } | null = unwrap(
    'ratings.mine',
    await admin().from('question_ratings').select('rating').eq('question_id', questionId).eq('user_id', accountId).maybeSingle()
  );
  return row?.rating ? Number(row.rating) : null;
}

export async function countCommentsSince(accountId: string, since: string): Promise<number> {
  return countOf(
    'comments.countSince',
    await admin()
      .from('question_comments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', accountId)
      .gte('created_at', since)
  );
}

export async function insertComment(row: {
  question_id: string;
  user_id: string;
  kind: 'comment' | 'suggestion';
  body: string;
}): Promise<void> {
  unwrap('comments.insert', await admin().from('question_comments').insert(row));
}

// The comment's author id, or null when there is no such comment.
export async function commentAuthor(commentId: string): Promise<string | null> {
  // Annotated: without generated Database types the row infers as never.
  const row: { id: string; user_id: string } | null = unwrap(
    'comments.author',
    await admin().from('question_comments').select('id, user_id').eq('id', commentId).maybeSingle()
  );
  return row?.user_id ?? null;
}

export async function deleteCommentRow(commentId: string): Promise<void> {
  unwrap('comments.delete', await admin().from('question_comments').delete().eq('id', commentId));
}

export async function suggestionForResolve(commentId: string): Promise<unknown | null> {
  return unwrap(
    'comments.suggestion',
    await admin()
      .from('question_comments')
      .select('id, kind, questions!inner(created_by_user)')
      .eq('id', commentId)
      .maybeSingle()
  );
}

export async function markSuggestionResolved(commentId: string): Promise<void> {
  unwrap(
    'comments.resolve',
    await admin().from('question_comments').update({ resolved_at: new Date().toISOString() }).eq('id', commentId)
  );
}

// Plain comments (not suggestions), newest first; pageSize + 1 rows so the caller can tell whether there is more.
export async function listComments(questionId: string, offset: number, pageSize: number): Promise<unknown[]> {
  const rows = unwrap(
    'comments.list',
    await admin()
      .from('question_comments')
      .select('id, body, created_at, user_id, users(display_name)')
      .eq('question_id', questionId)
      .eq('kind', 'comment')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize)
  );
  return rows ?? [];
}

export async function listSuggestionsForAuthor(accountId: string): Promise<unknown[]> {
  const rows = unwrap(
    'comments.suggestionsForAuthor',
    await admin()
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
      .eq('questions.created_by_user', accountId)
      .order('created_at', { ascending: false })
  );
  return rows ?? [];
}

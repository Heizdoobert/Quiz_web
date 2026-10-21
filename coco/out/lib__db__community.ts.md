# lib/db/community.ts
lines:123 exports:questionForDiscussion,upsertRating,myRating,countCommentsSince,insertComment,commentAuthor,deleteCommentRow,suggestionForResolve,markSuggestionResolved,listComments,listSuggestionsForAuthor
---
import 'server-only';
import { admin } from './client';
import { countOf, unwrap } from './errors';

// question_comments and question_ratings. All secret key: the public key cannot write them.

export async function questionForDiscussion(
  id: string
): Promise<{ id: string; status: string; created_by_user: string | null } | null> {
  return unwrap(
    'community.question',
    await admin().from('questions').select('id, status, created_by_user').eq('id', id).maybeSingle()
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

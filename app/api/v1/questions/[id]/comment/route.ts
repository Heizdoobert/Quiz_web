import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/api-auth';
import { addComment } from '@/lib/actions/community-actions';
import { apiOk, apiError } from '@/lib/services/api-response';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    if (!id) {
      return apiError('VALIDATION_ERROR', 'Question ID is required');
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return apiError('VALIDATION_ERROR', 'Invalid request body');
    }

    const commentBody = typeof body?.body === 'string' ? body.body.trim() : '';
    if (!commentBody) {
      return apiError('VALIDATION_ERROR', 'Comment body is required');
    }

    const kind: 'comment' | 'suggestion' = body?.kind === 'suggestion' ? 'suggestion' : 'comment';

    const result = await addComment(id, commentBody, kind, auth.account);
    if (result.ok) {
      return apiOk({ ok: true });
    }

    if (result.code === 'INVALID') {
      return apiError('VALIDATION_ERROR', 'Comment must be between 1 and 500 characters');
    }
    if (result.code === 'NOT_ANSWERED') {
      return apiError('NOT_ALLOWED', 'Must answer the question before commenting', undefined, 403);
    }
    if (result.code === 'NOT_ALLOWED') {
      return apiError('NOT_ALLOWED', 'Action not allowed', undefined, 403);
    }
    if (result.code === 'RATE_LIMITED') {
      return apiError('RATE_LIMITED', 'Rate limit exceeded (max 20 comments/suggestions per day)', undefined, 429);
    }
    if (result.code === 'UNAUTHORIZED') {
      return apiError('UNAUTHORIZED', 'Sign in to comment');
    }

    return apiError('SERVER_ERROR', 'Failed to add comment');
  } catch {
    return apiError('SERVER_ERROR', 'Failed to add comment');
  }
}

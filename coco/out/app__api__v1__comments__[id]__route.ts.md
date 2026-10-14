# app/api/v1/comments/[id]/route.ts
lines:40 exports:dynamic,DELETE
---
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/api-auth';
import { deleteComment } from '@/lib/actions/community-actions';
import { apiOk, apiError } from '@/lib/services/api-response';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    if (!id) {
      return apiError('VALIDATION_ERROR', 'Comment ID is required');
    }

    const result = await deleteComment(id, auth.account);
    if (result.ok) {
      return apiOk({ ok: true });
    }

    if (result.code === 'NOT_ALLOWED') {
      return apiError('NOT_ALLOWED', 'You cannot delete this comment', undefined, 403);
    }
    if (result.code === 'INVALID') {
      return apiError('VALIDATION_ERROR', 'Invalid comment ID');
    }
    if (result.code === 'UNAUTHORIZED') {
      return apiError('UNAUTHORIZED', 'Sign in to delete comment');
    }

    return apiError('SERVER_ERROR', 'Failed to delete comment');
  } catch {
    return apiError('SERVER_ERROR', 'Failed to delete comment');
  }
}

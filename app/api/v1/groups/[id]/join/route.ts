import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/api-auth';
import { joinGroup } from '@/lib/actions/group-actions';
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
      return apiError('VALIDATION_ERROR', 'Group ID is required');
    }

    const result = await joinGroup(id, auth.account);
    if (result.success) {
      return apiOk({ ok: true });
    }

    if (result.error === 'Group not found.') {
      return apiError('NOT_FOUND', result.error);
    }
    if (result.error === 'You are already in this group.') {
      return apiError('CONFLICT', result.error);
    }
    if (result.error === 'Sign in to manage groups.') {
      return apiError('UNAUTHORIZED', result.error);
    }

    return apiError('SERVER_ERROR', result.error || 'Failed to join group');
  } catch {
    return apiError('SERVER_ERROR', 'Failed to join group');
  }
}

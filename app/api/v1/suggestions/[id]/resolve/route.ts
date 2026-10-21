import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/auth/api-auth';
import { resolveSuggestion } from '@/lib/actions/community';
import { apiOk, apiError } from '@/lib/services/api/api-response';

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
      return apiError('VALIDATION_ERROR', 'Suggestion ID is required');
    }

    const result = await resolveSuggestion(id, auth.account);
    if (result.ok) {
      return apiOk({ ok: true });
    }

    if (result.code === 'NOT_ALLOWED') {
      return apiError('NOT_ALLOWED', 'You cannot resolve this suggestion', undefined, 403);
    }
    if (result.code === 'INVALID') {
      return apiError('VALIDATION_ERROR', 'Invalid suggestion ID');
    }
    if (result.code === 'UNAUTHORIZED') {
      return apiError('UNAUTHORIZED', 'Sign in to resolve suggestion');
    }

    return apiError('SERVER_ERROR', 'Failed to resolve suggestion');
  } catch {
    return apiError('SERVER_ERROR', 'Failed to resolve suggestion');
  }
}

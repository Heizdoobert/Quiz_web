import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/auth/api-auth';
import { get5050EliminatedIndices } from '@/lib/actions/quiz';
import { apiOk, apiError } from '@/lib/services/api/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
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

    const indices = await get5050EliminatedIndices(id);
    return apiOk(indices);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to retrieve 50/50 lifeline');
  }
}

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/auth/api-auth';
import { disputeQuestion } from '@/lib/actions/quiz';
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
      return apiError('VALIDATION_ERROR', 'Question ID is required');
    }

    const body = await req.json();
    const result = await disputeQuestion(
      { questionId: id, reason: body?.reason },
      auth.account
    );
    if (result.success) {
      return apiOk(result.data);
    }
    return apiError(result.error.code, result.error.message, result.error.details);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to dispute question');
  }
}

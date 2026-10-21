import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/auth/api-auth';
import { submitAnswer } from '@/lib/actions/quiz';
import { apiOk, apiError } from '@/lib/services/api/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    let body: Record<string, unknown> | null;
    try {
      body = await req.json();
    } catch {
      return apiError('VALIDATION_ERROR', 'Invalid JSON body');
    }

    const { questionId, answerIndex }: Record<string, unknown> = body ?? {};
    if (
      typeof questionId !== 'string' ||
      !questionId.trim() ||
      typeof answerIndex !== 'number' ||
      !Number.isInteger(answerIndex)
    ) {
      return apiError('VALIDATION_ERROR', 'questionId and answerIndex are required');
    }

    const result = await submitAnswer(
      { questionId: questionId.trim(), answerIndex },
      auth.account
    );
    return apiOk(result);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to submit answer');
  }
}

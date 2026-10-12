import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/api-auth';
import { rateQuestion } from '@/lib/actions/community-actions';
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

    const rating = body?.rating;
    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return apiError('VALIDATION_ERROR', 'Rating must be an integer between 1 and 5');
    }

    const result = await rateQuestion(id, rating, auth.account);
    if (result.ok) {
      return apiOk({ ok: true });
    }

    if (result.code === 'INVALID') {
      return apiError('VALIDATION_ERROR', 'Invalid rating or question');
    }
    if (result.code === 'NOT_ANSWERED') {
      return apiError('NOT_ALLOWED', 'Must answer the question before rating', undefined, 403);
    }
    if (result.code === 'NOT_ALLOWED') {
      return apiError('NOT_ALLOWED', 'Action not allowed', undefined, 403);
    }
    if (result.code === 'RATE_LIMITED') {
      return apiError('RATE_LIMITED', 'Too many ratings. Try again later.', undefined, 429);
    }
    if (result.code === 'UNAUTHORIZED') {
      return apiError('UNAUTHORIZED', 'Sign in to rate');
    }

    return apiError('SERVER_ERROR', 'Failed to rate question');
  } catch {
    return apiError('SERVER_ERROR', 'Failed to rate question');
  }
}

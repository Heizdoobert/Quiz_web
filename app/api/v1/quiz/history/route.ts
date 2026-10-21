import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/auth/api-auth';
import { getAnswerHistory } from '@/lib/actions/quiz-actions';
import { apiOk, apiError } from '@/lib/services/api/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const history = await getAnswerHistory(auth.account);
    return apiOk(history);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to fetch answer history');
  }
}

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/auth/api-auth';
import { getUserStats } from '@/lib/actions/quiz-actions';
import { apiOk, apiError } from '@/lib/services/api/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const stats = await getUserStats(auth.account);
    return apiOk(stats);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to fetch user stats');
  }
}

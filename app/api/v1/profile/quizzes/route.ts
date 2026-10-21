import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/auth/api-auth';
import { getUserQuizzes } from '@/lib/actions/profile-actions';
import { apiOk, apiError } from '@/lib/services/api/api-response';
import { Question } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = req.nextUrl;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const category = searchParams.get('category') || undefined;
    const status = (searchParams.get('status') as Question['status']) || undefined;

    const limit = limitParam !== null && !isNaN(parseInt(limitParam, 10)) ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam !== null && !isNaN(parseInt(offsetParam, 10)) ? parseInt(offsetParam, 10) : undefined;

    const result = await getUserQuizzes({ limit, offset, category, status }, auth.account);
    if (result.success) {
      return apiOk({ quizzes: result.quizzes, count: result.count });
    }

    return apiError(result.code, result.error);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to fetch user quizzes');
  }
}

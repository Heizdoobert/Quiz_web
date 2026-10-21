import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/auth/api-auth';
import { generateQuestion } from '@/lib/actions/quiz';
import { apiOk, apiError } from '@/lib/services/api/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { topic } = body ?? {};
    if (typeof topic !== 'string' || !topic.trim()) {
      return apiError('VALIDATION_ERROR', 'Topic is required');
    }

    const result = await generateQuestion(topic.trim(), auth.account);
    if (result.success) {
      return apiOk(result.data);
    }
    return apiError(result.error.code, result.error.message, result.error.details);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to generate question');
  }
}

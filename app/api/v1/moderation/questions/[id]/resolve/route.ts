import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/auth/api-auth';
import { apiError, apiOk } from '@/lib/services/api/api-response';
import { resolveQuestionDispute } from '@/lib/services/moderation/moderation';

export const dynamic = 'force-dynamic';

// Body: { outcome: 'restore' | 'retire', note?: string up to 500 characters }. Needs the
// disputes.resolve permission (moderator or admin); the moderator recorded is the caller.
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    // A body that is not JSON is passed on as undefined fields: the service checks the
    // permission first, then rejects it as a validation error.
    const body = await req.json().catch(() => null);
    const result = await resolveQuestionDispute({ questionId: id, outcome: body?.outcome, note: body?.note }, auth.account);
    if (result.success) return apiOk(result.data);
    return apiError(result.error.code, result.error.message, result.error.details);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to resolve the dispute');
  }
}

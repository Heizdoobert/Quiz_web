# app/api/v1/questions/[id]/discussion/route.ts
lines:27 exports:dynamic,GET
---
import { NextRequest } from 'next/server';
import { optionalAuth } from '@/lib/services/api-auth';
import { getQuestionDiscussion } from '@/lib/actions/community-actions';
import { apiOk, apiError } from '@/lib/services/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return apiError('VALIDATION_ERROR', 'Question ID is required');
    }

    const account = optionalAuth(req);
    const pageParam = req.nextUrl.searchParams.get('page');
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;

    const data = await getQuestionDiscussion(id, page, account ?? undefined);
    return apiOk(data);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to fetch question discussion');
  }
}

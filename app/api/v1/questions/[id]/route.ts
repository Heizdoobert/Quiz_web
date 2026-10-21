import { NextRequest } from 'next/server';
import { getPublicQuestion } from '@/lib/actions/question-actions';
import { apiOk, apiError } from '@/lib/services/api/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return apiError('VALIDATION_ERROR', 'Question ID is required');
    }

    const question = await getPublicQuestion(id);
    if (!question) {
      return apiError('NOT_FOUND', 'Question not found');
    }

    return apiOk(question);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to fetch question');
  }
}

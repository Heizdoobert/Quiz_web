import { getQuestionCount } from '@/lib/actions/question-actions';
import { apiOk, apiError } from '@/lib/services/api/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const count = await getQuestionCount();
    return apiOk({ count });
  } catch {
    return apiError('SERVER_ERROR', 'Failed to get question count');
  }
}

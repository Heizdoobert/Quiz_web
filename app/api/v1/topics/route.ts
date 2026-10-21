import { getTopics } from '@/lib/actions/question-actions';
import { apiOk, apiError } from '@/lib/services/api/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const topics = await getTopics();
    return apiOk(topics);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to fetch topics');
  }
}

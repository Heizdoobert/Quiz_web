# app/api/v1/questions/count/route.ts
lines:13 exports:dynamic,GET
---
import { getQuestionCount } from '@/lib/actions/question-actions';
import { apiOk, apiError } from '@/lib/services/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const count = await getQuestionCount();
    return apiOk({ count });
  } catch {
    return apiError('SERVER_ERROR', 'Failed to get question count');
  }
}

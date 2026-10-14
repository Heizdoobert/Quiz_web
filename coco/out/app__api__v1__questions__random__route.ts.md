# app/api/v1/questions/random/route.ts
lines:24 exports:dynamic,GET
---
import { NextRequest } from 'next/server';
import { fetchRandomQuestion } from '@/lib/actions/question-actions';
import { apiOk, apiError } from '@/lib/services/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category') ?? undefined;
    const excludeParam = searchParams.get('exclude');
    const exclude = excludeParam
      ? excludeParam
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : [];

    const question = await fetchRandomQuestion(exclude, category);
    return apiOk(question);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to fetch question');
  }
}

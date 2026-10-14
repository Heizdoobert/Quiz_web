# app/api/v1/search/route.ts
lines:33 exports:dynamic,GET
---
import { NextRequest } from 'next/server';
import { searchQuestions } from '@/lib/actions/discovery-actions';
import { apiOk, apiError } from '@/lib/services/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get('q') ?? '';

    const offsetParam = searchParams.get('offset');
    const limitParam = searchParams.get('limit');
    const pageParam = searchParams.get('page');

    let page = 1;
    if (offsetParam !== null && offsetParam !== '') {
      const offsetNum = parseInt(offsetParam, 10);
      const limitNum = limitParam ? parseInt(limitParam, 10) : 20;
      const validLimit = !isNaN(limitNum) && limitNum > 0 ? limitNum : 20;
      const validOffset = !isNaN(offsetNum) && offsetNum >= 0 ? offsetNum : 0;
      page = Math.floor(validOffset / validLimit) + 1;
    } else if (pageParam !== null && pageParam !== '') {
      const pageNum = parseInt(pageParam, 10);
      page = !isNaN(pageNum) && pageNum > 0 ? pageNum : 1;
    }

    const data = await searchQuestions(q, page);
    return apiOk(data);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to search questions');
  }
}

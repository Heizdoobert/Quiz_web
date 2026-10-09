import { NextRequest, NextResponse } from 'next/server';
import { fetchRandomQuestion } from '@/lib/actions/question-actions';
import { verifyMobileAuthToken } from '@/lib/services/mobile-auth';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const account = verifyMobileAuthToken(token);
  if (!account) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const questions = [];
  const excludeIds: string[] = [];
  
  for (let i = 0; i < 10; i++) {
    const q = await fetchRandomQuestion(excludeIds);
    if (q) {
      questions.push(q);
      excludeIds.push(q.id);
    }
  }

  return NextResponse.json({ questions });
}

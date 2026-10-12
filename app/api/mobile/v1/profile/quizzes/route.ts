import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileAuthToken } from '@/lib/services/mobile-auth';
import { quizzesForAccount } from '@/lib/services/user-quizzes';

// The questions the signed-in player wrote, as the web profile lists them.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const account = authHeader?.startsWith('Bearer ') ? verifyMobileAuthToken(authHeader.split(' ')[1]) : null;
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await quizzesForAccount(account.id);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ quizzes: result.quizzes });
}

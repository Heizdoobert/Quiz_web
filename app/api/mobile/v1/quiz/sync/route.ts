import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileAuthToken } from '@/lib/services/auth/mobile-auth';
import { submitAnswer } from '@/lib/actions/quiz-actions';
import { AnswerSubmissionResult } from '@/lib/types';

// One request handles at most this many queued answers; the app keeps the rows it gets no verdict
// for and sends them with the next sync. Bounds the grading and achievement calls per request.
const MAX_BATCH = 100;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const account = verifyMobileAuthToken(token);
  if (!account) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const results: Record<string, AnswerSubmissionResult> = {};

    for (const item of body.slice(0, MAX_BATCH)) {
      const { questionId, answerIndex, timestamp } = item;
      
      // Anti-cheat: prevent answers from the future (allow 5 mins for clock skew)
      const now = Date.now();
      const itemTime = timestamp ? new Date(timestamp).getTime() : now;
      if (itemTime > now + 5 * 60 * 1000) {
        results[questionId] = {
          isCorrect: false,
          correctIndex: 0,
          explanation: null,
          recorded: false,
          notSavedReason: 'error'
        };
        continue;
      }

      const result = await submitAnswer({
        questionId,
        answerIndex,
      }, account);

      results[questionId] = result;
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

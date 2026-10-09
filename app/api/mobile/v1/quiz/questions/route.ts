import { NextResponse } from 'next/server';
import { fetchRandomQuestion } from '@/lib/actions/question-actions';

export async function GET() {
  // Open to guests like the web's home page: questions carry no answer key. Only answering
  // needs an account (quiz/sync).
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

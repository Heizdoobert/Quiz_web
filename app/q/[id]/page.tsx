import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QuizLayout from '@/components/quiz/QuizLayout';
import { getPublicQuestion } from '@/lib/actions/question-actions';
import { getGlobalLeaderboard } from '@/lib/actions/leaderboard-actions';

export const metadata: Metadata = {
  title: 'Play a question',
};

export default async function PlayQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [question, leaderboard] = await Promise.all([
    getPublicQuestion(id),
    getGlobalLeaderboard(50),
  ]);
  if (!question) notFound();

  return (
    <main className="min-h-screen bg-[#0A1128] text-slate-100 flex flex-col">
      <QuizLayout initialQuestion={question} initialLeaderboard={leaderboard} />
    </main>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import { getPublicQuestion } from '@/lib/actions/question-actions';
import SingleQuestionPlayer from '@/components/discovery/SingleQuestionPlayer';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const question = await getPublicQuestion(id);
  if (!question) {
    return {
      title: 'Question Not Found',
    };
  }
  return {
    title: `${question.category}: ${question.prompt}`,
    description: `Play this trivia question on ${question.category}.`,
  };
}

export default async function SingleQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = await getPublicQuestion(id);

  if (!question) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#0A1128] text-slate-100 flex flex-col">
      <Header />
      <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col items-center">
        <SingleQuestionPlayer question={question} />
      </div>
    </main>
  );
}

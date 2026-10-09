import QuizLayout from '@/components/quiz/QuizLayout';
import { fetchRandomQuestion } from '@/lib/actions/question-actions';
import { getGlobalLeaderboard } from '@/lib/actions/leaderboard-actions';
import { Metadata } from 'next';

export const metadata: Metadata = {
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://quickquiz.app/og/quiz-result',
    'fc:frame:button:1': 'Play Quiz',
    'fc:frame:button:1:action': 'post',
    'fc:frame:post_url': 'https://quickquiz.app/api/frame',
  },
};

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
} = {}) {
  const { category: rawCategory } = (await searchParams) || {};
  const category = rawCategory ? decodeURIComponent(rawCategory) : undefined;
  const [initialQuestion, initialLeaderboard] = await Promise.all([
    fetchRandomQuestion([], category),
    getGlobalLeaderboard(50),
  ]);

  const quizSchema = initialQuestion
    ? {
        '@context': 'https://schema.org',
        '@type': 'Quiz',
        name: 'Quick Quiz Trivia',
        description: 'Interactive multiple-choice trivia quiz.',
        educationalLevel: 'Beginner to Advanced',
        hasPart: [
          {
            '@type': 'Question',
            eduQuestionType: 'Multiple choice',
            text: initialQuestion.prompt,
            suggestedAnswer: initialQuestion.options.map((opt) => ({
              '@type': 'Answer',
              text: opt,
            })),
          },
        ],
      }
    : null;

  return (
    <main className="min-h-screen bg-deep-space text-slate-100 flex flex-col">
      {quizSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(quizSchema).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <QuizLayout
        initialQuestion={initialQuestion}
        initialLeaderboard={initialLeaderboard}
        initialCategory={category}
      />
    </main>
  );
}

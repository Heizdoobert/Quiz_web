import QuizLayout from '@/components/quiz/QuizLayout';
import { fetchRandomQuestion } from '@/lib/actions/question-actions';
import { getGlobalLeaderboard } from '@/lib/actions/leaderboard-actions';

export default async function Home() {
  const [initialQuestion, initialLeaderboard] = await Promise.all([
    fetchRandomQuestion(),
    getGlobalLeaderboard(50),
  ]);

  const quizSchema = initialQuestion
    ? {
        '@context': 'https://schema.org',
        '@type': 'Quiz',
        name: 'Web3 & Crypto Knowledge Trivia',
        description: 'Interactive cryptocurrency trivia quiz covering DeFi, Layer 1s, and Smart Contracts.',
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
    <main className="min-h-screen bg-[#0A1128] text-slate-100 flex flex-col">
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
      />
    </main>
  );
}

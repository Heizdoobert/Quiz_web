import QuizLayout from '@/components/QuizLayout';
import { fetchRandomQuestion } from '@/lib/actions/question-actions';
import { getGlobalLeaderboard } from '@/lib/actions/leaderboard-actions';

export default async function Home() {
  const [initialQuestion, initialLeaderboard] = await Promise.all([
    fetchRandomQuestion(),
    getGlobalLeaderboard(10),
  ]);

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col">
      <QuizLayout
        initialQuestion={initialQuestion}
        initialLeaderboard={initialLeaderboard}
      />
    </main>
  );
}

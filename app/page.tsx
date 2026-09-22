import Header from '@/components/Header';
import QuizLayout from '@/components/QuizLayout';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col">
      <Header />
      <QuizLayout />
    </main>
  );
}

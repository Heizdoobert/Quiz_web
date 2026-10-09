# app/page.tsx
lines:55 exports:default
---
import QuizLayout from '@/components/quiz/QuizLayout';
import { fetchRandomQuestion } from '@/lib/actions/question-actions';
import { getGlobalLeaderboard } from '@/lib/actions/leaderboard-actions';

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
    <main className="min-h-screen bg-deep-space text-slate-100 flex flex-col">
      {quizSchema && (

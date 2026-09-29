'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AnswerSubmissionResult, ClientQuestion } from '@/lib/types';
import QuizCard from '@/components/quiz/QuizCard';
import { submitAnswer } from '@/lib/actions/quiz-actions';
import { get5050EliminatedIndices } from '@/lib/actions/question-actions';
import { soundEngine } from '@/lib/audio';
import { useSession } from '@/hooks/shared/use-session';

const DisputeModal = dynamic(() => import('@/components/modals/DisputeModal'), { ssr: false });

export default function SingleQuestionPlayer({ question }: { question: ClientQuestion }) {
  const router = useRouter();
  const { account, requireSignIn } = useSession();

  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerSubmissionResult | null>(null);
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(false);
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);

  const handleSelectAnswer = async (index: number) => {
    if (isSubmitting || isFlipped) return;

    setIsSubmitting(true);
    try {
      const res = await submitAnswer({
        questionId: question.id,
        answerIndex: index,
      });

      setResult(res);
      setIsFlipped(true);

      if (res.isCorrect) {
        soundEngine.playCorrect();
      } else {
        soundEngine.playWrong();
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle5050 = async () => {
    if (fiftyFiftyUsed || isFlipped) return;
    try {
      const indices = await get5050EliminatedIndices(question.id);
      setEliminatedIndices(indices);
      setFiftyFiftyUsed(true);
    } catch (err) {
      console.error('Error using 50/50:', err);
    }
  };

  const handleNext = () => {
    router.push(`/?category=${encodeURIComponent(question.category)}`);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-4">
        <Link
          href={`/topics/${encodeURIComponent(question.category)}`}
          className="text-xs text-slate-400 hover:text-white"
        >
          ← More {question.category} questions
        </Link>
        <Link
          href="/topics"
          className="text-xs text-[#00FFCC] hover:underline"
        >
          All Topics
        </Link>
      </div>

      <div className="w-full max-w-lg">
        <QuizCard
          question={question}
          isFlipped={isFlipped}
          timeLeft={15}
          result={result}
          onSelectAnswer={handleSelectAnswer}
          onNextQuestion={handleNext}
          onOpenTimerSettings={() => {}}
          onUse5050={handle5050}
          onUseSkip={handleNext}
          fiftyFiftyUsed={fiftyFiftyUsed}
          skipUsed={false}
          eliminatedIndices={eliminatedIndices}
          isSubmitting={isSubmitting}
          onAddQuestionClick={() => {
            router.push(`/?category=${encodeURIComponent(question.category)}#custom-form`);
          }}
          onOpenDispute={account ? () => setIsDisputeOpen(true) : () => requireSignIn()}
          isUnlocked={true}
        />
      </div>

      {isDisputeOpen && (
        <DisputeModal
          isOpen={isDisputeOpen}
          onClose={() => setIsDisputeOpen(false)}
          questionId={question.id}
          walletAddress={account?.wallet || undefined}
        />
      )}
    </div>
  );
}

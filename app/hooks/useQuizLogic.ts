import { useState } from 'react';

export interface Question {
  id: number;
  prompt: string;
  options: string[];
  correctAnswerIndex: number;
}

export function useQuizLogic(questions: Question[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleSelectOption = (optionIndex: number) => {
    const updated = [...selectedAnswers];
    updated[currentIndex] = optionIndex;
    setSelectedAnswers(updated);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setIsFinished(false);
  };

  const calculateScore = () =>
    selectedAnswers.reduce((score, ans, idx) =>
      ans === questions[idx].correctAnswerIndex ? score + 1 : score,
    0);

  return {
    currentIndex,
    currentQuestion,
    totalQuestions: questions.length,
    selectedAnswer: selectedAnswers[currentIndex] ?? null,
    isFinished,
    handleSelectOption,
    handleNext,
    handlePrevious,
    handleRestart,
    calculateScore,
  };
}

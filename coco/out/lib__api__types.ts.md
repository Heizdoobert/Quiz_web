# lib/api/types.ts
lines:41 exports:QuizSummary,Question,Quiz,NewQuizRequest,SubmitAnswer,SubmitResult
---
// Auto-generated TypeScript interfaces from OpenAPI spec
export interface QuizSummary {
  id: string;
  title: string;
  category: string;
  questionCount: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex?: number; // optional on GET
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  category: string;
  questions: Question[];
}

export interface NewQuizRequest {
  title: string;
  description?: string;
  category: string;
  questions: Question[];
}

export interface SubmitAnswer {
  userId: string;
  answers: Array<{ questionId: string; selectedOptionIndex: number }>;
}

export interface SubmitResult {
  score: number;
  totalQuestions: number;
  passed: boolean;
  results: Array<{ questionId: string; isCorrect: boolean; correctOptionIndex: number }>;

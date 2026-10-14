# sdk/shared_modules/src/types.ts
lines:264 exports:QuestionStatus,Question,ClientQuestion,QuestionDispute,GeneratedQuestion,CreateQuestionInput,QuestionAnalytics,QuizResult,AnswerNotSavedReason,AnswerSubmissionResult,HistoryItem,UserStats,LeaderboardEntry,UserBackupData,PaginationParams,GetUserQuizzesFilter,UserQuizzesResult,Group,RatingSummary,CommentView
---
// ==========================================
// Question & Quiz Domain DTOs
// ==========================================

export type QuestionStatus = 'verified' | 'pending' | 'quarantined' | 'rejected';

export interface Question {
  id: string;
  category: string;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  created_by_user: string | null;
  status?: QuestionStatus;
  dispute_count?: number;
  created_at: string;
}

export interface ClientQuestion {
  id: string;
  category: string;
  prompt: string;
  options: string[];
  status?: QuestionStatus;
  created_by?: string | null;
  created_at?: string;
}

export interface QuestionDispute {
  id: string;
  question_id: string;
  reason: string;
  created_at: string;
}

export interface GeneratedQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;

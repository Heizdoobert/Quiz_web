# sdk/src/types.ts
lines:295 exports:Question,ClientQuestion,QuestionDispute,QuizResult,Group,UserStats,LeaderboardEntry,AnswerSubmissionResult,SearchResult,HistoryItem,ActionErrorCode,ActionResult,PaginationParams,GetUserQuizzesFilter,UserBackupData,ProfileErrorCode,GetUserQuizzesResult,ExportUserDataResult,CommunityErrorCode,CommunityResult
---
export interface Question {
  id: string;
  category: string;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  created_by_user: string | null;
  status?: 'verified' | 'pending' | 'quarantined' | 'rejected';
  dispute_count?: number;
  created_at: string;
}

export interface ClientQuestion {
  id: string;
  category: string;
  prompt: string;
  options: string[];
  status?: 'verified' | 'pending' | 'quarantined' | 'rejected';
  created_by?: string | null;
  created_at?: string;
}

export interface QuestionDispute {
  id: string;
  question_id: string;
  reason: string;
  created_at: string;
}

export interface QuizResult {
  id: string;
  user_id: string;
  question_id: string;
  answer_index: number;
  is_correct: boolean;
  answered_at: string;
}

export interface Group {

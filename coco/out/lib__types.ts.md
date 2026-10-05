# lib/types.ts
lines:253 exports:Question,ClientQuestion,QuestionDispute,QuizResult,Group,QuestionListStatus,QuestionList,QuestionListWithMeta,ListEntry,UserStats,LeaderboardEntry,AnswerSubmissionResult,SearchResult,HistoryItem,ClaimableRewards,RewardVoucher,BADGE_NAMES,BADGE_ICONS,ActionErrorCode,ActionResult
---
export interface Question {
  id: string;
  category: string;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  created_by: string | null;
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
  reporter_wallet: string;
  reason: string;
  created_at: string;
}

export interface QuizResult {
  id: string;
  wallet_address: string;
  question_id: string;
  answer_index: number;
  is_correct: boolean;
  answered_at: string;
}


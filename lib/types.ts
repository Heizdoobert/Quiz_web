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
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface UserStats {
  score: number;
  streak: number;
  bestStreak: number;
  accuracy: number;
  totalAnswered: number;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  score: number;
  accuracy: number;
  rank: number;
}

export interface AnswerSubmissionResult {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string | null;
  // False when the answer didn't count: not signed in, or the question was already answered.
  recorded: boolean;
  // Set only when recorded is false, so the UI can say why instead of claiming a point was earned.
  notSavedReason?: 'signed-out' | 'already-answered' | 'own-question' | 'rate-limited' | 'error';
}

export interface SearchResult {
  id: string;
  prompt: string;
  category: string;
  authorName: string;
  createdAt: string;
  score?: number;
}

export interface HistoryItem {
  questionId: string;
  prompt: string;
  isCorrect: boolean;
}

// --- Standard API Error Contract ---
export type ActionErrorCode = 
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { 
      success: false; 
      error: { 
        code: ActionErrorCode | string; 
        message: string; 
        details?: unknown;
      } 
    };

// --- Profile & Data Export Interface Contracts ---

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface GetUserQuizzesFilter extends PaginationParams {
  category?: string;
  status?: Question['status'];
}

export interface UserBackupData {
  accountId: string;
  exportedAt: string;
  version: string;
  quizzes: Question[];
  stats: QuizResult[];
  isTruncated?: boolean;
}

export type ProfileErrorCode =
  | 'FETCH_FAILED'
  | 'EXPORT_FAILED'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR';

export type GetUserQuizzesResult =
  | { success: true; quizzes: ClientQuestion[]; count: number }
  | { success: false; error: string; code: ProfileErrorCode };

export type ExportUserDataResult =
  | { success: true; data: UserBackupData }
  | { success: false; error: string; code: ProfileErrorCode };

export type CommunityErrorCode =
  | 'UNAUTHORIZED'
  | 'NOT_ANSWERED'
  | 'NOT_ALLOWED'
  | 'INVALID'
  | 'RATE_LIMITED'
  | 'FAILED';

export type CommunityResult = { ok: true } | { ok: false; code: CommunityErrorCode };

export interface RatingSummary {
  average: number | null;
  count: number;
}

export interface CommentView {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  mine: boolean;
}

export interface SuggestionView {
  id: string;
  questionId: string;
  questionPrompt: string;
  body: string;
  senderName: string;
  createdAt: string;
  resolvedAt: string | null;
}

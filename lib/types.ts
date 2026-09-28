export interface User {
  wallet_address: string;
  display_name: string | null;
  created_at: string;
}

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

export interface Group {
  id: string;
  name: string;
  description: string | null;
  owner_wallet: string;
  created_at: string;
}

export type QuestionListStatus = 'draft' | 'submitted' | 'approved' | 'live' | 'rejected';

export interface QuestionList {
  id: string;
  owner_wallet: string;
  title: string;
  description: string | null;
  status: QuestionListStatus;
  reward_pool_tokens: string;
  submitted_at: string | null;
  started_at: string | null;
  created_at: string;
}

export interface QuestionListWithMeta extends QuestionList {
  questionCount: number;
  confirmationCount: number;
  hasConfirmed?: boolean;
  perQuestionReward?: string;
}

export interface ListEntry {
  list_id: string;
  wallet_address: string;
  status: 'in_progress' | 'completed' | 'claimed';
  correct_count: number;
  reward_amount: string;
  completed_at: string | null;
}

export interface UserStats {
  score: number;
  streak: number;
  bestStreak: number;
  accuracy: number;
  totalAnswered: number;
}

export interface LeaderboardEntry {
  wallet_address: string;
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
}

export interface ClaimableRewards {
  claimableTokens: string;
  eligibleBadges: number[];
  alreadyClaimedBadges: number[];
  totalEarned: string;
  totalClaimed: string;
}

export interface RewardVoucher {
  recipient: string;
  amount: string;
  badgeType?: number;
  nonce: string;
  deadline: string;
  signature: string;
  contractAddress: string;
}

export const BADGE_NAMES: Record<number, string> = {
  0: 'Leaderboard Champion',
  1: 'Streak Fire',
  2: 'Century Quizzer',
  3: 'Perfect Round',
};

export const BADGE_ICONS: Record<number, string> = {
  0: '🏆',
  1: '🔥',
  2: '💯',
  3: '⭐',
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
  walletAddress: string;
  exportedAt: string;
  version: string;
  quizzes: Question[];
  stats: QuizResult[];
  isTruncated?: boolean;
}

export type ProfileErrorCode =
  | 'INVALID_ADDRESS'
  | 'FETCH_FAILED'
  | 'EXPORT_FAILED'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR';

export type GetUserQuizzesResult =
  | { success: true; quizzes: ClientQuestion[]; count: number }
  | { success: false; error: string; code: ProfileErrorCode };

export type ExportUserDataResult =
  | { success: true; data: UserBackupData }
  | { success: false; error: string; code: ProfileErrorCode };

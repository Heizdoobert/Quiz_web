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
  created_at: string;
}

export interface ClientQuestion {
  id: string;
  category: string;
  prompt: string;
  options: string[];
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

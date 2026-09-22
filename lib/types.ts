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
  created_by: string;
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

import 'server-only';
import { pub } from '../client';

export async function findGhostAttemptByPin(pin: string) {
  return pub
    .from('ghost_attempts')
    .select('id')
    .eq('pin', pin)
    .single();
}

export async function insertQuiz(data: {
  title: string;
  description?: string;
  is_public: boolean;
  created_by: string;
  parent_quiz_id: string | null;
}) {
  return pub
    .from('quizzes')
    .insert(data)
    .select()
    .single();
}

export async function insertGhostAttempt(data: {
  quiz_id: string;
  pin: string;
  answers: Record<string, string>;
  expires_at: string;
  ip_address: string | null;
}) {
  return pub
    .from('ghost_attempts')
    .insert(data)
    .select()
    .single();
}

export async function getGhostAttemptByPin(quizId: string, pin: string) {
  return pub
    .from('ghost_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('pin', pin)
    .single();
}

export async function selectPublicQuizzes(from: number, to: number) {
  return pub
    .from('quizzes')
    .select('*', { count: 'exact' })
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(from, to);
}

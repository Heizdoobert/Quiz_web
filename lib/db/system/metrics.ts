import 'server-only';
import { admin } from '../client';

export interface DatabaseCounts {
  totalUsers?: number;
  totalQuestions?: number;
  totalQuizResults?: number;
}

export async function getSystemCounts(): Promise<DatabaseCounts> {
  const db = admin();

  const [usersRes, questionsRes, resultsRes] = await Promise.all([
    db.from('users').select('*', { count: 'exact', head: true }),
    db.from('questions').select('*', { count: 'exact', head: true }),
    db.from('quiz_results').select('*', { count: 'exact', head: true }),
  ]);

  return {
    totalUsers: usersRes.count ?? undefined,
    totalQuestions: questionsRes.count ?? undefined,
    totalQuizResults: resultsRes.count ?? undefined,
  };
}

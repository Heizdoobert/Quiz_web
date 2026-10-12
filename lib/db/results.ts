import 'server-only';
import { admin } from './client';
import { unwrap, UNIQUE_VIOLATION } from './errors';

// quiz_results. Later tasks add to this file.

// The first answer counts: quiz_results is unique per account and question.
export async function insertResult(row: {
  user_id: string;
  question_id: string;
  answer_index: number;
  is_correct: boolean;
}): Promise<'recorded' | 'duplicate'> {
  const res = await admin().from('quiz_results').insert(row);
  if (res.error?.code === UNIQUE_VIOLATION) return 'duplicate';
  unwrap('results.insert', res);
  return 'recorded';
}

// Newest first, with the question prompt; never answer_index.
export async function recentResults(accountId: string, limit: number): Promise<unknown[]> {
  const rows = unwrap(
    'results.recent',
    await admin()
      .from('quiz_results')
      .select('question_id, is_correct, answered_at, questions(prompt)')
      .eq('user_id', accountId)
      .order('answered_at', { ascending: false })
      .limit(limit)
  );
  return rows ?? [];
}

// quiz_results is unique per account and question, so maybeSingle is exact.
export async function hasRecordedAnswer(accountId: string, questionId: string): Promise<boolean> {
  const row = unwrap(
    'results.hasRecorded',
    await admin().from('quiz_results').select('id').eq('user_id', accountId).eq('question_id', questionId).maybeSingle()
  );
  return row !== null;
}

// Every column, for the account's own backup; secret key only.
export async function resultsForExport(accountId: string, limit: number): Promise<unknown[]> {
  return unwrap('results.export', await admin().from('quiz_results').select('*').eq('user_id', accountId).limit(limit)) ?? [];
}

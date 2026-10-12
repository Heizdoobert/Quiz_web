import 'server-only';
import { admin } from './client';
import { unwrapOne } from './errors';

// questions and question_disputes. Later tasks add to this file.

export type QuestionRow = {
  id: string;
  status: string;
  correct_index: number;
  explanation: string | null;
  created_by_user: string | null;
  list_id: string | null;
};

// The full row, including the answer key; secret key only.
export async function questionForAnswer(id: string): Promise<QuestionRow | null> {
  return unwrapOne('questions.forAnswer', await admin().from('questions').select('*').eq('id', id).single());
}

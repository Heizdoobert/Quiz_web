# lib/db/questions.ts
lines:218 exports:QuestionRow,questionForAnswer,PublicQuestionRow,NewQuestion,ping,countQuestions,countQuestionsByAuthorSince,insertQuestion,listPublicQuestions,publicQuestion,answerKey,listTopicQuestions,listQuestionsByAuthor,insertDispute,countDisputes,setDisputeState,QuarantinedQuestion,quarantinedQuestions,resolveQuarantined,questionsForExport
---
import 'server-only';
import { admin, pub } from './client';
import { countOf, unwrap, unwrapOne, UNIQUE_VIOLATION } from './errors';
import { escapeLikePattern } from '@/lib/utils/validation';

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

const PUBLIC_FIELDS = 'id, category, prompt, options, created_by_user, status';

export type PublicQuestionRow = {
  id: string;
  category: string;
  prompt: string;
  options: unknown;
  created_by_user: string | null;
  // The column's check constraint; matches ClientQuestion['status'].
  status: 'verified' | 'pending' | 'quarantined' | 'rejected' | null;
};

export type NewQuestion = {
  prompt: string;
  options: string[];
  correct_index: number;
  category: string;
  explanation: string | null;
  created_by_user: string;

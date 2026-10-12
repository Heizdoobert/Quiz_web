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
  status: 'verified';
  dispute_count: 0;
};

// Liveness probe for /api/health.
export async function ping(timeoutMs: number): Promise<void> {
  unwrap('questions.ping', await pub.from('questions').select('id').limit(1).abortSignal(AbortSignal.timeout(timeoutMs)));
}

export async function countQuestions(): Promise<number> {
  return countOf('questions.count', await pub.from('questions').select('id', { count: 'exact', head: true }));
}

export async function countQuestionsByAuthorSince(accountId: string, since: string): Promise<number> {
  return countOf(
    'questions.countByAuthorSince',
    await admin()
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('created_by_user', accountId)
      .gte('created_at', since)
  );
}

export async function insertQuestion(row: NewQuestion): Promise<void> {
  unwrap('questions.insert', await admin().from('questions').insert(row));
}

// Public questions: verified and not in a contest list. Unordered, up to `limit`.
export async function listPublicQuestions(opts: {
  excludeIds?: string[];
  category?: string;
  limit: number;
}): Promise<PublicQuestionRow[]> {
  let query = pub.from('questions').select(PUBLIC_FIELDS).eq('status', 'verified').is('list_id', null);
  if (opts.excludeIds?.length) query = query.not('id', 'in', `(${opts.excludeIds.join(',')})`);
  if (opts.category) query = query.ilike('category', escapeLikePattern(opts.category));
  return unwrap('questions.listPublic', await query.limit(opts.limit)) ?? [];
}

export async function publicQuestion(id: string): Promise<PublicQuestionRow | null> {
  return unwrapOne(
    'questions.public',
    await pub.from('questions').select(PUBLIC_FIELDS).eq('id', id).eq('status', 'verified').is('list_id', null).single()
  );
}

// The answer key and visibility only; secret key only.
export async function answerKey(id: string): Promise<{ correct_index: number; status: string; list_id: string | null } | null> {
  return unwrapOne(
    'questions.answerKey',
    await admin().from('questions').select('correct_index, status, list_id').eq('id', id).single()
  );
}

// One topic's public questions, newest first. Fetches pageSize + 1 rows so the caller can tell whether there is more.
export async function listTopicQuestions(topic: string, offset: number, pageSize: number): Promise<unknown[]> {
  const rows = unwrap(
    'questions.listTopic',
    await pub
      .from('questions')
      .select('id, prompt, category, created_at, users(display_name)')
      .eq('status', 'verified')
      .is('list_id', null)
      .ilike('category', escapeLikePattern(topic))
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize)
  );
  return rows ?? [];
}

// An author's questions, newest first; never correct_index or explanation.
export async function listQuestionsByAuthor(
  accountId: string,
  f: { category?: string; status?: string; offset: number; limit: number }
): Promise<unknown[]> {
  let query = pub
    .from('questions')
    .select('id, category, prompt, options, status, created_at')
    .eq('created_by_user', accountId);
  if (f.category) query = query.eq('category', f.category);
  if (f.status) query = query.eq('status', f.status);
  const rows = unwrap(
    'questions.listByAuthor',
    await query.order('created_at', { ascending: false }).range(f.offset, f.offset + f.limit - 1)
  );
  return rows ?? [];
}

// One report per account and question.
export async function insertDispute(row: {
  question_id: string;
  reporter_user: string;
  reason: string;
}): Promise<'created' | 'duplicate'> {
  const res = await admin().from('question_disputes').insert(row);
  if (res.error?.code === UNIQUE_VIOLATION) return 'duplicate';
  unwrap('disputes.insert', res);
  return 'created';
}

// Unresolved disputes only: a moderator's resolution closes them, so a restored question
// starts again from zero instead of re-quarantining on its next report.
export async function countDisputes(questionId: string): Promise<number> {
  return countOf(
    'disputes.count',
    await admin()
      .from('question_disputes')
      .select('id', { count: 'exact', head: true })
      .eq('question_id', questionId)
      .is('resolved_at', null)
  );
}

export async function setDisputeState(questionId: string, disputeCount: number, quarantine: boolean): Promise<void> {
  unwrap(
    'questions.setDisputeState',
    await admin()
      .from('questions')
      .update({ dispute_count: disputeCount, ...(quarantine ? { status: 'quarantined' } : {}) })
      .eq('id', questionId)
  );
}

// A quarantined question as a moderator sees it: the answer key and the open disputes'
// reasons, never who reported. Secret key only.
export type QuarantinedQuestion = {
  id: string;
  category: string | null;
  prompt: string;
  options: unknown;
  correct_index: number;
  explanation: string | null;
  dispute_count: number;
  created_at: string;
  disputes: { id: string; reason: string; created_at: string }[];
};

export async function quarantinedQuestions(limit: number, offset: number): Promise<QuarantinedQuestion[]> {
  const rows: (Omit<QuarantinedQuestion, 'disputes'> & { question_disputes: QuarantinedQuestion['disputes'] | null })[] | null = unwrap(
    'questions.quarantined',
    await admin()
      .from('questions')
      .select('id, category, prompt, options, correct_index, explanation, dispute_count, created_at, question_disputes(id, reason, created_at)')
      .eq('status', 'quarantined')
      .is('question_disputes.resolved_at', null)
      .order('dispute_count', { ascending: false })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)
  );
  return (rows ?? []).map(({ question_disputes, ...question }) => ({ ...question, disputes: question_disputes ?? [] }));
}

// Restores (back to verified, count reset) or retires (rejected) a quarantined question and
// stamps its open disputes, in one database transaction. False when the question is not
// quarantined any more, so two moderators cannot both resolve it.
export async function resolveQuarantined(
  questionId: string,
  outcome: 'restored' | 'retired',
  moderatorId: string,
  note: string | null
): Promise<boolean> {
  const won = unwrap(
    'questions.resolve',
    await admin().rpc('resolve_quarantined_question', {
      p_question_id: questionId,
      p_outcome: outcome,
      p_moderator: moderatorId,
      p_note: note,
    })
  );
  return won === true;
}

// Every column, for the account's own backup; secret key only.
export async function questionsForExport(accountId: string, limit: number): Promise<unknown[]> {
  return unwrap('questions.export', await admin().from('questions').select('*').eq('created_by_user', accountId).limit(limit)) ?? [];
}

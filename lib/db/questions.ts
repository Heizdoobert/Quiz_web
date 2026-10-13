import 'server-only';
import { admin, pub } from './client';
import { countOf, unwrap, unwrapOne, UNIQUE_VIOLATION } from './errors';
import { TOPIC_EMBED, type TopicEmbed, getOrCreateTopicId, resolveTopicId, withCategory } from './topics';

// questions and question_disputes. Later tasks add to this file.

export type QuestionRow = {
  id: string;
  status: string;
  correct_index: number;
  explanation: string | null;
  created_by_user: string | null;
};

// The full row, including the answer key; secret key only.
export async function questionForAnswer(id: string): Promise<QuestionRow | null> {
  return unwrapOne('questions.forAnswer', await admin().from('questions').select('*').eq('id', id).single());
}

const PUBLIC_FIELDS = `id, prompt, options, created_by_user, status, ${TOPIC_EMBED}`;

export type PublicQuestionRow = {
  id: string;
  category: string;
  prompt: string;
  options: unknown;
  created_by_user: string | null;
  // The column's check constraint; matches ClientQuestion['status'].
  status: 'verified' | 'pending' | 'quarantined' | 'rejected' | null;
};

type PublicQuestionDbRow = Omit<PublicQuestionRow, 'category'> & { topics: TopicEmbed };

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
  const { category, ...rest } = row;
  const topic_id = await getOrCreateTopicId(category);
  unwrap('questions.insert', await admin().from('questions').insert({ ...rest, topic_id }));
}

// Public questions: verified. Unordered, up to `limit`.
export async function listPublicQuestions(opts: {
  excludeIds?: string[];
  category?: string;
  limit: number;
}): Promise<PublicQuestionRow[]> {
  let query = pub.from('questions').select(PUBLIC_FIELDS).eq('status', 'verified');
  if (opts.excludeIds?.length) query = query.not('id', 'in', `(${opts.excludeIds.join(',')})`);
  if (opts.category) {
    const topicId = await resolveTopicId(opts.category);
    if (!topicId) return [];
    query = query.eq('topic_id', topicId);
  }
  const rows = unwrap('questions.listPublic', await query.limit(opts.limit)) as PublicQuestionDbRow[] | null;
  return (rows ?? []).map(withCategory);
}

export async function publicQuestion(id: string): Promise<PublicQuestionRow | null> {
  const row = unwrapOne(
    'questions.public',
    await pub.from('questions').select(PUBLIC_FIELDS).eq('id', id).eq('status', 'verified').single()
  ) as PublicQuestionDbRow | null;
  return row ? withCategory(row) : null;
}

// The answer key and visibility only; secret key only.
export async function answerKey(id: string): Promise<{ correct_index: number; status: string } | null> {
  return unwrapOne(
    'questions.answerKey',
    await admin().from('questions').select('correct_index, status').eq('id', id).single()
  );
}

// One topic's public questions, newest first. Fetches pageSize + 1 rows so the caller can tell whether there is more.
export async function listTopicQuestions(topic: string, offset: number, pageSize: number): Promise<unknown[]> {
  const topicId = await resolveTopicId(topic);
  if (!topicId) return [];
  const rows = unwrap(
    'questions.listTopic',
    await pub
      .from('questions')
      .select(`id, prompt, created_at, users(display_name), ${TOPIC_EMBED}`)
      .eq('status', 'verified')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize)
  ) as Array<{ topics: TopicEmbed }> | null;
  return (rows ?? []).map(withCategory);
}

// An author's questions, newest first; never correct_index or explanation.
export async function listQuestionsByAuthor(
  accountId: string,
  f: { category?: string; status?: string; offset: number; limit: number }
): Promise<unknown[]> {
  let query = pub
    .from('questions')
    .select(`id, prompt, options, status, created_at, ${TOPIC_EMBED}`)
    .eq('created_by_user', accountId);
  if (f.category) {
    const topicId = await resolveTopicId(f.category);
    if (!topicId) return [];
    query = query.eq('topic_id', topicId);
  }
  if (f.status) query = query.eq('status', f.status);
  const rows = unwrap(
    'questions.listByAuthor',
    await query.order('created_at', { ascending: false }).range(f.offset, f.offset + f.limit - 1)
  ) as Array<{ topics: TopicEmbed }> | null;
  return (rows ?? []).map(withCategory);
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

// The count is kept by the database (a trigger on question_disputes); only the status changes here.
export async function quarantineQuestion(questionId: string): Promise<void> {
  unwrap('questions.quarantine', await admin().from('questions').update({ status: 'quarantined' }).eq('id', questionId));
}

// A quarantined question as a moderator sees it: the answer key and the open disputes'
// reasons, never who reported. Secret key only.
export type QuarantinedQuestion = {
  id: string;
  category: string;
  prompt: string;
  options: unknown;
  correct_index: number;
  explanation: string | null;
  dispute_count: number;
  created_at: string;
  disputes: { id: string; reason: string; created_at: string }[];
};

export async function quarantinedQuestions(limit: number, offset: number): Promise<QuarantinedQuestion[]> {
  const rows = unwrap(
    'questions.quarantined',
    await admin()
      .from('questions')
      .select(`id, prompt, options, correct_index, explanation, dispute_count, created_at, ${TOPIC_EMBED}, question_disputes(id, reason, created_at)`)
      .eq('status', 'quarantined')
      .is('question_disputes.resolved_at', null)
      .order('dispute_count', { ascending: false })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)
  ) as unknown as
    | (Omit<QuarantinedQuestion, 'disputes' | 'category'> & { topics: TopicEmbed; question_disputes: QuarantinedQuestion['disputes'] | null })[]
    | null;
  return (rows ?? []).map(({ question_disputes, ...question }) => ({ ...withCategory(question), disputes: question_disputes ?? [] }));
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

// The account's own backup, in the `Question` shape (category derived from the topic); secret key only.
export async function questionsForExport(accountId: string, limit: number): Promise<unknown[]> {
  const rows = unwrap(
    'questions.export',
    await admin()
      .from('questions')
      .select(`id, prompt, options, correct_index, explanation, created_by_user, status, dispute_count, verified_at, created_at, ${TOPIC_EMBED}`)
      .eq('created_by_user', accountId)
      .limit(limit)
  ) as unknown as { topics: TopicEmbed }[] | null;
  return (rows ?? []).map(withCategory);
}

import { answerKey, QuarantinedQuestion, quarantinedQuestions, resolveQuarantined } from '@/lib/db/questions';
import { MAX_NOTE_LENGTH } from '@/lib/constants/moderation';
import { logger } from '@/lib/logger';
import { ActionResult } from '@/lib/types';
import { isUuid } from '@/lib/utils/validation';
import { authorize } from '@/lib/services/auth/authorize';
import { SessionAccount } from '@/lib/services/auth/session';

// Not in lib/actions for the reason given in role-admin.ts: the account comes from the
// route, which verified the bearer token, never from a caller-controlled argument.

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const OUTCOMES = { restore: 'restored', retire: 'retired' } as const;
type Outcome = (typeof OUTCOMES)[keyof typeof OUTCOMES];

const invalid = (message: string) => ({ success: false, error: { code: 'VALIDATION_ERROR', message } }) as const;

// The queue, with the answer key; this is the only route that returns it for a question
// that is not live.
export async function listQuarantinedQuestions(
  params: { limit: number; offset: number },
  authAccount?: SessionAccount
): Promise<ActionResult<{ questions: QuarantinedQuestion[]; limit: number; offset: number }>> {
  const auth = await authorize('disputes.resolve', authAccount);
  if (!auth.success) return auth;

  const limit = Number.isInteger(params.limit) && params.limit >= 1 ? Math.min(params.limit, MAX_LIMIT) : DEFAULT_LIMIT;
  const offset = Number.isInteger(params.offset) && params.offset >= 0 ? params.offset : 0;
  try {
    return { success: true, data: { questions: await quarantinedQuestions(limit, offset), limit, offset } };
  } catch (err) {
    logger.error('moderation_queue_failed', err, { moderatorId: auth.data.account.id });
    return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load the moderation queue.' } };
  }
}

// restore: the question goes back to verified with its count reset. retire: it is rejected.
export async function resolveQuestionDispute(
  params: { questionId: unknown; outcome: unknown; note: unknown },
  authAccount?: SessionAccount
): Promise<ActionResult<{ questionId: string; outcome: Outcome }>> {
  // Before validating, so a caller without the permission learns nothing from the errors.
  const auth = await authorize('disputes.resolve', authAccount);
  if (!auth.success) return auth;
  const moderator = auth.data.account;

  const { outcome, note } = params;
  if (!isUuid(params.questionId)) return invalid('A valid question id is required.');
  if (outcome !== 'restore' && outcome !== 'retire') return invalid('The outcome must be restore or retire.');
  if (note != null && typeof note !== 'string') return invalid('The note must be text.');
  const cleanNote = note?.trim() || null;
  if (cleanNote && cleanNote.length > MAX_NOTE_LENGTH) return invalid(`The note must be at most ${MAX_NOTE_LENGTH} characters.`);

  const questionId = params.questionId.toLowerCase();
  const resolution = OUTCOMES[outcome];
  try {
    if (!(await resolveQuarantined(questionId, resolution, moderator.id, cleanNote))) {
      // Told apart only after the failed write, so the common path stays one round trip.
      if (!(await answerKey(questionId))) return { success: false, error: { code: 'NOT_FOUND', message: 'Question not found.' } };
      return { success: false, error: { code: 'CONFLICT', message: 'This question is not awaiting moderation.' } };
    }
    logger.info('dispute_resolved', { moderatorId: moderator.id, questionId, outcome: resolution });
    return { success: true, data: { questionId, outcome: resolution } };
  } catch (err) {
    logger.error('dispute_resolve_failed', err, { moderatorId: moderator.id, questionId });
    return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to resolve the dispute.' } };
  }
}

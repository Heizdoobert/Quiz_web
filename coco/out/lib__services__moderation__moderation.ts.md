# lib/services/moderation/moderation.ts
lines:70 exports:listQuarantinedQuestions,resolveQuestionDispute
---
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

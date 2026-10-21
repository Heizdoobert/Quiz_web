'use server';

import { countDisputes, insertDispute, quarantineQuestion } from '@/lib/db/questions';
import { hasRecordedAnswer } from '@/lib/db/results';
import { logger } from '@/lib/logger';
import { getSessionAccount, SessionAccount } from '@/lib/services/auth/session';
import { ActionResult } from '@/lib/types';
import { isUuid } from '@/lib/utils/validation';

const MAX_DISPUTE_REASON = 500;
const QUARANTINE_AT = 3;

export async function disputeQuestion(
  params: {
    questionId: string;
    reason: string;
  },
  authAccount?: SessionAccount
): Promise<ActionResult<{ quarantined: boolean }>> {
  try {
    const reason = params.reason?.trim() || '';
    if (!isUuid(params.questionId) || !reason) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Question and dispute reason are required.' } };
    }
    if (reason.length > MAX_DISPUTE_REASON) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: `Dispute reason must be at most ${MAX_DISPUTE_REASON} characters.` } };
    }
    const account = authAccount ?? (await getSessionAccount());
    if (!account) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sign in to report questions.' } };

    // Only players whose answer to this question was recorded may report it
    let answered: boolean;
    try {
      answered = await hasRecordedAnswer(account.id, params.questionId);
    } catch (err) {
      logger.error('dispute_question_answered_check_failed', err, { userId: account.id, questionId: params.questionId });
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to submit dispute.' } };
    }
    if (!answered) {
      logger.warn('dispute_question_rejected_unanswered', { userId: account.id, questionId: params.questionId });
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Answer this question before reporting it.' } };
    }

    let created: 'created' | 'duplicate';
    try {
      created = await insertDispute({ question_id: params.questionId, reporter_user: account.id, reason });
    } catch (err) {
      logger.error('dispute_question_db_insert_failed', err, { userId: account.id, questionId: params.questionId });
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to submit dispute.' } };
    }
    if (created === 'duplicate') {
      logger.warn('dispute_question_duplicate_report', { userId: account.id, questionId: params.questionId });
      return { success: false, error: { code: 'CONFLICT', message: 'You have already reported this question.' } };
    }

    let disputeCount: number;
    try {
      disputeCount = await countDisputes(params.questionId);
    } catch (err) {
      logger.error('dispute_question_count_check_failed', err, { questionId: params.questionId });
      return { success: true, data: { quarantined: false } };
    }

    const quarantined = disputeCount >= QUARANTINE_AT;
    let updated = true;
    if (quarantined) {
      try {
        await quarantineQuestion(params.questionId);
      } catch (err) {
        logger.error('dispute_question_update_failed', err, { questionId: params.questionId });
        updated = false;
      }
    }

    logger.info('question_disputed', { userId: account.id, questionId: params.questionId, quarantined });
    return { success: true, data: { quarantined: quarantined && updated } };
  } catch (err) {
    logger.error('dispute_question_unexpected_error', err, { questionId: params.questionId });
    return { success: false, error: { code: 'UNKNOWN_ERROR', message: 'Failed to submit dispute.' } };
  }
}

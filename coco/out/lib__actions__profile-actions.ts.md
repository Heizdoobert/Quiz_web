# lib/actions/profile-actions.ts
lines:142 exports:getUserQuizzes,exportUserData,QuestionAnalytics,getQuestionAnalytics,DeleteMyAccountResult,deleteMyAccount
---
'use server';
import { logger } from "@/lib/logger";

import { questionsForExport } from '../db/questions';
import { resultsForExport } from '../db/results';
import { questionAnalytics } from '../db/rpc';
import { getSessionAccount, clearSessionAccount, type SessionAccount } from '../services/session';
import { deleteAccount, type DeleteAccountResult } from '../services/account-deletion';
import { quizzesForAccount } from '../services/user-quizzes';
import {
  Question,
  QuizResult,
  GetUserQuizzesFilter,
  GetUserQuizzesResult,
  ExportUserDataResult,
  UserBackupData,
} from '../types';

const MAX_EXPORT_QUIZZES = 1000;
const MAX_EXPORT_STATS = 5000;
const BACKUP_SCHEMA_VERSION = '1.0';

export async function getUserQuizzes(
  options?: GetUserQuizzesFilter,
  authAccount?: SessionAccount
): Promise<GetUserQuizzesResult> {
  const account = authAccount ?? (await getSessionAccount());
  if (!account) {
    return {
      success: false,
      error: 'Sign in to see your quizzes.',
      code: 'UNAUTHORIZED',
    };
  }
  return quizzesForAccount(account.id, options);
}

export async function exportUserData(authAccount?: SessionAccount): Promise<ExportUserDataResult> {
  try {
    // The backup holds correct answers and every recorded answer, which the public key

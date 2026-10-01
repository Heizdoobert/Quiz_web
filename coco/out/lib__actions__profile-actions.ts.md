# lib/actions/profile-actions.ts
lines:154 exports:getUserQuizzes,exportUserData
---
'use server';

import { supabase } from '../supabase';
import { supabaseAdmin } from '../supabase-admin';
import { getSessionAccount } from '../session';
import {
  Question,
  ClientQuestion,
  QuizResult,
  GetUserQuizzesFilter,
  GetUserQuizzesResult,
  ExportUserDataResult,
  UserBackupData,
} from '../types';

// Validates that input looks like an Ethereum address (0x + 40 hex chars).
// This is format validation only — it does NOT prove the caller owns this address.
// See SECURITY-TRADE-OFFS.md for the full threat model.
function isValidEthAddress(address: string): boolean {
  return typeof address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(address);
}

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 500;
const MAX_EXPORT_QUIZZES = 1000;
const MAX_EXPORT_STATS = 5000;
const BACKUP_SCHEMA_VERSION = '1.0';

export async function getUserQuizzes(
  walletAddress: string,
  options?: GetUserQuizzesFilter
): Promise<GetUserQuizzesResult> {
  try {
    if (!walletAddress || !isValidEthAddress(walletAddress)) {
      return {
        success: false,
        error: 'A valid wallet address is required.',
        code: 'INVALID_ADDRESS',
      };
    }
